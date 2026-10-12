(() => {
  const oldPlay = document.querySelector('.canvas-card #play-locus');
  if (oldPlay) oldPlay.remove();

  const picker = document.querySelector('.curve-picker');
  picker.insertAdjacentHTML('afterend', `
    <div class="parameter-panel-v4">
      <section class="parameter-card-v4" id="parabola-parameters-v4">
        <div class="parameter-heading-v4"><div><b>포물선 조건 설정</b><span>초점과 준선이 정해지면 포물선이 하나로 결정됩니다.</span></div></div>
        <div class="parameter-p-control-v5">
          <label for="parabola-p-v4"><span><i>p</i> (꼭짓점에서 초점까지의 거리)</span><output id="parabola-p-value-v4">1</output></label>
          <input id="parabola-p-v4" type="range" min="0.25" max="5" value="1" step="0.25" aria-label="포물선의 초점 거리 p">
          <p><b>p</b>가 커지면 같은 좌표 눈금에서 포물선이 더 완만하게 벌어집니다.</p>
        </div>
        <div class="parameter-fields-v4">
          <label>초점의 x좌표 <input id="focus-x-v4" type="number" value="1" step="0.5"></label>
          <label>초점의 y좌표 <input id="focus-y-v4" type="number" value="0" step="0.5"></label>
          <label>준선 방향 <select id="directrix-axis-v4"><option value="x">x = d</option><option value="y">y = d</option></select></label>
          <label>준선의 값 d <input id="directrix-value-v4" type="number" value="-1" step="0.5"></label>
        </div>
        <div class="preset-row-v4">
          <button type="button" data-preset-v4="right">기본형  y²=4x</button>
          <button type="button" data-preset-v4="left">왼쪽  y²=-4x</button>
          <button type="button" data-preset-v4="up">위쪽  x²=4y</button>
          <button type="button" data-preset-v4="down">아래쪽  x²=-4y</button>
        </div>
        <div class="validation-v4" id="validation-v4"></div>
      </section>
      <section class="parameter-card-v4 curve-parameters-v4" id="ellipse-parameters-v4" hidden>
        <div class="parameter-heading-v4"><div><b>타원 조건 설정</b><span>두 입력값이 방정식의 분모와 타원의 방향을 결정합니다.</span></div></div>
        <div class="parameter-fields-v4">
          <label><span>x방향 반지름 <span data-math-v4="a"></span></span><input id="ellipse-a-v4" type="number" value="5" min="0.5" step="0.5"></label>
          <label><span>y방향 반지름 <span data-math-v4="b"></span></span><input id="ellipse-b-v4" type="number" value="3" min="0.5" step="0.5"></label>
        </div>
        <div class="preset-row-v4">
          <button type="button" data-ellipse-preset-v4="horizontal">가로형</button>
          <button type="button" data-ellipse-preset-v4="vertical">세로형</button>
          <button type="button" data-ellipse-preset-v4="circle">원형</button>
        </div>
        <div class="parameter-fact-v4" id="ellipse-fact-v4"></div>
        <div class="validation-v4" id="ellipse-validation-v4"></div>
      </section>
      <section class="parameter-card-v4 curve-parameters-v4" id="hyperbola-parameters-v4" hidden>
        <div class="parameter-heading-v4"><div><b>쌍곡선 조건 설정</b><span>방향과 두 축의 크기를 바꾸며 초점과 거리 차를 관찰하세요.</span></div></div>
        <div class="parameter-fields-v4">
          <label>열리는 방향 <select id="hyperbola-axis-v4"><option value="x">좌우 방향</option><option value="y">위아래 방향</option></select></label>
          <label><span>x방향 크기 <span data-math-v4="a"></span></span><input id="hyperbola-a-v4" type="number" value="3" min="0.5" step="0.5"></label>
          <label><span>y방향 크기 <span data-math-v4="b"></span></span><input id="hyperbola-b-v4" type="number" value="2" min="0.5" step="0.5"></label>
        </div>
        <div class="preset-row-v4">
          <button type="button" data-hyperbola-preset-v4="horizontal">좌우형</button>
          <button type="button" data-hyperbola-preset-v4="vertical">상하형</button>
          <button type="button" data-hyperbola-preset-v4="wide">넓은 가지</button>
        </div>
        <div class="parameter-fact-v4" id="hyperbola-fact-v4"></div>
        <div class="validation-v4" id="hyperbola-validation-v4"></div>
      </section>
      <section class="motion-card-v4">
        <label>점 P 이동 <input id="point-position-v4" type="range" min="0" max="1000" value="620" aria-label="곡선 위 점 P의 위치"></label>
        <label>자취 속도 <select id="trace-speed-v4"><option value="18000">느리게</option><option value="10000" selected>보통</option><option value="5000">빠르게</option></select></label>
        <button class="primary-v4" id="trace-v4" type="button">▶ 자취 그리기</button>
        <button class="secondary-v4" id="reset-v4" type="button">자취 지우기</button>
      </section>
    </div>`);

  const canvas = document.querySelector('#locus-canvas');
  const card = canvas.closest('.canvas-card');
  const wrap = document.createElement('div');
  wrap.className = 'plot-wrap-v4';
  canvas.parentNode.insertBefore(wrap, canvas);
  wrap.appendChild(canvas);
  wrap.insertAdjacentHTML('beforeend','<div class="math-label-layer-v4" id="math-label-layer-v4"></div>');
  wrap.insertAdjacentHTML('beforeend',`<div class="plot-tools-v5" aria-label="좌표평면 보기 조절">
    <button type="button" id="zoom-out-v5" aria-label="축소">−</button>
    <button type="button" id="reset-view-v5">뷰 초기화</button>
    <button type="button" id="zoom-in-v5" aria-label="확대">＋</button>
  </div><div class="plot-hint-v5">빨간 점 P 이동 · 휠로 확대·축소 · 빈 공간 드래그</div>`);
  wrap.insertAdjacentHTML('afterend','<div class="measurement-strip-v4" id="measurement-strip-v4"></div><div class="live-equation-v4" id="live-equation-v4"></div>');

  const LOGICAL_W=680, LOGICAL_H=400, DPR=Math.min(window.devicePixelRatio||1,2);
  canvas.width=LOGICAL_W*DPR; canvas.height=LOGICAL_H*DPR;
  const ctx=canvas.getContext('2d');
  const palette={ink:'#172139',muted:'#536578',grid:'#d9e5e5',axis:'#758797',teal:'#008f83',violet:'#6851bd',orange:'#cf6e32',surface:'#fbfefd'};
  const parabola={fx:1,fy:0,axis:'x',d:-1};
  const ellipse={a:5,b:3};
  const hyperbola={a:3,b:2,axis:'x'};
  let progress=1,animating=false,animationId=0,dragMode=null,lastPointer=null,view={scale:38,ox:340,oy:200};
  const tx=x=>view.ox+x*view.scale, ty=y=>view.oy-y*view.scale;
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const fmt=n=>Math.abs(n)<1e-9?'0':Number(n.toFixed(3)).toString();
  const signed=(variable,c)=>Math.abs(c)<1e-9?variable:`(${variable}${c>0?'-':'+'}${fmt(Math.abs(c))})`;
  function renderTex(el,tex,display=false){if(!el)return;if(window.katex)katex.render(tex,el,{throwOnError:false,displayMode:display,strict:false});else el.textContent=tex}
  function prep(){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle=palette.surface;ctx.fillRect(0,0,LOGICAL_W,LOGICAL_H);document.querySelector('#math-label-layer-v4').innerHTML=''}
  function line(a,b,color=palette.orange,width=2,dash=[]){ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(tx(a.x),ty(a.y));ctx.lineTo(tx(b.x),ty(b.y));ctx.stroke();ctx.restore()}
  function dot(p,color=palette.teal,r=6){ctx.fillStyle=color;ctx.beginPath();ctx.arc(tx(p.x),ty(p.y),r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke()}
  function addMath(tex,px,py,className=''){const el=document.createElement('span');el.className=`math-label-v4 ${className}`;el.style.left=`${px/LOGICAL_W*100}%`;el.style.top=`${py/LOGICAL_H*100}%`;document.querySelector('#math-label-layer-v4').appendChild(el);renderTex(el,tex)}
  function addPointLabel(tex,p,dx=13,dy=-13){addMath(tex,tx(p.x)+dx,ty(p.y)+dy)}
  function graphPath(points){if(points.length<2)return;ctx.strokeStyle=palette.teal;ctx.lineWidth=3.2;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(tx(points[0].x),ty(points[0].y));for(let i=1;i<points.length;i++)ctx.lineTo(tx(points[i].x),ty(points[i].y));ctx.stroke()}
  function paddedView(points,extras=[]){const all=[...points,...extras,{x:0,y:0}];let minX=Math.min(...all.map(p=>p.x)),maxX=Math.max(...all.map(p=>p.x)),minY=Math.min(...all.map(p=>p.y)),maxY=Math.max(...all.map(p=>p.y));let spanX=Math.max(maxX-minX,8),spanY=Math.max(maxY-minY,8);const cx=(minX+maxX)/2,cy=(minY+maxY)/2;minX=cx-spanX/2;maxX=cx+spanX/2;minY=cy-spanY/2;maxY=cy+spanY/2;const scale=Math.min((LOGICAL_W-86)/(maxX-minX),(LOGICAL_H-58)/(maxY-minY));view={scale,ox:43-minX*scale,oy:LOGICAL_H-29+minY*scale}}
  function fitCurrentCurve(){
    const full=curve==='parabola'?parabolaGeometry(.5,1):curve==='ellipse'?ellipseGeometry(.5,1):hyperbolaGeometry(.5,1);
    const points=curve==='parabola'?full.path:curve==='ellipse'?full.path:[...full.right,...full.left];
    const extras=curve==='parabola'?[full.F,full.Q]:[full.F1,full.F2];
    paddedView(points,extras);
  }
  function zoomAt(px,py,factor){
    const worldX=(px-view.ox)/view.scale,worldY=(view.oy-py)/view.scale;
    const nextScale=Math.max(16,Math.min(150,view.scale*factor));
    view={scale:nextScale,ox:px-worldX*nextScale,oy:py+worldY*nextScale};
    draw();
  }
  function gridStep(){
    const raw=58/view.scale,power=10**Math.floor(Math.log10(raw)),unit=raw/power;
    return(unit<=1?1:unit<=2?2:unit<=5?5:10)*power;
  }
  function drawGrid(){
    const left=(0-view.ox)/view.scale,right=(LOGICAL_W-view.ox)/view.scale,bottom=(view.oy-LOGICAL_H)/view.scale,top=view.oy/view.scale;
    const step=gridStep(),minor=step/5;
    ctx.save();
    ctx.strokeStyle='rgba(218,224,235,.45)';ctx.lineWidth=.65;
    for(let x=Math.ceil(left/minor)*minor;x<=right;x+=minor){ctx.beginPath();ctx.moveTo(tx(x),0);ctx.lineTo(tx(x),LOGICAL_H);ctx.stroke()}
    for(let y=Math.ceil(bottom/minor)*minor;y<=top;y+=minor){ctx.beginPath();ctx.moveTo(0,ty(y));ctx.lineTo(LOGICAL_W,ty(y));ctx.stroke()}
    ctx.strokeStyle=palette.grid;ctx.lineWidth=1;
    for(let x=Math.ceil(left/step)*step;x<=right;x+=step){ctx.beginPath();ctx.moveTo(tx(x),0);ctx.lineTo(tx(x),LOGICAL_H);ctx.stroke()}
    for(let y=Math.ceil(bottom/step)*step;y<=top;y+=step){ctx.beginPath();ctx.moveTo(0,ty(y));ctx.lineTo(LOGICAL_W,ty(y));ctx.stroke()}
    const axisX=tx(0),axisY=ty(0),xAxisVisible=axisY>=0&&axisY<=LOGICAL_H,yAxisVisible=axisX>=0&&axisX<=LOGICAL_W;
    ctx.strokeStyle=palette.axis;ctx.lineWidth=1.8;
    if(yAxisVisible){ctx.beginPath();ctx.moveTo(axisX,0);ctx.lineTo(axisX,LOGICAL_H);ctx.stroke()}
    if(xAxisVisible){ctx.beginPath();ctx.moveTo(0,axisY);ctx.lineTo(LOGICAL_W,axisY);ctx.stroke()}
    ctx.fillStyle=palette.muted;ctx.font="11px 'DM Mono', monospace";
    const labelY=Math.max(14,Math.min(LOGICAL_H-7,axisY+17)),labelX=Math.max(4,Math.min(LOGICAL_W-34,axisX+7));
    for(let x=Math.ceil(left/step)*step;x<=right;x+=step){if(Math.abs(x)<step/100)continue;const px=tx(x);ctx.fillText(fmt(x),px+3,labelY)}
    for(let y=Math.ceil(bottom/step)*step;y<=top;y+=step){if(Math.abs(y)<step/100)continue;const py=ty(y);ctx.fillText(fmt(y),labelX,py-4)}
    ctx.restore();
    if(yAxisVisible)addMath('y',axisX+17,18,'axis-label-v4');
    if(xAxisVisible)addMath('x',LOGICAL_W-18,axisY-15,'axis-label-v4');
  }
  function parabolaGeometry(q,amount=1){const horizontal=parabola.axis==='x',p=horizontal?(parabola.fx-parabola.d)/2:(parabola.fy-parabola.d)/2,h=horizontal?(parabola.fx+parabola.d)/2:parabola.fx,k=horizontal?parabola.fy:(parabola.fy+parabola.d)/2,tMin=-2.8,tMax=2.8,t=tMin+(tMax-tMin)*q,P=horizontal?{x:h+p*t*t,y:k+2*p*t}:{x:h+2*p*t,y:k+p*t*t},F={x:parabola.fx,y:parabola.fy},Q=horizontal?{x:parabola.d,y:P.y}:{x:P.x,y:parabola.d},path=[];for(let u=tMin;u<=tMin+(tMax-tMin)*amount;u+=.012)path.push(horizontal?{x:h+p*u*u,y:k+2*p*u}:{x:h+2*p*u,y:k+p*u*u});return{horizontal,p,h,k,P,F,Q,path,tMin,tMax}}
  function ellipseGeometry(q,amount=1){const{a,b}=ellipse,horizontal=a>=b,major=Math.max(a,b),c=Math.sqrt(Math.abs(a*a-b*b)),t=2*Math.PI*q,P={x:a*Math.cos(t),y:b*Math.sin(t)},F1=horizontal?{x:-c,y:0}:{x:0,y:-c},F2=horizontal?{x:c,y:0}:{x:0,y:c},path=[];for(let u=0;u<=2*Math.PI*amount;u+=.012)path.push({x:a*Math.cos(u),y:b*Math.sin(u)});return{P,F1,F2,path,a,b,horizontal,major,majorSymbol:horizontal?'a':'b'}}
  function hyperbolaGeometry(q,amount=1){const{a,b,axis}=hyperbola,horizontal=axis==='x',c=Math.sqrt(a*a+b*b),uMin=-1.6,uMax=1.6,u=uMin+(uMax-uMin)*q,P=horizontal?{x:a*Math.cosh(u),y:b*Math.sinh(u)}:{x:a*Math.sinh(u),y:b*Math.cosh(u)},F1=horizontal?{x:-c,y:0}:{x:0,y:-c},F2=horizontal?{x:c,y:0}:{x:0,y:c},right=[],left=[];for(let s=uMin;s<=uMin+(uMax-uMin)*amount;s+=.01){right.push(horizontal?{x:a*Math.cosh(s),y:b*Math.sinh(s)}:{x:a*Math.sinh(s),y:b*Math.cosh(s)});left.push(horizontal?{x:-a*Math.cosh(s),y:b*Math.sinh(s)}:{x:a*Math.sinh(s),y:-b*Math.cosh(s)})}return{P,F1,F2,right,left,a,b,horizontal,major:horizontal?a:b,majorSymbol:horizontal?'a':'b',uMin,uMax}}
  function mathStrip(items){const strip=document.querySelector('#measurement-strip-v4');strip.innerHTML='';if(animating){strip.innerHTML='<div class="auto-status-v4">정의 조건을 만족하는 점의 자취를 생성하고 있습니다.</div>';return}for(const tex of items){const d=document.createElement('div');d.className='measurement-v4';strip.appendChild(d);renderTex(d,tex)}}
  function equationForParabola(g){const coeff=4*g.p,lhs=g.horizontal?`${signed('y',g.k)}^2`:`${signed('x',g.h)}^2`,rhsVar=g.horizontal?signed('x',g.h):signed('y',g.k);return`${lhs}=${fmt(coeff)}${rhsVar}`}
  function validParabola(){const same=parabola.axis==='x'?Math.abs(parabola.fx-parabola.d)<1e-8:Math.abs(parabola.fy-parabola.d)<1e-8;document.querySelector('#validation-v4').textContent=same?'초점이 준선 위에 놓일 수 없습니다. 초점 또는 준선 값을 바꿔 주세요.':'';return !same}
  function validEllipse(){const ok=Number.isFinite(ellipse.a)&&Number.isFinite(ellipse.b)&&ellipse.a>0&&ellipse.b>0;document.querySelector('#ellipse-validation-v4').textContent=ok?'':'a와 b는 0보다 큰 수로 입력해 주세요.';return ok}
  function validHyperbola(){const ok=Number.isFinite(hyperbola.a)&&Number.isFinite(hyperbola.b)&&hyperbola.a>0&&hyperbola.b>0;document.querySelector('#hyperbola-validation-v4').textContent=ok?'':'a와 b는 0보다 큰 수로 입력해 주세요.';return ok}
  function draw(){
    const valid=curve==='parabola'?validParabola():curve==='ellipse'?validEllipse():validHyperbola();
    canvas.dataset.curve=curve;canvas.dataset.viewScale=view.scale.toFixed(4);canvas.dataset.viewOx=view.ox.toFixed(2);canvas.dataset.viewOy=view.oy.toFixed(2);canvas.dataset.parabolaP=fmt(parabolaP());
    if(!valid){prep();document.querySelector('#measurement-strip-v4').innerHTML='';document.querySelector('#live-equation-v4').innerHTML='';return}
    const q=+document.querySelector('#point-position-v4').value/1000;
    const amount=animating?progress:progress;
    const movingQ=animating?progress:q;
    const g=curve==='parabola'?parabolaGeometry(movingQ,amount):curve==='ellipse'?ellipseGeometry(movingQ,amount):hyperbolaGeometry(movingQ,amount);
    prep();drawGrid();

    if(curve==='parabola'){
      if(revealedOrProgress()>0)graphPath(g.path);
      const edge1=view.oy/view.scale,edge2=(view.oy-LOGICAL_H)/view.scale;
      if(g.horizontal)line({x:parabola.d,y:edge1},{x:parabola.d,y:edge2},palette.violet,2,[7,5]);
      else{const l=(0-view.ox)/view.scale,r=(LOGICAL_W-view.ox)/view.scale;line({x:l,y:parabola.d},{x:r,y:parabola.d},palette.violet,2,[7,5])}
      line(g.P,g.F,palette.orange,2.2);line(g.P,g.Q,palette.violet,2.2,[5,4]);
      dot(g.F);dot(g.Q,palette.violet,5);dot(g.P,palette.orange);
      addPointLabel('F',g.F);addPointLabel('Q',g.Q,-13,-14);addPointLabel('P',g.P);
      const directrixTex=g.horizontal?`\\ell:x=${fmt(parabola.d)}`:`\\ell:y=${fmt(parabola.d)}`;
      addMath(directrixTex,g.horizontal?tx(parabola.d)+50:90,g.horizontal?24:ty(parabola.d)-16);
      const pf=dist(g.P,g.F),pq=dist(g.P,g.Q);
      if(!animating)mathStrip([`PF=${pf.toFixed(3)}`,`PQ=d(P,\\ell)=${pq.toFixed(3)}`,`|PF-PQ|=${Math.abs(pf-pq).toFixed(6)}`]);else mathStrip([]);
      const equation=equationForParabola(g);
      renderTex(document.querySelector('#live-equation-v4'),equation,true);
      renderTex(document.querySelector('#definition-formula'),'PF=d(P,\\ell)',true);
      renderTex(document.querySelector('#cone-formula'),'PF=d(P,\\ell)',true);
      document.querySelector('#definition-text').textContent=`초점 F(${fmt(parabola.fx)}, ${fmt(parabola.fy)})와 준선 ${g.horizontal?'x':'y'}=${fmt(parabola.d)}까지의 거리가 같은 점 P의 자취`;
    }

    if(curve==='ellipse'){
      if(revealedOrProgress()>0)graphPath(g.path);
      line(g.P,g.F1,palette.orange,2.2);line(g.P,g.F2,palette.violet,2.2);
      dot(g.F1);dot(g.F2);dot(g.P,palette.orange);
      addPointLabel('F_1',g.F1);addPointLabel('F_2',g.F2);addPointLabel('P',g.P);
      const d1=dist(g.P,g.F1),d2=dist(g.P,g.F2),sum=d1+d2;
      if(!animating)mathStrip([`PF_1=${d1.toFixed(3)}`,`PF_2=${d2.toFixed(3)}`,`PF_1+PF_2=${sum.toFixed(6)}=2${g.majorSymbol}`]);else mathStrip([]);
      renderTex(document.querySelector('#live-equation-v4'),`\\frac{x^2}{${fmt(g.a*g.a)}}+\\frac{y^2}{${fmt(g.b*g.b)}}=1`,true);
      renderTex(document.querySelector('#definition-formula'),`PF_1+PF_2=2${g.majorSymbol}`,true);
      renderTex(document.querySelector('#cone-formula'),`PF_1+PF_2=2${g.majorSymbol}`,true);
      renderTex(document.querySelector('#ellipse-fact-v4'),`c=\\sqrt{|a^2-b^2|}=${fmt(Math.sqrt(Math.abs(g.a*g.a-g.b*g.b)))},\\quad PF_1+PF_2=${fmt(2*g.major)}`,false);
    }

    if(curve==='hyperbola'){
      if(revealedOrProgress()>0){graphPath(g.right);graphPath(g.left)}
      line(g.P,g.F1,palette.orange,2.2);line(g.P,g.F2,palette.violet,2.2);
      dot(g.F1);dot(g.F2);dot(g.P,palette.orange);
      addPointLabel('F_1',g.F1);addPointLabel('F_2',g.F2);addPointLabel('P',g.P);
      const d1=dist(g.P,g.F1),d2=dist(g.P,g.F2),difference=Math.abs(d1-d2);
      if(!animating)mathStrip([`PF_1=${d1.toFixed(3)}`,`PF_2=${d2.toFixed(3)}`,`|PF_1-PF_2|=${difference.toFixed(6)}=2${g.majorSymbol}`]);else mathStrip([]);
      const equation=g.horizontal?`\\frac{x^2}{${fmt(g.a*g.a)}}-\\frac{y^2}{${fmt(g.b*g.b)}}=1`:`\\frac{y^2}{${fmt(g.b*g.b)}}-\\frac{x^2}{${fmt(g.a*g.a)}}=1`;
      renderTex(document.querySelector('#live-equation-v4'),equation,true);
      renderTex(document.querySelector('#definition-formula'),`|PF_1-PF_2|=2${g.majorSymbol}`,true);
      renderTex(document.querySelector('#cone-formula'),`|PF_1-PF_2|=2${g.majorSymbol}`,true);
      renderTex(document.querySelector('#hyperbola-fact-v4'),`c=\\sqrt{a^2+b^2}=${fmt(Math.sqrt(g.a*g.a+g.b*g.b))},\\quad |PF_1-PF_2|=${fmt(2*g.major)}`,false);
    }
  }
  function revealedOrProgress(){return animating?progress:progress}
  function renderOtherMath(){renderTex(document.querySelector('#reflection .formula'),'\\angle i=\\angle r',true);let tangentTex='t y=x+p t^2';if(curve==='ellipse')tangentTex='\\dfrac{x_0x}{a^2}+\\dfrac{y_0y}{b^2}=1';if(curve==='hyperbola')tangentTex=hyperbola.axis==='x'?'\\dfrac{x_0x}{a^2}-\\dfrac{y_0y}{b^2}=1':'\\dfrac{y_0y}{b^2}-\\dfrac{x_0x}{a^2}=1';renderTex(document.querySelector('#tangent-formula'),tangentTex,true)}
  function choose(next){curve=next;progress=1;animating=false;cancelAnimationFrame(animationId);document.querySelectorAll('.curve-choice').forEach(b=>b.classList.toggle('active',b.dataset.curve===curve));document.querySelector('#parabola-parameters-v4').hidden=curve!=='parabola';document.querySelector('#ellipse-parameters-v4').hidden=curve!=='ellipse';document.querySelector('#hyperbola-parameters-v4').hidden=curve!=='hyperbola';updateText();drawCone();drawReflection();drawTangent();renderOtherMath();fitCurrentCurve();draw()}
  function animate(){const valid=curve==='parabola'?validParabola():curve==='ellipse'?validEllipse():validHyperbola();if(!valid)return;cancelAnimationFrame(animationId);progress=0;animating=true;const duration=+document.querySelector('#trace-speed-v4').value,start=performance.now();const step=now=>{progress=Math.min(1,(now-start)/duration);draw();if(progress<1)animationId=requestAnimationFrame(step);else{animating=false;draw()}};animationId=requestAnimationFrame(step)}
  function parabolaP(){return Math.abs(parabola.axis==='x'?parabola.fx-parabola.d:parabola.fy-parabola.d)/2}
  function syncParabolaP(){const p=parabolaP();document.querySelector('#parabola-p-v4').value=Math.max(.25,Math.min(5,p));document.querySelector('#parabola-p-value-v4').textContent=fmt(p)}
  function readParabolaParameters(){parabola.fx=Number(document.querySelector('#focus-x-v4').value);parabola.fy=Number(document.querySelector('#focus-y-v4').value);parabola.axis=document.querySelector('#directrix-axis-v4').value;parabola.d=Number(document.querySelector('#directrix-value-v4').value);syncParabolaP();progress=1;draw()}
  function setParabolaP(){
    const p=Number(document.querySelector('#parabola-p-v4').value);
    if(parabola.axis==='x'){
      const vertex=(parabola.fx+parabola.d)/2,sign=parabola.fx>=parabola.d?1:-1;
      parabola.fx=vertex+sign*p;parabola.d=vertex-sign*p;
      document.querySelector('#focus-x-v4').value=fmt(parabola.fx);document.querySelector('#directrix-value-v4').value=fmt(parabola.d);
    }else{
      const vertex=(parabola.fy+parabola.d)/2,sign=parabola.fy>=parabola.d?1:-1;
      parabola.fy=vertex+sign*p;parabola.d=vertex-sign*p;
      document.querySelector('#focus-y-v4').value=fmt(parabola.fy);document.querySelector('#directrix-value-v4').value=fmt(parabola.d);
    }
    document.querySelector('#parabola-p-value-v4').textContent=fmt(p);progress=1;draw();
  }
  function readEllipseParameters(){ellipse.a=Number(document.querySelector('#ellipse-a-v4').value);ellipse.b=Number(document.querySelector('#ellipse-b-v4').value);progress=1;draw();renderOtherMath()}
  function readHyperbolaParameters(){hyperbola.axis=document.querySelector('#hyperbola-axis-v4').value;hyperbola.a=Number(document.querySelector('#hyperbola-a-v4').value);hyperbola.b=Number(document.querySelector('#hyperbola-b-v4').value);progress=1;draw();renderOtherMath()}
  function preset(name){const presets={right:[1,0,'x',-1],left:[-1,0,'x',1],up:[0,1,'y',-1],down:[0,-1,'y',1]},v=presets[name];document.querySelector('#focus-x-v4').value=v[0];document.querySelector('#focus-y-v4').value=v[1];document.querySelector('#directrix-axis-v4').value=v[2];document.querySelector('#directrix-value-v4').value=v[3];readParabolaParameters()}
  function ellipsePreset(name){const presets={horizontal:[5,3],vertical:[3,5],circle:[4,4]},v=presets[name];document.querySelector('#ellipse-a-v4').value=v[0];document.querySelector('#ellipse-b-v4').value=v[1];readEllipseParameters()}
  function hyperbolaPreset(name){const presets={horizontal:['x',3,2],vertical:['y',2,3],wide:['x',2,4]},v=presets[name];document.querySelector('#hyperbola-axis-v4').value=v[0];document.querySelector('#hyperbola-a-v4').value=v[1];document.querySelector('#hyperbola-b-v4').value=v[2];readHyperbolaParameters()}
  function pointerToParameter(event){const rect=canvas.getBoundingClientRect(),px=(event.clientX-rect.left)*LOGICAL_W/rect.width,py=(event.clientY-rect.top)*LOGICAL_H/rect.height,x=(px-view.ox)/view.scale,y=(view.oy-py)/view.scale;let q;if(curve==='parabola'){const g=parabolaGeometry(.5,1),t=g.horizontal?(y-g.k)/(2*g.p):(x-g.h)/(2*g.p);q=(Math.max(g.tMin,Math.min(g.tMax,t))-g.tMin)/(g.tMax-g.tMin)}else if(curve==='ellipse'){let t=Math.atan2(y/ellipse.b,x/ellipse.a);if(t<0)t+=2*Math.PI;q=t/(2*Math.PI)}else{const g=hyperbolaGeometry(.5,1),parameter=g.horizontal?Math.asinh(y/hyperbola.b):Math.asinh(x/hyperbola.a),t=Math.max(g.uMin,Math.min(g.uMax,parameter));q=(t-g.uMin)/(g.uMax-g.uMin)}document.querySelector('#point-position-v4').value=Math.round(q*1000);draw()}
  document.querySelectorAll('.curve-choice').forEach(b=>b.onclick=()=>choose(b.dataset.curve));
  document.querySelectorAll('#parabola-parameters-v4 input:not(#parabola-p-v4),#parabola-parameters-v4 select').forEach(el=>el.oninput=readParabolaParameters);
  document.querySelector('#parabola-p-v4').oninput=setParabolaP;
  document.querySelectorAll('#ellipse-parameters-v4 input').forEach(el=>el.oninput=readEllipseParameters);
  document.querySelectorAll('#hyperbola-parameters-v4 input,#hyperbola-parameters-v4 select').forEach(el=>el.oninput=readHyperbolaParameters);
  document.querySelectorAll('[data-preset-v4]').forEach(b=>b.onclick=()=>preset(b.dataset.presetV4));
  document.querySelectorAll('[data-ellipse-preset-v4]').forEach(b=>b.onclick=()=>ellipsePreset(b.dataset.ellipsePresetV4));
  document.querySelectorAll('[data-hyperbola-preset-v4]').forEach(b=>b.onclick=()=>hyperbolaPreset(b.dataset.hyperbolaPresetV4));
  document.querySelector('#point-position-v4').oninput=draw;document.querySelector('#trace-v4').onclick=animate;document.querySelector('#reset-v4').onclick=()=>{cancelAnimationFrame(animationId);animating=false;progress=0;draw()};
  function pointerPosition(event){const rect=canvas.getBoundingClientRect();return{x:(event.clientX-rect.left)*LOGICAL_W/rect.width,y:(event.clientY-rect.top)*LOGICAL_H/rect.height}}
  function currentPoint(){const q=+document.querySelector('#point-position-v4').value/1000;return curve==='parabola'?parabolaGeometry(q,1).P:curve==='ellipse'?ellipseGeometry(q,1).P:hyperbolaGeometry(q,1).P}
  wrap.addEventListener('wheel',e=>{
    e.preventDefault();
    const p=pointerPosition(e),delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?LOGICAL_H:1);
    zoomAt(p.x,p.y,Math.exp(-delta*.0015));
  },{passive:false});
  wrap.addEventListener('pointerdown',e=>{
    if(e.target.closest('button'))return;
    const p=pointerPosition(e),P=currentPoint(),pointDistance=Math.hypot(p.x-tx(P.x),p.y-ty(P.y));
    dragMode=pointDistance<=18?'point':'pan';lastPointer=p;wrap.setPointerCapture(e.pointerId);wrap.classList.add('is-dragging');
    if(dragMode==='point')pointerToParameter(e);
  });
  wrap.addEventListener('pointermove',e=>{if(!dragMode)return;if(dragMode==='point'){pointerToParameter(e);return}const p=pointerPosition(e);view.ox+=p.x-lastPointer.x;view.oy+=p.y-lastPointer.y;lastPointer=p;draw()});
  const endDrag=()=>{dragMode=null;lastPointer=null;wrap.classList.remove('is-dragging')};
  wrap.addEventListener('pointerup',endDrag);wrap.addEventListener('pointercancel',endDrag);
  document.querySelector('#zoom-in-v5').onclick=()=>zoomAt(LOGICAL_W/2,LOGICAL_H/2,1.25);
  document.querySelector('#zoom-out-v5').onclick=()=>zoomAt(LOGICAL_W/2,LOGICAL_H/2,.8);
  document.querySelector('#reset-view-v5').onclick=()=>{fitCurrentCurve();draw()};
  choose('parabola');
})();
