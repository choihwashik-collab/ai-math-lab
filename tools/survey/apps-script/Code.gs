// Deploy this in a NEW survey-only Apps Script project.
const DAY_ = 86400000;
const HEADERS_ = ['code', 'roomJson', 'participantId', 'responseJson'];

// Editor entry point. Anonymous web visitors cannot initialize or read secrets.
function setupSurveyBackend() {
  const active = Session.getActiveUser().getEmail();
  if (!active || active !== Session.getEffectiveUser().getEmail()) {
    throw new Error('프로젝트 소유자만 초기화할 수 있습니다.');
  }
  setupSurveyBackend_();
}

function setupSurveyBackend_() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SURVEY_SHEET_ID')) {
    const book = SpreadsheetApp.create('AI MATH LAB 연수 설문 응답');
    book.getSheets()[0].setName('Rooms').appendRow(HEADERS_);
    book.insertSheet('Responses').appendRow(HEADERS_);
    props.setProperty('SURVEY_SHEET_ID', book.getId());
  }
  if (!props.getProperty('CREATOR_PIN')) {
    props.setProperty('CREATOR_PIN', Utilities.getUuid().replace(/-/g, '').slice(0, 16));
  }
  if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'cleanupExpiredRooms_')) {
    ScriptApp.newTrigger('cleanupExpiredRooms_').timeBased().everyHours(1).create();
  }
  console.log('설문 만들기 암호: ' + props.getProperty('CREATOR_PIN'));
  console.log('응답 시트: https://docs.google.com/spreadsheets/d/' + props.getProperty('SURVEY_SHEET_ID'));
}

function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  template.appUrl = ScriptApp.getService().getUrl();
  template.initialRoom = (e && e.parameter && e.parameter.room) || '';
  template.initialMode = (e && e.parameter && e.parameter.mode) || '';
  return template.evaluate().setTitle('연수 설문 | AI MATH LAB')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function surveyApi(request) {
  // This is the ONLY public RPC. Never return script properties or owner tokens.
  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(15000)) throw new Error('접속이 몰리고 있습니다. 잠시 후 다시 시도해 주세요.');
    return { ok: true, data: dispatch_(request || {}) };
  } catch (error) {
    return { ok: false, error: error.message || '설문 처리에 실패했습니다.' };
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function sheets_() {
  const id = PropertiesService.getScriptProperties().getProperty('SURVEY_SHEET_ID');
  if (!id) throw new Error('설문 서버 초기화가 필요합니다. 운영자에게 문의해 주세요.');
  const book = SpreadsheetApp.openById(id);
  return { rooms: book.getSheetByName('Rooms'), responses: book.getSheetByName('Responses') };
}
function text_(value, max, label) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new Error(label + '을(를) 확인해 주세요.');
  }
  return value.trim();
}
function questions_(questions) {
  if (!Array.isArray(questions) || !questions.length || questions.length > 30) {
    throw new Error('질문은 1~30개까지 작성할 수 있습니다.');
  }
  return questions.map(q => {
    if (!q || !['choice', 'text'].includes(q.type)) throw new Error('잘못된 질문 유형입니다.');
    const options = q.type === 'choice' ? (q.options || []).map(o => text_(o, 200, '선택지')) : [];
    if (q.type === 'choice' && (options.length < 2 || options.length > 10 || new Set(options).size !== options.length)) {
      throw new Error('객관식은 서로 다른 선택지를 2~10개 작성해 주세요.');
    }
    return { id: Utilities.getUuid(), type: q.type, text: text_(q.text, 500, '질문'), options };
  });
}
function findRoom_(sheet, code) {
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === code) return { row: i + 1, room: JSON.parse(rows[i][1]) };
  }
  return null;
}
function publicRoom_(r) {
  return { code: r.code, title: r.title, questions: r.questions, status: r.status,
    createdAt: r.createdAt, expiresAt: r.expiresAt, revision: r.revision };
}
function owner_(r, token) {
  if (typeof token !== 'string' || !token || token !== r.ownerToken) {
    throw new Error('교사용 관리 권한이 없습니다. 방을 만든 화면 또는 관리 링크를 사용해 주세요.');
  }
}
function responseRows_(sheet, code) {
  return sheet.getDataRange().getValues().map((values, i) => ({ values, row: i + 1 }))
    .filter(x => x.row > 1 && String(x.values[0]) === code);
}
function removeRoom_(s, found) {
  responseRows_(s.responses, found.room.code).reverse().forEach(x => s.responses.deleteRow(x.row));
  s.rooms.deleteRow(found.row);
}
function dispatch_(req) {
  const s = sheets_();
  if (req.action === 'create') {
    const pin = PropertiesService.getScriptProperties().getProperty('CREATOR_PIN');
    if (!pin || req.pin !== pin) throw new Error('설문 만들기 암호가 맞지 않습니다.');
    const title = text_(req.title, 150, '설문 제목');
    const questions = questions_(req.questions);
    if (JSON.stringify(questions).length > 40000) throw new Error('설문 내용이 너무 깁니다. 질문과 선택지를 줄여 주세요.');
    const existing = new Set(s.rooms.getDataRange().getValues().slice(1).map(r => String(r[0])));
    let code;
    do { code = String(Math.floor(100000 + Math.random() * 900000)); } while (existing.has(code));
    const room = { code, title, questions, ownerToken: Utilities.getUuid() + Utilities.getUuid(),
      status: 'open', createdAt: Date.now(), expiresAt: null, revision: 1 };
    s.rooms.appendRow([code, JSON.stringify(room), '', '']);
    return { room: publicRoom_(room), ownerToken: room.ownerToken, responses: [] };
  }
  const code = String(req.code || '');
  if (!/^\d{6}$/.test(code)) throw new Error('6자리 방 번호를 확인해 주세요.');
  const found = findRoom_(s.rooms, code);
  if (!found) throw new Error('설문방을 찾을 수 없습니다. 방 번호 또는 QR을 확인해 주세요.');
  const r = found.room;
  if (r.expiresAt && Date.now() >= r.expiresAt) {
    removeRoom_(s, found);
    throw new Error('보관 기간이 지나 삭제된 설문입니다.');
  }
  if (req.action === 'join' || req.action === 'refresh') {
    return { room: publicRoom_(r) };
  }
  if (req.action === 'submit') {
    if (r.status !== 'open') throw new Error('종료된 설문입니다.');
    if (req.revision !== r.revision) throw new Error('새 질문이 추가됐습니다. 질문을 새로 확인한 뒤 제출해 주세요.');
    const participantId = text_(req.participantId, 100, '참여자 식별값');
    if (!/^[a-zA-Z0-9-]{32,100}$/.test(participantId)) throw new Error('잘못된 참여자 식별값입니다.');
    const name = text_(req.name, 20, '이름 또는 별명');
    const answers = {};
    r.questions.forEach(q => {
      const answer = text_((req.answers || {})[q.id], 1000, '답변');
      if (q.type === 'choice' && !q.options.includes(answer)) throw new Error('선택지를 확인해 주세요.');
      answers[q.id] = answer;
    });
    const rows = responseRows_(s.responses, code);
    const prior = rows.find(x => String(x.values[2]) === participantId);
    if (!prior && rows.length >= 500) throw new Error('이 방의 최대 응답 인원(500명)에 도달했습니다.');
    const response = { name, answers, submittedAt: Date.now() };
    if (JSON.stringify(response).length > 45000) throw new Error('답변 내용이 너무 깁니다. 내용을 줄여 주세요.');
    const values = [code, '', participantId, JSON.stringify(response)];
    if (prior) s.responses.getRange(prior.row, 1, 1, 4).setValues([values]);
    else s.responses.appendRow(values);
    return { submitted: true };
  }
  owner_(r, req.ownerToken);
  if (req.action === 'results') {
    return { room: publicRoom_(r), responses: responseRows_(s.responses, code).map(x => JSON.parse(x.values[3])) };
  }
  if (req.action === 'delete') { removeRoom_(s, found); return { deleted: true }; }
  if (req.action === 'close') {
    if (r.status === 'open') { r.status = 'closed'; r.expiresAt = Date.now() + DAY_; }
  } else if (req.action === 'addQuestion') {
    if (r.status !== 'open') throw new Error('종료된 설문에는 질문을 추가할 수 없습니다.');
    if (r.questions.length >= 30) throw new Error('질문은 최대 30개입니다.');
    r.questions.push(questions_([{ type: 'text', text: req.text }])[0]);
    r.revision++;
  } else { throw new Error('지원하지 않는 요청입니다.'); }
  s.rooms.getRange(found.row, 2).setValue(JSON.stringify(r));
  return { room: publicRoom_(r) };
}

function cleanupExpiredRooms_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return;
  try {
    const s = sheets_();
    const rows = s.rooms.getDataRange().getValues();
    for (let i = rows.length - 1; i >= 1; i--) {
      const room = JSON.parse(rows[i][1]);
      if (room.expiresAt && Date.now() >= room.expiresAt) removeRoom_(s, { row: i + 1, room });
    }
  } finally { lock.releaseLock(); }
}
