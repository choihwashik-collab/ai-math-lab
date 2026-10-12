import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const mount = document.querySelector('#cone-three-v5');

if (mount) {
  const renderTex = (element, tex, display = false) => {
    if (window.katex) {
      window.katex.render(tex, element, { throwOnError: false, strict: false, displayMode: display });
    } else {
      element.textContent = tex;
    }
  };

  const colors = {
    ink: 0x172139,
    cone: 0x7d91a3,
    coneLine: 0x637789,
    plane: 0x3daea5,
    curve: 0x00a897,
    sphere: 0xe5a13b,
    violet: 0x6a52bc,
    orange: 0xd56b37,
    light: 0xe8f1f2,
  };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  const initialCamera = new THREE.Vector3(11.2, 7.4, 12.2);
  const initialTarget = new THREE.Vector3(-0.15, 0.4, 0);
  camera.position.copy(initialCamera);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (error) {
    mount.innerHTML = '<p class="cone-webgl-error-v5">3D 화면을 표시할 수 없습니다. 브라우저의 하드웨어 가속 설정을 확인해 주세요.</p>';
    throw error;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  mount.prepend(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(initialTarget);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.minDistance = 7;
  controls.maxDistance = 27;
  controls.maxPolarAngle = Math.PI * 0.94;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x6d8290, 2.25));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.1);
  keyLight.position.set(7, 12, 9);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x9ee8dd, 1.5);
  fillLight.position.set(-8, 2, -7);
  scene.add(fillLight);

  const apexY = 4;
  const coneHeight = 8;
  const slope = 0.5;
  const baseRadius = slope * coneHeight;
  const shift = 1.2;
  const normalLength = Math.sqrt(1 + slope * slope);
  const sphereCenterY = apexY - shift / (2 * slope);
  const sphereRadius = slope * (apexY - sphereCenterY) / normalLength;
  const contactW = apexY - (sphereCenterY + sphereRadius * slope / normalLength);
  const contactY = apexY - contactW;
  const contactRadius = slope * contactW;
  const directrixX = slope * contactW - shift;
  const focus = new THREE.Vector3(
    -sphereRadius / normalLength,
    sphereCenterY - sphereRadius * slope / normalLength,
    0
  );

  const coneGroup = new THREE.Group();
  const sphereGroup = new THREE.Group();
  const proofGroup = new THREE.Group();
  scene.add(coneGroup, sphereGroup, proofGroup);

  const coneMaterial = new THREE.MeshPhysicalMaterial({
    color: colors.cone,
    transparent: true,
    opacity: 0.2,
    roughness: 0.66,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const coneMesh = new THREE.Mesh(new THREE.ConeGeometry(baseRadius, coneHeight, 96, 1, true), coneMaterial);
  coneGroup.add(coneMesh);

  const generatorMaterial = new THREE.LineBasicMaterial({ color: colors.coneLine, transparent: true, opacity: 0.38 });
  for (let i = 0; i < 20; i += 1) {
    const angle = (i / 20) * Math.PI * 2;
    const points = [
      new THREE.Vector3(0, apexY, 0),
      new THREE.Vector3(baseRadius * Math.cos(angle), -4, baseRadius * Math.sin(angle)),
    ];
    coneGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), generatorMaterial));
  }
  const basePoints = [];
  for (let i = 0; i <= 96; i += 1) {
    const angle = (i / 96) * Math.PI * 2;
    basePoints.push(new THREE.Vector3(baseRadius * Math.cos(angle), -4, baseRadius * Math.sin(angle)));
  }
  coneGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(basePoints), new THREE.LineBasicMaterial({ color: colors.coneLine, transparent: true, opacity: 0.7 })));

  const planeWMin = 0.05;
  const planeWMax = 8.5;
  const planeZ = 3.7;
  const planePoint = (w, z) => new THREE.Vector3(slope * w - shift, apexY - w, z);
  const planeVertices = [
    planePoint(planeWMin, -planeZ), planePoint(planeWMax, -planeZ),
    planePoint(planeWMax, planeZ), planePoint(planeWMin, planeZ),
  ];
  const planeGeometry = new THREE.BufferGeometry().setFromPoints(planeVertices);
  planeGeometry.setIndex([0, 1, 2, 0, 2, 3]);
  planeGeometry.computeVertexNormals();
  const cuttingPlane = new THREE.Mesh(planeGeometry, new THREE.MeshPhysicalMaterial({
    color: colors.plane,
    transparent: true,
    opacity: 0.24,
    roughness: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
  }));
  cuttingPlane.renderOrder = 1;
  coneGroup.add(cuttingPlane);

  const tLimit = Math.sqrt(2 * slope * shift * coneHeight - shift * shift);
  const curvePoints = [];
  for (let i = 0; i <= 180; i += 1) {
    const t = -tLimit + (2 * tLimit * i) / 180;
    const w = (t * t + shift * shift) / (2 * slope * shift);
    curvePoints.push(planePoint(w, t));
  }
  const curvePath = new THREE.CatmullRomCurve3(curvePoints);
  const curveGlow = new THREE.Mesh(
    new THREE.TubeGeometry(curvePath, 220, 0.095, 10, false),
    new THREE.MeshBasicMaterial({ color: colors.curve, transparent: true, opacity: 0.19, depthWrite: false })
  );
  const curveTube = new THREE.Mesh(
    new THREE.TubeGeometry(curvePath, 220, 0.047, 10, false),
    new THREE.MeshStandardMaterial({ color: colors.curve, emissive: 0x006c62, emissiveIntensity: 0.42, roughness: 0.32 })
  );
  curveGlow.renderOrder = 3;
  curveTube.renderOrder = 4;
  coneGroup.add(curveGlow, curveTube);

  const parallelGeneratorPoints = [
    new THREE.Vector3(slope * 0.1, apexY - 0.1, 0),
    new THREE.Vector3(slope * 7.8, apexY - 7.8, 0),
  ];
  const parallelGenerator = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(parallelGeneratorPoints),
    new THREE.LineDashedMaterial({ color: colors.violet, dashSize: 0.22, gapSize: 0.12, linewidth: 1 })
  );
  parallelGenerator.computeLineDistances();
  coneGroup.add(parallelGenerator);

  const contactPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(3.25, 6.8),
    new THREE.MeshBasicMaterial({ color: colors.sphere, transparent: true, opacity: 0.075, side: THREE.DoubleSide, depthWrite: false })
  );
  contactPlane.rotation.x = -Math.PI / 2;
  contactPlane.position.y = contactY;
  sphereGroup.add(contactPlane);

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(sphereRadius, 64, 40),
    new THREE.MeshPhysicalMaterial({ color: colors.sphere, transparent: true, opacity: 0.62, roughness: 0.28, metalness: 0.02, depthWrite: false })
  );
  sphere.position.set(0, sphereCenterY, 0);
  sphere.renderOrder = 2;
  sphereGroup.add(sphere);

  const contactCirclePoints = [];
  for (let i = 0; i <= 100; i += 1) {
    const angle = (i / 100) * Math.PI * 2;
    contactCirclePoints.push(new THREE.Vector3(contactRadius * Math.cos(angle), contactY, contactRadius * Math.sin(angle)));
  }
  const contactCircle = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(contactCirclePoints),
    new THREE.LineBasicMaterial({ color: colors.sphere })
  );
  sphereGroup.add(contactCircle);

  const directrixPoints = [
    new THREE.Vector3(directrixX, contactY, -3.35),
    new THREE.Vector3(directrixX, contactY, 3.35),
  ];
  const directrix = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(directrixPoints),
    new THREE.LineDashedMaterial({ color: colors.violet, dashSize: 0.2, gapSize: 0.1 })
  );
  directrix.computeLineDistances();
  sphereGroup.add(directrix);

  const pointGeometry = new THREE.SphereGeometry(0.11, 28, 20);
  const makePoint = (color, radiusScale = 1) => {
    const point = new THREE.Mesh(pointGeometry, new THREE.MeshStandardMaterial({ color, roughness: 0.32 }));
    point.scale.setScalar(radiusScale);
    return point;
  };
  const focusPoint = makePoint(colors.orange, 1.12);
  focusPoint.position.copy(focus);
  sphereGroup.add(focusPoint);

  const pPoint = makePoint(colors.orange, 1.18);
  const aPoint = makePoint(colors.sphere, 0.96);
  const qPoint = makePoint(colors.violet, 0.96);
  proofGroup.add(pPoint, aPoint, qPoint);

  const makeSegment = (color, dashed = false) => {
    if (dashed) {
      const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]);
      const segment = new THREE.Line(geometry, new THREE.LineDashedMaterial({ color, dashSize: 0.14, gapSize: 0.08 }));
      segment.computeLineDistances();
      return segment;
    }
    return new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 1, 12),
      new THREE.MeshStandardMaterial({ color, roughness: 0.38 })
    );
  };
  const pfSegment = makeSegment(colors.orange);
  const paSegment = makeSegment(colors.sphere);
  const pqSegment = makeSegment(colors.violet, true);
  proofGroup.add(pfSegment, paSegment, pqSegment);

  const setSolidSegment = (segment, from, to) => {
    const direction = new THREE.Vector3().subVectors(to, from);
    const length = direction.length();
    segment.position.copy(from).add(to).multiplyScalar(0.5);
    segment.scale.set(1, length, 1);
    segment.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  };
  const setDashedSegment = (segment, from, to) => {
    segment.geometry.dispose();
    segment.geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
    segment.computeLineDistances();
  };

  const labelLayer = mount.querySelector('.cone-label-layer-v5');
  const labels = new Map();
  const addLabel = (name, tex, getPosition, minStep = 1) => {
    const element = document.createElement('span');
    element.className = 'cone-label-v5';
    element.dataset.minStep = String(minStep);
    renderTex(element, tex);
    labelLayer.appendChild(element);
    labels.set(name, { element, getPosition, minStep });
  };

  let currentP = new THREE.Vector3();
  let currentA = new THREE.Vector3();
  let currentQ = new THREE.Vector3();
  addLabel('plane', '\\pi', () => planePoint(6.2, -3.15), 1);
  addLabel('generator', 'g', () => new THREE.Vector3(slope * 5.9, apexY - 5.9, 0), 1);
  addLabel('curve', 'C', () => curvePoints[25], 1);
  addLabel('sphere', 'S', () => new THREE.Vector3(0, sphereCenterY + sphereRadius + 0.26, 0), 2);
  addLabel('contact-plane', '\\sigma', () => new THREE.Vector3(1.2, contactY, -2.2), 2);
  addLabel('directrix', '\\ell', () => new THREE.Vector3(directrixX, contactY, -2.75), 2);
  addLabel('focus', 'F', () => focus, 2);
  addLabel('P', 'P', () => currentP, 3);
  addLabel('A', 'A', () => currentA, 3);
  addLabel('Q', 'Q', () => currentQ, 3);

  const stepCopy = {
    1: {
      title: '생성선과 평행하게 자르기',
      text: '절단평면 π는 원뿔의 생성선 g와 평행합니다. 굵은 청록색 경계선 C가 원뿔과 평면의 공통부분입니다. 화면을 돌려 두 방향이 평행함을 확인하세요.',
      formula: '\\pi\\parallel g,\\qquad C=\\pi\\cap\\mathcal{C}',
    },
    2: {
      title: '단델린 구로 초점과 준선 찾기',
      text: '구 S는 원뿔과 절단평면에 동시에 접합니다. 평면과 닿는 점이 초점 F입니다. 구와 원뿔의 접촉 원이 놓인 평면 σ와 절단평면의 교선이 준선 ℓ입니다.',
      formula: 'F=S\\cap\\pi,\\qquad \\ell=\\sigma\\cap\\pi',
    },
    3: {
      title: '곡선 위의 임의의 점 P 비교하기',
      text: 'A는 P를 지나는 원뿔의 생성선이 구에 닿는 점이고, Q는 P에서 준선 ℓ에 내린 수선의 발입니다. 슬라이더로 P를 움직여 세 길이를 비교하세요.',
      formula: 'PF=PA,\\qquad PA=PQ',
    },
    4: {
      title: '절단 경계선이 포물선임을 결론짓기',
      text: '같은 점 P에서 단델린 구에 그은 두 접선의 길이는 같고, 평행 조건으로 PA와 PQ도 같습니다. 따라서 경계선의 모든 점은 초점과 준선까지의 거리가 같습니다.',
      formula: 'PF=PA=PQ=d(P,\\ell)',
    },
  };

  let currentStep = 1;
  const stepCount = document.querySelector('#cone-step-count-v5');
  const proofTitle = document.querySelector('#cone-proof-title-v5');
  const proofText = document.querySelector('#cone-proof-text-v5');
  const proofFormula = document.querySelector('#cone-proof-formula-v5');
  const distanceValues = document.querySelector('#cone-distance-values-v5');
  const pointSlider = document.querySelector('#cone-point-v5');
  const pointLabel = document.querySelector('#cone-point-label-v5');
  renderTex(pointLabel, 'P');
  renderTex(document.querySelector('#cone-chain-one-v5'), 'PF=PA');
  renderTex(document.querySelector('#cone-chain-two-v5'), 'PA=PQ');
  renderTex(document.querySelector('#cone-chain-three-v5'), 'PF=PQ=d(P,\\ell)');

  const updatePoint = () => {
    const q = Number(pointSlider.value) / 1000;
    const t = -2.35 + 4.7 * q;
    const w = (t * t + shift * shift) / (2 * slope * shift);
    currentP = planePoint(w, t);
    currentQ = planePoint(contactW, t);
    const generatorScale = contactW / w;
    currentA = new THREE.Vector3(
      currentP.x * generatorScale,
      contactY,
      currentP.z * generatorScale
    );
    pPoint.position.copy(currentP);
    aPoint.position.copy(currentA);
    qPoint.position.copy(currentQ);
    setSolidSegment(pfSegment, currentP, focus);
    setSolidSegment(paSegment, currentP, currentA);
    setDashedSegment(pqSegment, currentP, currentQ);

    const pf = currentP.distanceTo(focus);
    const pa = currentP.distanceTo(currentA);
    const pq = currentP.distanceTo(currentQ);
    distanceValues.replaceChildren();
    [['PF', pf], ['PA', pa], ['PQ', pq]].forEach(([name, value]) => {
      const item = document.createElement('span');
      renderTex(item, `${name}=${value.toFixed(3)}`);
      distanceValues.appendChild(item);
    });
  };

  const updateStep = (step) => {
    currentStep = step;
    const copy = stepCopy[step];
    stepCount.textContent = `STEP ${step} / 4`;
    proofTitle.textContent = copy.title;
    proofText.textContent = copy.text;
    renderTex(proofFormula, copy.formula, true);
    sphereGroup.visible = step >= 2;
    proofGroup.visible = step >= 3;
    distanceValues.hidden = step < 3;
    curveTube.material.emissiveIntensity = step === 4 ? 0.85 : 0.42;
    curveGlow.material.opacity = step === 4 ? 0.35 : 0.19;
    document.querySelectorAll('[data-cone-step]').forEach((button) => {
      button.classList.toggle('active', Number(button.dataset.coneStep) === step);
    });
    document.querySelectorAll('.cone-proof-chain-v5 li').forEach((item, index) => {
      const requiredStep = index < 2 ? 3 : 4;
      item.classList.toggle('active', step >= requiredStep);
    });
  };

  document.querySelectorAll('[data-cone-step]').forEach((button) => {
    button.addEventListener('click', () => updateStep(Number(button.dataset.coneStep)));
  });
  pointSlider.addEventListener('input', updatePoint);
  document.querySelector('#cone-reset-view-v5').addEventListener('click', () => {
    camera.position.copy(initialCamera);
    controls.target.copy(initialTarget);
    controls.update();
  });

  const updateLabels = () => {
    const width = mount.clientWidth;
    const height = mount.clientHeight;
    labels.forEach(({ element, getPosition, minStep }) => {
      if (currentStep < minStep) {
        element.hidden = true;
        return;
      }
      const projected = getPosition().clone().project(camera);
      const visible = projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 1.12 && Math.abs(projected.y) < 1.12;
      element.hidden = !visible;
      if (!visible) return;
      element.style.left = `${(projected.x * 0.5 + 0.5) * width}px`;
      element.style.top = `${(-projected.y * 0.5 + 0.5) * height}px`;
    });
  };

  const resize = () => {
    const width = Math.max(320, mount.clientWidth);
    const height = mount.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  new ResizeObserver(resize).observe(mount);
  resize();
  updatePoint();
  updateStep(1);

  const animate = () => {
    controls.update();
    updateLabels();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };
  animate();
}
