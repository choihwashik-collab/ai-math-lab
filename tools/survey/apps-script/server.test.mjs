import fs from 'node:fs';
import vm from 'node:vm';
import { randomUUID, createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { test } from 'node:test';

class Sheet {
  rows = [['code','roomJson','participantId','responseJson']];
  getDataRange() { return { getValues: () => this.rows.map(row => [...row]) }; }
  appendRow(row) { this.rows.push([...row]); return this; }
  deleteRow(row) { this.rows.splice(row - 1, 1); }
  getRange(row, col) {
    return {
      setValue: value => { this.rows[row-1][col-1] = value; },
      setValues: values => { values.forEach((r,i) => r.forEach((v,j) => this.rows[row-1+i][col-1+j] = v)); }
    };
  }
}
function server() {
  const rooms = new Sheet(), responses = new Sheet();
  const props = new Map([['SURVEY_SHEET_ID','test'],['CREATOR_PIN','private-test-pin']]);
  let held = false;
  const cache = new Map();
  const context = vm.createContext({
    console, Date, Math, Set, JSON,
    Utilities: { getUuid: randomUUID, DigestAlgorithm: { SHA_256: 'sha256' }, computeDigest: (algorithm,value) => [...createHash(algorithm).update(value).digest()] },
    CacheService: { getScriptCache: () => ({ get:k=>cache.get(k),put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props.get(k) }) },
    SpreadsheetApp: { openById: () => ({ getSheetByName: n => n === 'Rooms' ? rooms : responses }) },
    LockService: { getScriptLock: () => ({
      tryLock: () => { if (held) return false; held = true; return true; },
      hasLock: () => held, releaseLock: () => { held = false; }
    }) }
  });
  vm.runInContext(fs.readFileSync(new URL('./Code.gs', import.meta.url),'utf8'),context);
  const call = (action,data={}) => JSON.parse(JSON.stringify(context.surveyApi({action,...data})));
  const create = () => call('create',{pin:'private-test-pin',title:'연수 테스트',questions:[
    {type:'choice',text:'이해했나요?',options:['예','아니오']},{type:'text',text:'의견'}
  ]}).data;
  return {call,create,rooms,responses,context};
}

test('another device can join; responses require teacher permission; identical names are independent',()=>{
  const s=server(), created=s.create(), code=created.room.code;
  const joined=s.call('join',{code}); assert.equal(joined.ok,true);
  assert.equal(joined.data.room.title,'연수 테스트');assert.equal('ownerToken' in joined.data.room,false);
  assert.equal('responses' in joined.data,false);
  const answers=Object.fromEntries(created.room.questions.map(q=>[q.id,q.type==='choice'?'예':'<img onerror=alert(1)>']));
  const a=randomUUID()+randomUUID(),b=randomUUID()+randomUUID();
  for(const participantId of [a,b])assert.equal(s.call('submit',{code,participantId,name:'같은 별명',answers,revision:1}).ok,true);
  assert.equal(s.call('results',{code}).ok,false);
  assert.equal(s.call('delete',{code,ownerToken:'wrong'}).ok,false);
  assert.equal(s.call('results',{code,ownerToken:created.ownerToken}).data.responses.length,2);
  assert.equal(s.call('submit',{code,participantId:a,name:'수정',answers,revision:1}).ok,true);
  assert.equal(s.call('results',{code,ownerToken:created.ownerToken}).data.responses.length,2);
});

test('question additions invalidate stale submissions; close rejects writes; expiration removes data',()=>{
  const s=server(), created=s.create(), code=created.room.code,ownerToken=created.ownerToken;
  const changed=s.call('addQuestion',{code,ownerToken,text:'추가 질문'});
  assert.equal(changed.data.room.revision,2);
  assert.equal(s.call('submit',{code,participantId:randomUUID()+randomUUID(),name:'학생',answers:{},revision:1}).ok,false);
  assert.equal(s.call('close',{code,ownerToken}).ok,true);
  assert.equal(s.call('submit',{code,participantId:randomUUID()+randomUUID(),name:'학생',answers:{},revision:2}).ok,false);
  const room=JSON.parse(s.rooms.rows[1][1]);room.expiresAt=Date.now()-1;s.rooms.rows[1][1]=JSON.stringify(room);
  assert.equal(s.call('join',{code}).ok,false);assert.equal(s.rooms.rows.length,1);
});

test('creation needs secret; invalid choices rejected; cleanup deletes only expired room data',()=>{
  const s=server();assert.equal(s.call('create',{pin:'wrong'}).ok,false);
  assert.equal(s.call('create',{pin:'private-test-pin',title:'x',questions:[{type:'choice',text:'x',options:['one']}]}).ok,false);
  const first=s.create(),second=s.create();
  const room=JSON.parse(s.rooms.rows[1][1]);room.expiresAt=Date.now()-1;s.rooms.rows[1][1]=JSON.stringify(room);
  s.responses.appendRow([first.room.code,'','x','{}']);s.responses.appendRow([second.room.code,'','y','{}']);
  s.context.cleanupExpiredRooms_();
  assert.equal(s.rooms.rows.length,2);assert.equal(s.responses.rows.length,2);
  assert.equal(s.responses.rows[1][0],second.room.code);
});

test('participant answers are validated; manual deletion removes room and responses',()=>{
  const s=server(),created=s.create(),code=created.room.code,ownerToken=created.ownerToken;
  const participantId=randomUUID()+randomUUID();
  assert.equal(s.call('submit',{code,participantId,name:'학생',answers:{},revision:1}).ok,false);
  const answers=Object.fromEntries(created.room.questions.map(q=>[q.id,q.type==='choice'?'예':'의견']));
  assert.equal(s.call('submit',{code,participantId,name:'학생',answers,revision:1}).ok,true);
  assert.equal(s.call('delete',{code,ownerToken}).ok,true);
  assert.equal(s.rooms.rows.length,1);assert.equal(s.responses.rows.length,1);
});

test('legacy migration keeps the original room code and rejects collisions',()=>{
  const s=server();
  const args={pin:'private-test-pin',title:'이전 설문',preferredCode:'670874',questions:[{type:'text',text:'의견'}]};
  const created=s.call('create',args);assert.equal(created.ok,true);assert.equal(created.data.room.code,'670874');
  assert.equal(s.call('join',{code:'670874'}).data.room.title,'이전 설문');
  assert.equal(s.call('create',args).ok,false);
});

test('each survey has its own password; plaintext and hashes are not public; failed logins are limited',()=>{
  const s=server(),args={title:'관리 비밀번호',questions:[{type:'text',text:'의견'}]};
  assert.equal(s.call('create',{...args,pin:'12'}).ok,false);
  const a=s.call('create',{...args,pin:'2468'}).data,b=s.call('create',{...args,pin:'1357'}).data;
  assert.equal(s.call('unlock',{code:a.room.code,pin:'2468'}).ok,true);
  assert.equal(s.call('unlock',{code:b.room.code,pin:'2468'}).ok,false);
  const joined=s.call('join',{code:a.room.code}).data.room;
  assert.equal('passwordHash' in joined,false);assert.equal('passwordSalt' in joined,false);
  assert.equal(s.rooms.rows[1][1].includes('2468'),false);
  for(let i=0;i<5;i++)s.call('unlock',{code:a.room.code,pin:'wrong'});
  assert.match(s.call('unlock',{code:a.room.code,pin:'2468'}).error,/1분/);
});
