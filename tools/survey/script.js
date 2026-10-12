(() => {
  'use strict';
  const $ = s => document.querySelector(s), views = ['home','builder','teacher','student'];
  const hosted = !!window.google?.script?.run, config = window.SURVEY_CONFIG || {};
  const uid = () => crypto.randomUUID();
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const memory = new Map();
  const read = k => { try { return localStorage.getItem(k) || memory.get(k); } catch { return memory.get(k); } };
  const store = (k,v) => { memory.set(k,v); try { localStorage.setItem(k,v); } catch {} };
  let room, ownerToken = '', studentName = '', participantId = '', responses = [], timer, view = 'home', polling = false, migrationCode = '';
  const notice = text => {
    $('#connection-status').textContent = text;
    $('#join-error').textContent = view === 'home' ? text : '';
  };
  function show(next) { view = next; views.forEach(v => $(`#${v}-view`).hidden = v !== view); clearTimeout(timer); schedule(); }
  function rpc(action, data = {}) {
    return new Promise((resolve,reject) => {
      if (!hosted) return reject(new Error('설문 서버가 아직 연결되지 않았습니다.'));
      const timeout = setTimeout(() => reject(new Error('서버 응답이 늦어지고 있습니다. 잠시 후 다시 시도해 주세요.')),30000);
      const succeed = result => { clearTimeout(timeout); result?.ok ? resolve(result.data) : reject(new Error(result?.error || '서버 응답 오류입니다.')); };
      google.script.run.withSuccessHandler(succeed)
        .withFailureHandler(() => {clearTimeout(timeout);reject(new Error('서버 연결에 실패했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.'));})
        .surveyApi({ action, ...data });
    });
  }
  const request = (action,data) => rpc(action,{code:room.code,ownerToken,...data});
  function action(selector, fn) {
    const button = $(selector);
    button.addEventListener('click',async () => {
      if (button.disabled) return; button.disabled = true; const label = button.textContent; button.textContent = '처리 중…'; notice('처리 중…');
      try { await fn(); notice(''); } catch(e) { notice(e.message); }
      finally { button.textContent = label; button.disabled = false; if (room?.status === 'closed') $('#end-room').disabled = $('#add-live').disabled = true; }
    });
  }
  function question(type='choice',text='') { return {id:uid(),type,text,options:type==='choice'?['매우 그렇다','그렇다','아니다']:[]}; }
  function renderBuilder() {
    const box=$('#question-list'); box.innerHTML='';
    room.questions.forEach((q,i) => {
      const el=document.createElement('div'); el.className='question-card';
      el.innerHTML=`<span class="type">${q.type==='choice'?'객관식':'단답형'} · QUESTION ${i+1}</span><button class="remove" type="button">삭제</button><input class="qtext" maxlength="500" value="${esc(q.text)}" placeholder="질문을 입력하세요">${q.type==='choice'?`<div class="options">${q.options.map((o,j)=>`<input data-option="${j}" maxlength="200" value="${esc(o)}" placeholder="선택지 ${j+1}">`).join('')}</div>`:''}`;
      el.querySelector('.remove').onclick=()=>{room.questions.splice(i,1);renderBuilder();};
      el.querySelector('.qtext').oninput=e=>q.text=e.target.value;
      el.querySelectorAll('[data-option]').forEach(x=>x.oninput=e=>q.options[Number(e.target.dataset.option)]=e.target.value);
      box.append(el);
    });
  }
  function link(management=false) {
    const url=new URL(config.appUrl); url.search='';url.hash='';
    url.searchParams.set('room',room.code);url.searchParams.set('mode',management?'teacher':'student');
    if(management)url.hash=new URLSearchParams({token:ownerToken}).toString();
    return url.href;
  }
  async function copy(text) { try {await navigator.clipboard.writeText(text);} catch {window.prompt('아래 링크를 복사해 주세요.',text);} }
  function renderTeacher() {
    $('#teacher-title').textContent=room.title;$('#room-code').textContent=room.code;
    $('#participant-link').href=link();$('#qrcode').innerHTML='';
    try {if(!window.QRCode)throw new Error('QR 생성기를 불러오지 못했습니다. 참여 링크를 공유해 주세요.');
      new QRCode($('#qrcode'),{text:link(),width:180,height:180,colorDark:'#172139',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
    }catch(e){$('#qrcode').textContent=e.message;}
    renderResults();
  }
  function renderResults() {
    $('#response-count').textContent=responses.length;$('#room-status').textContent=room.status==='open'?'응답 받는 중':'설문 종료';
    $('#end-room').disabled=$('#add-live').disabled=room.status!=='open';
    $('#delete-notice').textContent=room.expiresAt?`${new Date(room.expiresAt).toLocaleString('ko-KR')}부터 입장·조회가 차단되며 저장된 응답은 1시간 이내 정리됩니다.`:'종료 후 24시간까지 결과를 조회할 수 있습니다. 교사용 관리 링크는 참여자에게 공유하지 마세요.';
    const box=$('#results-list');box.innerHTML='';
    room.questions.forEach((q,i)=>{
      const vals=responses.map(r=>r.answers[q.id]).filter(Boolean),el=document.createElement('article');el.className='result-card';
      const counts=q.options.map(o=>[o,vals.filter(v=>v===o).length]),max=Math.max(1,...counts.map(x=>x[1]));
      const body=q.type==='choice'?counts.map(([o,c])=>`<div class="bar"><span>${esc(o)}</span><div class="track"><div class="fill" style="width:${c/max*100}%"></div></div><b>${c}</b></div>`).join(''):`<div class="text-answers">${vals.length?vals.map(v=>`<span>${esc(v)}</span>`).join(''):'<span>아직 답변이 없습니다.</span>'}</div>`;
      el.innerHTML=`<h3>${i+1}. ${esc(q.text)} <small>(${vals.length}명)</small></h3>${body}`;box.append(el);
    });
  }
  const drafts=()=>Object.fromEntries(new FormData($('#response-form')).entries());
  function renderStudent(previous={}) {
    $('#student-title').textContent=room.title;$('#student-room-code').textContent=`ROOM ${room.code}`;
    const box=$('#student-questions');box.innerHTML='';
    room.questions.forEach((q,i)=>{
      const old=previous[q.id]||'',el=document.createElement('div');el.className='student-question';
      el.innerHTML=`<h3>${i+1}. ${esc(q.text)}</h3>${q.type==='choice'?q.options.map(o=>`<label class="choice-label"><input type="radio" name="${q.id}" value="${esc(o)}" ${old===o?'checked':''} required><span>${esc(o)}</span></label>`).join(''):`<input name="${q.id}" maxlength="1000" value="${esc(old)}" placeholder="답변을 입력하세요" required>`}`;box.append(el);
    });
    $('#response-form').hidden=false;$('#submitted').hidden=true;$('#response-form button').disabled=room.status!=='open';
  }
  function schedule() {clearTimeout(timer);if(room?.status==='open'&&['teacher','student'].includes(view))timer=setTimeout(poll,view==='teacher'?7000:15000);}
  async function poll() {
    if(polling||!room||!['teacher','student'].includes(view))return;
    if(document.hidden){schedule();return;}polling=true;const oldView=view,code=room.code;
    try {
      const data=await request(view==='teacher'?'results':'refresh');if(view!==oldView||room?.code!==code)return;
      const changed=data.room.revision!==room.revision;room=data.room;
      if(view==='teacher'){responses=data.responses;renderResults();}
      else if(changed){renderStudent(drafts());notice('새 질문이 추가되었습니다. 기존 답변은 유지했습니다.');}
      if(room.status==='closed'&&view==='student'){$('#response-form button').disabled=true;notice('설문이 종료되었습니다.');}
    }catch(e){notice(e.message);}finally{polling=false;if(view===oldView&&room?.code===code)schedule();}
  }
  action('#open-builder',async()=>{if(!hosted)throw new Error('설문 서버가 아직 연결되지 않았습니다.');ownerToken='';responses=[];room={questions:[question('choice','오늘 연수 내용을 이해했나요?'),question('text','가장 기억에 남는 내용을 한 문장으로 적어 보세요.')]};renderBuilder();show('builder');});
  document.querySelectorAll('[data-home]').forEach(b=>b.onclick=()=>show('home'));
  for(const [selector,type] of [['#add-choice','choice'],['#add-text','text']])action(selector,async()=>{if(room.questions.length>=30)throw new Error('질문은 최대 30개입니다.');room.questions.push(question(type));renderBuilder();});
  action('#create-room',async()=>{
    const title=$('#survey-title').value.trim();if(!title||!room.questions.length||room.questions.some(q=>!q.text.trim()))throw new Error('제목과 모든 질문을 작성해 주세요.');
    const data=await rpc('create',{title,questions:room.questions,pin:$('#creator-pin').value,preferredCode:migrationCode});room=data.room;ownerToken=data.ownerToken;responses=[];migrationCode='';
    store(`survey-owner-${room.code}`,ownerToken);$('#creator-pin').value='';renderTeacher();show('teacher');
  });
  action('#join-room',async()=>{
    const code=$('#join-code').value.trim(),name=$('#join-name').value.trim();
    if(!/^\d{6}$/.test(code))throw new Error('6자리 방 번호를 입력해 주세요.');if(!name)throw new Error('이름 또는 별명을 입력해 주세요.');
    const data=await rpc('join',{code});if(data.room.status!=='open')throw new Error('종료된 설문입니다.');
    room=data.room;studentName=name;participantId=read(`survey-participant-${code}`)||uid()+uid();store(`survey-participant-${code}`,participantId);renderStudent();show('student');
  });
  $('#response-form').onsubmit=async e=>{
    e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;notice('답변을 제출하는 중…');
    try{await request('submit',{participantId,name:studentName,answers:drafts(),revision:room.revision});$('#response-form').hidden=true;$('#submitted').hidden=false;notice('');}
    catch(error){notice(error.message);await poll();}finally{button.disabled=room?.status!=='open';}
  };
  action('#answer-again',async()=>{const answers=drafts(),data=await request('refresh');room=data.room;if(room.status!=='open')throw new Error('종료된 설문입니다.');renderStudent(answers);});
  action('#copy-link',()=>copy(link()));action('#copy-management',()=>copy(link(true)));
  action('#end-room',async()=>{const data=await request('close');room=data.room;renderResults();clearTimeout(timer);});
  action('#delete-room',async()=>{if(!confirm('이 설문방과 모든 응답을 삭제할까요? 복구할 수 없습니다.'))return;await request('delete');room=null;ownerToken='';responses=[];show('home');});
  action('#add-live',async()=>{const text=$('#live-question').value.trim();if(!text)throw new Error('추가할 질문을 입력해 주세요.');const data=await request('addQuestion',{text});room=data.room;$('#live-question').value='';renderResults();});
  async function initialize() {
    if(!hosted){
      if(/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(config.appUrl||'')){
        const legacy=[];
        try {for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key.startsWith('aimath-survey-room-'))continue;try {const r=JSON.parse(localStorage.getItem(key));if(r&&/^\d{6}$/.test(String(r.code))&&Array.isArray(r.questions)&&r.questions.length)legacy.push(r);}catch{}}}catch{}
        const dest=new URL(config.appUrl);dest.search=location.search;dest.hash=location.hash;
        if(legacy.length){
          show('home');const box=$('#home-view');box.replaceChildren();
          const article=document.createElement('article');article.className='entry';
          const heading=document.createElement('h2');heading.textContent='이전에 만든 설문 옮기기';article.append(heading);
          const explanation=document.createElement('p');explanation.textContent='이 브라우저에만 저장된 설문입니다. 제목과 질문을 Google 서버로 옮겨 기존 방 번호를 사용할 수 있습니다. 이전 응답은 이 브라우저에 남습니다.';article.append(explanation);
          for(const old of legacy){const b=document.createElement('button');b.textContent=`${old.code} · ${old.title} 옮기기`;b.onclick=()=>{const payload=JSON.stringify({code:String(old.code),title:old.title,questions:old.questions});if(payload.length>20000){notice('설문이 너무 깁니다. 새 서버에서 질문을 다시 작성해 주세요.');return;}const url=new URL(config.appUrl);url.hash='import='+encodeURIComponent(payload);location.assign(url.href);};article.append(b);}
          const next=document.createElement('a');next.href=dest.href;next.textContent='새 설문 서버로 바로 이동 →';next.style.display='block';next.style.marginTop='20px';article.append(next);box.append(article);notice('방을 만든 브라우저에서 설문을 선택한 뒤 설문 만들기 암호를 입력해 주세요.');return;
        }
        location.replace(dest.href);return;
      }
      $('#open-builder').disabled=$('#join-room').disabled=true;notice('설문 서버 연결을 준비 중입니다. 기존 브라우저에만 저장된 설문방은 휴대폰에서 입장할 수 없습니다.');show('home');return;
    }
    const initial=await new Promise(resolve=>google.script.url.getLocation(resolve));
    const imported=new URLSearchParams(initial.hash).get('import');
    if(imported){const legacy=JSON.parse(imported);if(!/^\d{6}$/.test(String(legacy.code))||!Array.isArray(legacy.questions))throw new Error('설문 가져오기 정보를 확인해 주세요.');migrationCode=String(legacy.code);room={questions:legacy.questions.map(q=>question(q.type,q.text))};room.questions.forEach((q,i)=>q.options=legacy.questions[i].options||[]);$('#survey-title').value=legacy.title||'이전 설문';renderBuilder();show('builder');notice(`${migrationCode}번 설문을 서버에 옮기려면 설문 만들기 암호를 입력하고 방 만들기를 누르세요.`);return;}
    const code=config.initialRoom||initial.parameter.room,mode=config.initialMode||initial.parameter.mode;show('home');if(!code)return;
    $('#join-code').value=code;
    if(mode==='teacher'){ownerToken=new URLSearchParams(initial.hash).get('token')||read(`survey-owner-${code}`)||'';const data=await rpc('results',{code,ownerToken});room=data.room;responses=data.responses;store(`survey-owner-${code}`,ownerToken);renderTeacher();show('teacher');}
    else {const data=await rpc('join',{code});if(data.room.status!=='open')throw new Error('종료된 설문입니다.');notice(`${data.room.title} — 이름 또는 별명을 입력하면 참여할 수 있습니다.`);$('#join-name').focus();}
  }
  initialize().catch(e=>notice(e.message));
})();
