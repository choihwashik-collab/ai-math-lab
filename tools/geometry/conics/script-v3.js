(() => {
  const oldPlay = document.querySelector('.canvas-card #play-locus');
  if (oldPlay) oldPlay.remove();

  document.querySelector('.curve-picker').insertAdjacentHTML('afterend', `
    <div class="locus-controls-v3">
      <label>점 P 이동
        <input id="point-position-v3" type="range" min="0" max="1000" value="620" aria-label="곡선 위 점 P의 위치">
      </label>
      <label>자취 속도
        <select id="trace-speed-v3" aria-label="자취 그리기 속도">
          <option value="16000">느리게</option>
          <option value="9000" selected>보통</option>
          <option value="4500">빠르게</option>
        </select>
      </label>
      <button id="trace-locus-v3" type="button">▶ 자취 그리기</button>
      <button id="reset-locus-v3" type="button">자취 지우기</button>
    </div>`);

  const canvasEl = document.querySelector('#locus-canvas');
  const context = canvasEl.getContext('2d');
  const W = canvasEl.width, H = canvasEl.height, OX = 340, OY = 200, SCALE = 38;
  const palette = { ink:'#18243d', muted:'#68798a', grid:'#dce8e7', teal:'#08a998', violet:'#745fc5', orange:'#dc7d3f', pale:'#eef9f7' };
  const models = {
    parabola:{ p:1, min:-2.45, max:2.45 },
    ellipse:{ a:5, b:3.4 },
    hyperbola:{ a:2.5, b:2.1, min:-1.5, max:1.5 }
  };
  let revealed = 0, animating = false, frameId = 0, dragging = false;

  const sx = x => OX + x*SCALE;
  const sy = y => OY - y*SCALE;
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  function segment(a,b,color=palette.orange,width=2,dash=[]){context.save();context.strokeStyle=color;context.lineWidth=width;context.setLineDash(dash);context.beginPath();context.moveTo(sx(a.x),sy(a.y));context.lineTo(sx(b.x),sy(b.y));context.stroke();context.restore()}
  function marker(p,label,color=palette.teal){context.fillStyle=color;context.beginPath();context.arc(sx(p.x),sy(p.y),6,0,Math.PI*2);context.fill();context.fillStyle=palette.ink;context.font='500 14px Nanum Gothic';context.fillText(label,sx(p.x)+10,sy(p.y)-9)}
  function labelBetween(a,b,text,color=palette.orange){const mx=(sx(a.x)+sx(b.x))/2,my=(sy(a.y)+sy(b.y))/2;context.font='500 14px DM Mono';const width=context.measureText(text).width;context.fillStyle='rgba(255,255,255,.92)';context.fillRect(mx-width/2-5,my-17,width+10,22);context.fillStyle=color;context.fillText(text,mx-width/2,my)}
  function drawGrid(){context.clearRect(0,0,W,H);context.fillStyle='#fbfffe';context.fillRect(0,0,W,H);context.lineWidth=1;context.strokeStyle=palette.grid;for(let x=-8;x<=8;x++){context.beginPath();context.moveTo(sx(x),0);context.lineTo(sx(x),H);context.stroke()}for(let y=-5;y<=5;y++){context.beginPath();context.moveTo(0,sy(y));context.lineTo(W,sy(y));context.stroke()}context.strokeStyle='#9cabb6';context.lineWidth=1.5;context.beginPath();context.moveTo(0,OY);context.lineTo(W,OY);context.moveTo(OX,0);context.lineTo(OX,H);context.stroke();context.fillStyle=palette.muted;context.font='14px DM Mono';context.fillText('x',W-18,OY-9);context.fillText('y',OX+9,17)}
  function pointAt(q){if(curve==='parabola'){const m=models.parabola,t=m.min+(m.max-m.min)*q;return{x:m.p*t*t,y:2*m.p*t,t}}if(curve==='ellipse'){const m=models.ellipse,t=2*Math.PI*q;return{x:m.a*Math.cos(t),y:m.b*Math.sin(t),t}}const m=models.hyperbola,t=m.min+(m.max-m.min)*q;return{x:m.a*Math.cosh(t),y:m.b*Math.sinh(t),t}}
  function tracePaths(q){const paths=[];if(curve==='parabola'){const m=models.parabola,end=m.min+(m.max-m.min)*q,p=[];for(let t=m.min;t<=end;t+=.012)p.push({x:m.p*t*t,y:2*m.p*t});paths.push(p)}else if(curve==='ellipse'){const m=models.ellipse,p=[];for(let t=0;t<=2*Math.PI*q;t+=.012)p.push({x:m.a*Math.cos(t),y:m.b*Math.sin(t)});paths.push(p)}else{const m=models.hyperbola,end=m.min+(m.max-m.min)*q,right=[],left=[];for(let t=m.min;t<=end;t+=.01){right.push({x:m.a*Math.cosh(t),y:m.b*Math.sinh(t)});left.push({x:-m.a*Math.cosh(t),y:m.b*Math.sinh(t)})}paths.push(right,left)}return paths}
  function drawPath(points){if(points.length<2)return;context.strokeStyle=palette.teal;context.lineWidth=3;context.beginPath();context.moveTo(sx(points[0].x),sy(points[0].y));for(const p of points.slice(1))context.lineTo(sx(p.x),sy(p.y));context.stroke()}
  function setValues(rows){document.querySelector('#definition-values').innerHTML=rows.map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join('')}
  function drawDefinition(){drawGrid();tracePaths(revealed).forEach(drawPath);const q=+document.querySelector('#point-position-v3').value/1000;const P=pointAt(animating?revealed:q);
    if(curve==='parabola'){const p=models.parabola,F={x:p.p,y:0},Q={x:-p.p,y:P.y};context.strokeStyle=palette.violet;context.lineWidth=2;context.setLineDash([8,6]);context.beginPath();context.moveTo(sx(-p.p),8);context.lineTo(sx(-p.p),H-8);context.stroke();context.setLineDash([]);context.fillStyle=palette.violet;context.font='500 14px Nanum Gothic';context.fillText('준선  l: x = -1',sx(-p.p)-55,24);marker(F,'초점 F');marker(P,'P',palette.orange);if(!animating){marker(Q,'Q',palette.violet);segment(P,F);segment(P,Q,palette.violet,2,[5,3]);const pf=distance(P,F),pq=distance(P,Q);labelBetween(P,F,`PF = ${pf.toFixed(2)}`);labelBetween(P,Q,`PQ = ${pq.toFixed(2)}`,palette.violet);setValues([['초점까지의 거리 PF',pf.toFixed(3)],['준선까지의 거리 PQ',pq.toFixed(3)],['차이 |PF-PQ|',Math.abs(pf-pq).toFixed(6)]])}else setValues([['상태','정의 조건을 만족하는 점의 자취를 생성하는 중']])}
    if(curve==='ellipse'){const m=models.ellipse,c=Math.sqrt(m.a*m.a-m.b*m.b),F1={x:-c,y:0},F2={x:c,y:0};marker(F1,'F₁');marker(F2,'F₂');marker(P,'P',palette.orange);if(!animating){segment(P,F1);segment(P,F2,palette.violet);const d1=distance(P,F1),d2=distance(P,F2);labelBetween(P,F1,`PF₁ = ${d1.toFixed(2)}`);labelBetween(P,F2,`PF₂ = ${d2.toFixed(2)}`,palette.violet);setValues([['PF₁',d1.toFixed(3)],['PF₂',d2.toFixed(3)],['거리의 합 PF₁+PF₂',(d1+d2).toFixed(6)+' = 2a']])}else setValues([['상태','거리의 합이 2a인 점의 자취를 생성하는 중']])}
    if(curve==='hyperbola'){const m=models.hyperbola,c=Math.sqrt(m.a*m.a+m.b*m.b),F1={x:-c,y:0},F2={x:c,y:0};marker(F1,'F₁');marker(F2,'F₂');marker(P,'P',palette.orange);if(!animating){segment(P,F1);segment(P,F2,palette.violet);const d1=distance(P,F1),d2=distance(P,F2);labelBetween(P,F1,`PF₁ = ${d1.toFixed(2)}`);labelBetween(P,F2,`PF₂ = ${d2.toFixed(2)}`,palette.violet);setValues([['PF₁',d1.toFixed(3)],['PF₂',d2.toFixed(3)],['거리의 차 |PF₁-PF₂|',Math.abs(d1-d2).toFixed(6)+' = 2a']])}else setValues([['상태','거리의 차가 2a인 점의 자취를 생성하는 중']])}
  }
  function updateOtherSections(){updateText();drawCone();drawReflection();drawTangent()}
  function choose(next){curve=next;revealed=0;animating=false;cancelAnimationFrame(frameId);document.querySelectorAll('.curve-choice').forEach(b=>b.classList.toggle('active',b.dataset.curve===curve));updateOtherSections();drawDefinition()}
  function beginTrace(){cancelAnimationFrame(frameId);revealed=0;animating=true;const duration=+document.querySelector('#trace-speed-v3').value,start=performance.now();const tick=now=>{revealed=Math.min(1,(now-start)/duration);drawDefinition();if(revealed<1)frameId=requestAnimationFrame(tick);else{animating=false;drawDefinition()}};frameId=requestAnimationFrame(tick)}
  function setFromPointer(event){const rect=canvasEl.getBoundingClientRect(),px=(event.clientX-rect.left)*W/rect.width,py=(event.clientY-rect.top)*H/rect.height,x=(px-OX)/SCALE,y=(OY-py)/SCALE;let q;if(curve==='parabola'){const m=models.parabola,t=Math.max(m.min,Math.min(m.max,y/(2*m.p)));q=(t-m.min)/(m.max-m.min)}else if(curve==='ellipse'){const m=models.ellipse,t=Math.atan2(y/m.b,x/m.a);q=(t<0?t+2*Math.PI:t)/(2*Math.PI)}else{const m=models.hyperbola,t=Math.max(m.min,Math.min(m.max,Math.asinh(y/m.b)));q=(t-m.min)/(m.max-m.min)}document.querySelector('#point-position-v3').value=Math.round(q*1000);drawDefinition()}
  document.querySelectorAll('.curve-choice').forEach(b=>b.onclick=()=>choose(b.dataset.curve));
  document.querySelector('#point-position-v3').oninput=drawDefinition;
  document.querySelector('#trace-locus-v3').onclick=beginTrace;
  document.querySelector('#reset-locus-v3').onclick=()=>{cancelAnimationFrame(frameId);animating=false;revealed=0;drawDefinition()};
  canvasEl.addEventListener('pointerdown',e=>{dragging=true;canvasEl.setPointerCapture(e.pointerId);setFromPointer(e)});canvasEl.addEventListener('pointermove',e=>{if(dragging)setFromPointer(e)});canvasEl.addEventListener('pointerup',()=>dragging=false);canvasEl.style.cursor='grab';
  choose('parabola');
})();
