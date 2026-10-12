(() => {
  const canvas = document.querySelector('#reflection-canvas-v7');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const slider = document.querySelector('#reflection-point-v7');
  const title = document.querySelector('#reflection-title-v7');
  const description = document.querySelector('#reflection-text-v7');
  const property = document.querySelector('#reflection-property-v7');
  const angleBox = document.querySelector('#reflection-angle-v7');
  const vectorBox = document.querySelector('#reflection-vector-v7');
  let type = 'parabola';
  let frame = 0;
  let progress = null;
  let multi = false;
  const colors = { curve:'#163f48', incident:'#ed8b57', reflected:'#158c83', normal:'#6f7eae', focus:'#7956b5', point:'#d94d64' };
  const V = {
    add:(a,b)=>[a[0]+b[0],a[1]+b[1]], sub:(a,b)=>[a[0]-b[0],a[1]-b[1]], mul:(a,s)=>[a[0]*s,a[1]*s],
    dot:(a,b)=>a[0]*b[0]+a[1]*b[1], len:a=>Math.hypot(a[0],a[1]), unit(a){const l=this.len(a)||1;return[a[0]/l,a[1]/l];}
  };
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function model(qOverride){
    const q=qOverride ?? Number(slider.value)/1000;
    if(type==='parabola'){
      const p=1.25,x=-4.5+9*q,P=[x,x*x/(4*p)],F=[0,p],source=[x,7],v=[0,-1],n=V.unit([-x/(2*p),1]);
      return {kind:'parabola',p,P,F:[F],source,v,n,outTarget:F,curve:t=>[t,t*t/(4*p)],range:[-5,5],copy:['포물선의 반사 성질','평행하게 들어온 빛은 첫 반사 뒤 초점 F를 지나고, 반대편 포물선에서 다시 반사되어 축과 평행하게 빠져나갑니다.','\\text{평행광}\\to P_1\\to F\\to P_2\\to\\text{평행광}']};
    }
    if(type==='ellipse'){
      const a=5,b=3,c=4,t=.18*Math.PI+1.64*Math.PI*q,P=[a*Math.cos(t),b*Math.sin(t)],F1=[-c,0],F2=[c,0],v=V.unit(V.sub(P,F1)),n=V.unit([P[0]/(a*a),P[1]/(b*b)]);
      return {kind:'ellipse',a,b,P,F:[F1,F2],source:F1,v,n,outTarget:F2,curve:s=>[a*Math.cos(s),b*Math.sin(s)],range:[0,Math.PI*2],copy:['타원의 반사 성질','F₁에서 출발한 빛은 경계에서 반사될 때마다 F₂와 F₁을 번갈아 지나며 타원 내부에 머뭅니다. 화면에서는 네 번 반사한 뒤 멈춥니다.','F_1\\to P_1\\to F_2\\to P_2\\to F_1\\to\\cdots']};
    }
    const a=3,b=2,c=Math.sqrt(13),u=-1.05+2.1*q,P=[a*Math.cosh(u),b*Math.sinh(u)],F1=[-c,0],F2=[c,0],v=V.unit(V.sub(P,F1)),n=V.unit([P[0]/(a*a),-P[1]/(b*b)]);
    return {kind:'hyperbola',P,F:[F1,F2],source:F1,v,n,virtual:F2,curve:s=>[a*Math.cosh(s),b*Math.sinh(s)],range:[-1.25,1.25],copy:['쌍곡선의 반사 성질','한 초점 F₁에서 온 빛은 반사된 뒤, 다른 초점 F₂에서 나온 것처럼 바깥쪽으로 진행합니다. 점선은 반사광의 역방향 연장선입니다.','F_1\\to P,\\qquad \\text{반사광의 연장선은 }F_2\\text{를 지난다}']};
  }
  function renderTex(el,tex){if(window.katex) katex.render(tex,el,{throwOnError:false,displayMode:true});else el.textContent=tex;}
  function setup(){const dpr=Math.min(devicePixelRatio||1,2),rect=canvas.getBoundingClientRect(),w=Math.max(400,rect.width),h=w*470/760;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);return{w,h};}
  function draw(){
    const {w,h}=setup(),m=model(),sx=w/15,sy=h/10.5,to=p=>[w/2+p[0]*sx,h*.54-p[1]*sy];
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#f8fbfa';ctx.fillRect(0,0,w,h);
    ctx.lineWidth=1;ctx.strokeStyle='#dce8e6';for(let x=-7;x<=7;x++){const a=to([x,-5]),b=to([x,5]);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke()}for(let y=-4;y<=7;y++){const a=to([-8,y]),b=to([8,y]);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke()}
    const axis=(a,b)=>{ctx.strokeStyle='#9bb2b2';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(...to(a));ctx.lineTo(...to(b));ctx.stroke()};axis([-8,0],[8,0]);axis([0,-5],[0,8]);
    const curve=(fn,range)=>{ctx.strokeStyle=colors.curve;ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();for(let i=0;i<=260;i++){const p=to(fn(range[0]+(range[1]-range[0])*i/260));i?ctx.lineTo(...p):ctx.moveTo(...p)}ctx.stroke()};curve(m.curve,m.range);
    const line=(a,b,color,width=2,dash=[])=>{ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(...to(a));ctx.lineTo(...to(b));ctx.stroke();ctx.restore()};
    line(V.add(m.P,V.mul(m.n,-1.25)),V.add(m.P,V.mul(m.n,1.25)),colors.normal,2,[6,5]);
    if(m.virtual) line(m.virtual,m.P,'#9d89be',2,[6,5]);
    const phase=progress===null?1:progress,hit=.48;
    const beamModels=multi?[.08,.22,.36,.5,.64,.78,.92].map(model):[m];
    const nextParabolaHit=(P,d,p)=>{const t=(4*p*d[1]-2*P[0]*d[0])/(d[0]*d[0]);return t>1e-5?V.add(P,V.mul(d,t)):null};
    const nextEllipseHit=(P,d,a,b)=>{const A=d[0]*d[0]/(a*a)+d[1]*d[1]/(b*b),B=2*(P[0]*d[0]/(a*a)+P[1]*d[1]/(b*b)),t=-B/A;return V.add(P,V.mul(d,t))};
    const beamPath=beam=>{
      if(beam.kind==='parabola'){
        const throughFocus=V.unit(V.sub(beam.F[0],beam.P)),second=nextParabolaHit(beam.P,throughFocus,beam.p);
        return second?[beam.source,beam.P,second,[second[0],7.4]]:[beam.source,beam.P,V.add(beam.P,V.mul(throughFocus,9))];
      }
      if(beam.kind==='ellipse'){
        const points=[beam.source,beam.P];let P=beam.P,target=beam.F[1];
        for(let bounce=1;bounce<4;bounce++){const d=V.unit(V.sub(target,P));P=nextEllipseHit(P,d,beam.a,beam.b);points.push(P);target=target===beam.F[1]?beam.F[0]:beam.F[1]}
        return points;
      }
      const reflected=V.unit(V.sub(beam.v,V.mul(beam.n,2*V.dot(beam.v,beam.n))));return[beam.source,beam.P,V.add(beam.P,V.mul(reflected,9))];
    };
    const arrow=(a,b,color)=>{const A=to(a),B=to(b),x=A[0]+(B[0]-A[0])*.68,y=A[1]+(B[1]-A[1])*.68,ang=Math.atan2(B[1]-A[1],B[0]-A[0]);ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(-5,-5);ctx.lineTo(-5,5);ctx.closePath();ctx.fill();ctx.restore()};
    const drawBeam=(beam,index)=>{
      const points=beamPath(beam),lengths=points.slice(1).map((p,i)=>V.len(V.sub(p,points[i]))),total=lengths.reduce((a,b)=>a+b,0),travel=phase*total;
      const width=multi?2.6:4,alpha=multi?.78:1;ctx.globalAlpha=alpha;let used=0,particle=points[0];
      for(let i=0;i<lengths.length;i++){if(travel<=used)break;const amount=Math.min(1,(travel-used)/lengths[i]),end=V.add(points[i],V.mul(V.sub(points[i+1],points[i]),amount)),color=i===0?colors.incident:colors.reflected;line(points[i],end,color,width);if(amount>.42)arrow(points[i],end,color);particle=end;used+=lengths[i]}
      if(progress!==null){const z=to(particle);ctx.shadowColor='#ffd08e';ctx.shadowBlur=18;ctx.fillStyle='#fff4bd';ctx.beginPath();ctx.arc(z[0],z[1],multi?4.5:6,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}
      ctx.globalAlpha=1;
    };
    beamModels.forEach(drawBeam);
    const dot=(p,label,color)=>{const z=to(p);ctx.fillStyle='#fff';ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(z[0],z[1],6,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#243a40';ctx.font='700 16px Georgia';ctx.fillText(label,z[0]+10,z[1]-10)};
    m.F.forEach((f,i)=>dot(f,m.F.length===1?'F':`F${i+1}`,colors.focus));dot(m.P,'P',colors.point);
    const reflected=V.unit(V.sub(m.v,V.mul(m.n,2*V.dot(m.v,m.n))));
    const ti=Math.acos(clamp(Math.abs(V.dot(m.v,m.n)),0,1))*180/Math.PI,tr=Math.acos(clamp(Math.abs(V.dot(reflected,m.n)),0,1))*180/Math.PI;
    canvas.dataset.curve=type;canvas.dataset.angleError=Math.abs(ti-tr).toFixed(8);canvas.dataset.animating=String(progress!==null);canvas.dataset.multi=String(multi);
    renderTex(angleBox,`\\theta_i=${ti.toFixed(1)}^\\circ,\\qquad \\theta_r=${tr.toFixed(1)}^\\circ`);
  }
  function updateCopy(){const m=model();title.textContent=m.copy[0];description.textContent=m.copy[1];renderTex(property,m.copy[2]);renderTex(vectorBox,'\\mathbf r=\\mathbf v-2(\\mathbf v\\cdot\\mathbf n)\\mathbf n');draw()}
  function stop(clearMulti=true){cancelAnimationFrame(frame);progress=null;if(clearMulti)multi=false;draw()}
  function launch(useMulti){cancelAnimationFrame(frame);multi=useMulti;const start=performance.now(),duration=3000;const tick=now=>{progress=Math.min(1,(now-start)/duration);draw();if(progress<1)frame=requestAnimationFrame(tick);else{progress=null;draw()}};frame=requestAnimationFrame(tick)}
  document.querySelectorAll('[data-reflection-type-v7]').forEach(b=>b.addEventListener('click',()=>{stop();type=b.dataset.reflectionTypeV7;slider.value='620';document.querySelectorAll('[data-reflection-type-v7]').forEach(x=>x.classList.toggle('active',x===b));updateCopy()}));
  slider.addEventListener('input',()=>{stop();updateCopy()});
  document.querySelector('#reset-ray-v7').addEventListener('click',stop);
  document.querySelector('#fire-ray-v7').addEventListener('click',()=>launch(false));
  document.querySelector('#fire-rays-v7').addEventListener('click',()=>launch(true));
  addEventListener('resize',draw);updateCopy();
})();
