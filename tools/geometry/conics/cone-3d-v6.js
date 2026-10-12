import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const mount = document.querySelector('#cone-three-v5');

if (mount) {
  const renderTex = (element, tex, display = false) => {
    if (window.katex) window.katex.render(tex, element, { throwOnError: false, strict: false, displayMode: display });
    else element.textContent = tex;
  };

  const palette = {
    cone: 0x71879a,
    coneLine: 0x5b7184,
    plane: 0x35aaa0,
    curve: 0x00a897,
    gold: 0xe4a13b,
    violet: 0x6a52bc,
    orange: 0xd56b37,
    blue: 0x287fa4,
  };
  const configs = {
    parabola: { m: 0.72, k: 2.4, height: 9, doubleCone: false, camera: [13, 7.6, 14], target: [0, -2.4, 0] },
    ellipse: { m: 1.6, k: 2.7, height: 10, doubleCone: false, camera: [15, 8.4, 16], target: [0, -3.7, 0] },
    hyperbola: { m: 0.22, k: 2.6, height: 11, doubleCone: true, camera: [17, 7.8, 18], target: [0, 0, 0] },
  };
  const typeNames = { parabola: '포물선', ellipse: '타원', hyperbola: '쌍곡선' };
  const slope = 0.72;
  const coneNorm = Math.sqrt(1 + slope * slope);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 120);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (error) {
    mount.innerHTML = '<p class="cone-webgl-error-v5">3D 화면을 표시할 수 없습니다. 브라우저의 하드웨어 가속을 확인해 주세요.</p>';
    throw error;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  mount.prepend(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.minDistance = 8;
  controls.maxDistance = 35;
  controls.maxPolarAngle = Math.PI * 0.96;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x657b8a, 2.35));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(8, 14, 10);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x9ce8de, 1.55);
  fillLight.position.set(-9, 3, -8);
  scene.add(fillLight);

  const labelLayer = mount.querySelector('.cone-label-layer-v5');
  const proofTitle = document.querySelector('#cone-proof-title-v5');
  const proofText = document.querySelector('#cone-proof-text-v5');
  const proofFormula = document.querySelector('#cone-proof-formula-v5');
  const stepCount = document.querySelector('#cone-step-count-v5');
  const distanceValues = document.querySelector('#cone-distance-values-v5');
  const pointSlider = document.querySelector('#cone-point-v5');
  renderTex(document.querySelector('#cone-point-label-v5'), 'P');

  let root = null;
  let state = null;
  let currentType = 'parabola';
  let currentStep = 1;
  let pointsVisible = true;
  const labels = new Map();

  const planePoint = (config, u, z) => new THREE.Vector3(config.m * u - config.k, -u, z);
  const sectionValue = (config, u) => slope * slope * u * u - (config.m * u - config.k) ** 2;

  const makeTube = (points, color, radius = 0.055, closed = false, opacity = 1) => {
    const path = new THREE.CatmullRomCurve3(points, closed);
    return new THREE.Mesh(
      new THREE.TubeGeometry(path, Math.max(120, points.length * 2), radius, 10, closed),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.34, transparent: opacity < 1, opacity, roughness: 0.34, depthWrite: opacity === 1 })
    );
  };

  const makeCone = (height, upper = false) => {
    const material = new THREE.MeshPhysicalMaterial({
      color: palette.cone,
      transparent: true,
      opacity: 0.18,
      roughness: 0.68,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(slope * height, height, 96, 1, true), material);
    mesh.position.y = upper ? height / 2 : -height / 2;
    if (upper) mesh.rotation.z = Math.PI;
    return mesh;
  };

  const makePoint = (color, scale = 1) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 28, 20),
      new THREE.MeshStandardMaterial({ color, roughness: 0.3 })
    );
    mesh.scale.setScalar(scale);
    return mesh;
  };

  const makeSolidSegment = (color) => new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.032, 1, 12),
    new THREE.MeshStandardMaterial({ color, roughness: 0.36 })
  );
  const makeDashedSegment = (color) => {
    const segment = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]),
      new THREE.LineDashedMaterial({ color, dashSize: 0.16, gapSize: 0.09 })
    );
    segment.computeLineDistances();
    return segment;
  };
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

  const addLabel = (key, tex, getPosition, minStep = 1, isPointLabel = false) => {
    const element = document.createElement('span');
    element.className = 'cone-label-v5';
    renderTex(element, tex);
    labelLayer.appendChild(element);
    labels.set(key, { element, getPosition, minStep, isPointLabel });
  };

  const createCurveData = (type, config) => {
    const a = slope * slope - config.m * config.m;
    const b = 2 * config.m * config.k;
    const c = -config.k * config.k;
    if (type === 'parabola') {
      const maxU = config.height * 0.9;
      const zMax = Math.sqrt(Math.max(0, 2 * slope * config.k * maxU - config.k * config.k));
      const points = [];
      for (let i = 0; i <= 260; i += 1) {
        const z = -zMax + (2 * zMax * i) / 260;
        const u = (z * z + config.k * config.k) / (2 * slope * config.k);
        points.push(planePoint(config, u, z));
      }
      return { branches: [{ points, closed: false }], pSamples: points };
    }

    const discriminant = b * b - 4 * a * c;
    const roots = [(-b - Math.sqrt(discriminant)) / (2 * a), (-b + Math.sqrt(discriminant)) / (2 * a)].sort((x, y) => x - y);
    const center = -b / (2 * a);
    const half = Math.abs(roots[1] - roots[0]) / 2;
    if (type === 'ellipse') {
      const points = [];
      for (let i = 0; i < 280; i += 1) {
        const theta = (i / 280) * Math.PI * 2;
        const u = center + half * Math.cos(theta);
        const z = Math.sqrt(-a) * half * Math.sin(theta);
        points.push(planePoint(config, u, z));
      }
      return { branches: [{ points, closed: true }], pSamples: points };
    }

    const positiveLimit = config.height * 0.9;
    const negativeLimit = -config.height * 0.9;
    const positiveV = Math.acosh(Math.max(1, (positiveLimit - center) / half));
    const negativeV = Math.acosh(Math.max(1, (center - negativeLimit) / half));
    const positive = [];
    const negative = [];
    for (let i = 0; i <= 240; i += 1) {
      const v = -positiveV + (2 * positiveV * i) / 240;
      const u = center + half * Math.cosh(v);
      const z = Math.sqrt(a) * half * Math.sinh(v);
      positive.push(planePoint(config, u, z));
    }
    for (let i = 0; i <= 240; i += 1) {
      const v = -negativeV + (2 * negativeV * i) / 240;
      const u = center - half * Math.cosh(v);
      const z = Math.sqrt(a) * half * Math.sinh(v);
      negative.push(planePoint(config, u, z));
    }
    return { branches: [{ points: positive, closed: false }, { points: negative, closed: false }], pSamples: positive };
  };

  const createSphereData = (config) => {
    const planeNorm = Math.sqrt(1 + config.m * config.m);
    const q = slope * planeNorm / coneNorm;
    const signedCenters = [config.k / (config.m + q)];
    if (Math.abs(config.m - q) > 1e-7) signedCenters.push(config.k / (config.m - q));
    return signedCenters.map((u, index) => {
      const radius = slope * Math.abs(u) / coneNorm;
      const center = new THREE.Vector3(0, -u, 0);
      const planeValue = config.k - config.m * u;
      const focus = center.clone().sub(new THREE.Vector3(1, config.m, 0).multiplyScalar(planeValue / (1 + config.m * config.m)));
      const contactU = u / (1 + slope * slope);
      return { index, u, radius, center, focus, contactU, contactY: -contactU, contactRadius: slope * Math.abs(contactU) };
    });
  };

  const buildScene = (type) => {
    if (root) {
      scene.remove(root);
      root.traverse((object) => {
        object.geometry?.dispose?.();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else object.material?.dispose?.();
      });
    }
    labels.clear();
    labelLayer.replaceChildren();
    root = new THREE.Group();
    scene.add(root);

    const config = configs[type];
    const baseGroup = new THREE.Group();
    const sphereGroup = new THREE.Group();
    const proofGroup = new THREE.Group();
    root.add(baseGroup, sphereGroup, proofGroup);

    baseGroup.add(makeCone(config.height, false));
    if (config.doubleCone) baseGroup.add(makeCone(config.height, true));

    const generatorUMin = config.doubleCone ? -config.height * 0.96 : 0.08;
    const generatorPoints = [
      new THREE.Vector3(slope * generatorUMin, -generatorUMin, 0),
      new THREE.Vector3(slope * config.height * 0.96, -config.height * 0.96, 0),
    ];
    const generator = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(generatorPoints),
      new THREE.LineDashedMaterial({ color: palette.violet, dashSize: 0.26, gapSize: 0.13 })
    );
    generator.computeLineDistances();
    baseGroup.add(generator);

    const planeUMin = config.doubleCone ? -config.height * 0.98 : 0.04;
    const planeUMax = config.height * 0.98;
    const zExtent = config.height * 0.66;
    const planeVertices = [
      planePoint(config, planeUMin, -zExtent), planePoint(config, planeUMax, -zExtent),
      planePoint(config, planeUMax, zExtent), planePoint(config, planeUMin, zExtent),
    ];
    const planeGeometry = new THREE.BufferGeometry().setFromPoints(planeVertices);
    planeGeometry.setIndex([0, 1, 2, 0, 2, 3]);
    planeGeometry.computeVertexNormals();
    baseGroup.add(new THREE.Mesh(planeGeometry, new THREE.MeshPhysicalMaterial({
      color: palette.plane, transparent: true, opacity: 0.22, roughness: 0.58,
      side: THREE.DoubleSide, depthWrite: false,
    })));

    const curveData = createCurveData(type, config);
    const curveMeshes = [];
    curveData.branches.forEach(({ points, closed }) => {
      const glow = makeTube(points, palette.curve, 0.12, closed, 0.18);
      const line = makeTube(points, palette.curve, 0.058, closed, 1);
      baseGroup.add(glow, line);
      curveMeshes.push({ glow, line });
    });

    const spheres = createSphereData(config);
    const focusPoints = [];
    spheres.forEach((sphereData, index) => {
      const sphereColor = index === 0 ? palette.gold : palette.blue;
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(sphereData.radius, 64, 42),
        new THREE.MeshPhysicalMaterial({ color: sphereColor, transparent: true, opacity: 0.72, roughness: 0.26, depthWrite: false })
      );
      sphere.position.copy(sphereData.center);
      sphereGroup.add(sphere);

      const circlePoints = [];
      for (let i = 0; i <= 110; i += 1) {
        const angle = (i / 110) * Math.PI * 2;
        circlePoints.push(new THREE.Vector3(
          sphereData.contactRadius * Math.cos(angle), sphereData.contactY,
          sphereData.contactRadius * Math.sin(angle)
        ));
      }
      sphereGroup.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(circlePoints),
        new THREE.LineBasicMaterial({ color: sphereColor })
      ));
      const focusPoint = makePoint(index === 0 ? palette.orange : palette.violet, 1.14);
      focusPoint.position.copy(sphereData.focus);
      sphereGroup.add(focusPoint);
      focusPoints.push(focusPoint);

      const contactPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(Math.min(config.height * 0.72, 7), Math.min(config.height * 1.1, 12)),
        new THREE.MeshBasicMaterial({ color: sphereColor, transparent: true, opacity: 0.045, side: THREE.DoubleSide, depthWrite: false })
      );
      contactPlane.rotation.x = -Math.PI / 2;
      contactPlane.position.y = sphereData.contactY;
      sphereGroup.add(contactPlane);
    });

    let directrix = null;
    let directrixPoint = null;
    if (type === 'parabola') {
      const contactU = spheres[0].contactU;
      directrixPoint = planePoint(config, contactU, 0);
      const directrixPoints = [planePoint(config, contactU, -zExtent * 0.76), planePoint(config, contactU, zExtent * 0.76)];
      directrix = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(directrixPoints),
        new THREE.LineDashedMaterial({ color: palette.violet, dashSize: 0.22, gapSize: 0.11 })
      );
      directrix.computeLineDistances();
      sphereGroup.add(directrix);
    }

    const pPoint = makePoint(palette.orange, 1.22);
    proofGroup.add(pPoint);
    const aPoints = spheres.map((sphereData, index) => {
      const point = makePoint(index === 0 ? palette.gold : palette.blue, 1);
      proofGroup.add(point);
      return point;
    });
    const qPoint = type === 'parabola' ? makePoint(palette.violet, 1) : null;
    if (qPoint) proofGroup.add(qPoint);

    const pfSegments = spheres.map((sphereData, index) => {
      const segment = makeSolidSegment(index === 0 ? palette.orange : palette.violet);
      proofGroup.add(segment);
      return segment;
    });
    const paSegments = spheres.map((sphereData, index) => {
      const segment = makeDashedSegment(index === 0 ? palette.gold : palette.blue);
      proofGroup.add(segment);
      return segment;
    });
    const pqSegment = type === 'parabola' ? makeDashedSegment(palette.violet) : null;
    if (pqSegment) proofGroup.add(pqSegment);

    const dynamic = { P: new THREE.Vector3(), A: spheres.map(() => new THREE.Vector3()), Q: new THREE.Vector3() };
    addLabel('plane', '\\pi', () => planePoint(config, config.doubleCone ? -config.height * 0.55 : config.height * 0.68, -zExtent * 0.72), 1);
    addLabel('generator', 'g', () => new THREE.Vector3(slope * config.height * 0.58, -config.height * 0.58, 0), 1);
    addLabel('curve', 'C', () => curveData.branches[0].points[Math.floor(curveData.branches[0].points.length * 0.16)], 1);
    spheres.forEach((sphereData, index) => {
      const sub = spheres.length > 1 ? `_${index + 1}` : '';
      addLabel(`sphere-${index}`, `S${sub}`, () => sphereData.center.clone().add(new THREE.Vector3(
        sphereData.radius * 0.72,
        (sphereData.u < 0 ? -1 : 1) * sphereData.radius * 0.24,
        0
      )), 2);
      addLabel(`focus-${index}`, `F${sub}`, () => sphereData.focus, 2, true);
      addLabel(`sigma-${index}`, `\\sigma${sub}`, () => new THREE.Vector3(1.15, sphereData.contactY, -2.15), 2);
      addLabel(`A-${index}`, `A${sub}`, () => dynamic.A[index], 3, true);
    });
    if (type === 'parabola') addLabel('directrix', '\\ell', () => directrixPoint.clone().add(new THREE.Vector3(0, 0, -zExtent * 0.62)), 2);
    addLabel('P', 'P', () => dynamic.P, 3, true);
    if (type === 'parabola') addLabel('Q', 'Q', () => dynamic.Q, 3, true);

    state = {
      type, config, baseGroup, sphereGroup, proofGroup, curveData, curveMeshes, spheres,
      pPoint, aPoints, qPoint, focusPoints, pfSegments, paSegments, pqSegment, dynamic,
    };
    updatePoint();
    applyPointVisibility();
  };

  const copyFor = (type, step) => {
    if (type === 'parabola') return {
      1: ['생성선과 평행하게 자르기', '절단평면 π가 생성선 g와 평행할 때 한쪽 원뿔에 열린 경계선 C가 생깁니다.', '\\alpha=\\beta,\\qquad C=\\pi\\cap\\mathcal C'],
      2: ['한 개의 구로 초점과 준선 찾기', '확대된 단델린 구 S는 원뿔과 π에 동시에 접합니다. π와의 접점이 F이고, 접촉원 평면 σ와 π의 교선이 준선 ℓ입니다.', 'F=S\\cap\\pi,\\qquad \\ell=\\sigma\\cap\\pi'],
      3: ['세 거리 비교하기', 'A는 P를 지나는 생성선과 구의 접점, Q는 준선에 내린 수선의 발입니다. P를 움직여 세 길이를 비교하세요.', 'PF=PA,\\qquad PA=PQ'],
      4: ['포물선의 정의 완성', '같은 점에서 구에 그은 접선과 평행 조건을 연결하면 경계선의 모든 점이 초점과 준선에서 같은 거리에 있습니다.', 'PF=PA=PQ=d(P,\\ell)'],
    }[step];
    if (type === 'ellipse') return {
      1: ['한쪽 원뿔을 비스듬히 자르기', '절단평면 π가 생성선보다 완만하여 한쪽 원뿔만 만나면 닫힌 경계선 C가 생깁니다.', '\\alpha>\\beta,\\qquad C=\\pi\\cap\\mathcal C'],
      2: ['두 단델린 구와 두 초점', 'π의 양쪽에서 원뿔과 π에 동시에 접하는 두 구를 넣습니다. 평면과의 접점 F₁, F₂가 타원의 두 초점입니다.', 'F_1=S_1\\cap\\pi,\\qquad F_2=S_2\\cap\\pi'],
      3: ['네 접선 길이 비교하기', 'P에서 각 구에 그은 두 접선의 길이가 같습니다. A₁, A₂는 P를 지나는 같은 생성선 위의 접점입니다.', 'PF_1=PA_1,\\qquad PF_2=PA_2'],
      4: ['타원의 거리 합 완성', 'P가 A₁과 A₂ 사이를 움직여도 A₁A₂는 일정합니다. 따라서 두 초점까지 거리의 합이 일정합니다.', 'PF_1+PF_2=PA_1+PA_2=A_1A_2'],
    }[step];
    return {
      1: ['양쪽 원뿔을 가로질러 자르기', '절단평면 π가 생성선보다 가파르면 위아래 원뿔을 모두 만나 두 갈래 경계선 C가 생깁니다.', '\\alpha<\\beta,\\qquad C=\\pi\\cap\\mathcal C'],
      2: ['양쪽 원뿔의 두 단델린 구', '각 원뿔 안에서 π와 접하는 두 구를 넣습니다. 두 접점 F₁, F₂가 쌍곡선의 초점입니다.', 'F_1=S_1\\cap\\pi,\\qquad F_2=S_2\\cap\\pi'],
      3: ['두 쌍의 접선 길이 비교하기', 'P에서 각 구에 그은 접선 길이가 각각 같습니다. A₁, A₂는 같은 생성선의 양쪽 연장 위 접점입니다.', 'PF_1=PA_1,\\qquad PF_2=PA_2'],
      4: ['쌍곡선의 거리 차 완성', '같은 생성선 위의 A₁A₂는 일정하므로 두 초점까지 거리의 차가 일정합니다.', '|PF_1-PF_2|=|PA_1-PA_2|=A_1A_2'],
    }[step];
  };

  function updatePoint() {
    if (!state) return;
    const q = Number(pointSlider.value) / 1000;
    const sampleIndex = Math.min(state.curveData.pSamples.length - 1, Math.round(q * (state.curveData.pSamples.length - 1)));
    const p = state.curveData.pSamples[sampleIndex].clone();
    const u = -p.y;
    state.dynamic.P.copy(p);
    state.pPoint.position.copy(p);

    const focusDistances = [];
    const tangentDistances = [];
    state.spheres.forEach((sphereData, index) => {
      const scale = sphereData.contactU / u;
      const a = new THREE.Vector3(p.x * scale, -sphereData.contactU, p.z * scale);
      state.dynamic.A[index].copy(a);
      state.aPoints[index].position.copy(a);
      setSolidSegment(state.pfSegments[index], p, sphereData.focus);
      setDashedSegment(state.paSegments[index], p, a);
      focusDistances.push(p.distanceTo(sphereData.focus));
      tangentDistances.push(p.distanceTo(a));
    });

    if (state.type === 'parabola') {
      const contactU = state.spheres[0].contactU;
      const qPoint = planePoint(state.config, contactU, p.z);
      state.dynamic.Q.copy(qPoint);
      state.qPoint.position.copy(qPoint);
      setDashedSegment(state.pqSegment, p, qPoint);
    }

    distanceValues.replaceChildren();
    const addValue = (tex) => {
      const element = document.createElement('span');
      renderTex(element, tex);
      distanceValues.appendChild(element);
    };
    if (state.type === 'parabola') {
      const pq = p.distanceTo(state.dynamic.Q);
      addValue(`PF=${focusDistances[0].toFixed(3)}`);
      addValue(`PA=${tangentDistances[0].toFixed(3)}`);
      addValue(`PQ=${pq.toFixed(3)}`);
    } else {
      addValue(`PF_1=PA_1=${focusDistances[0].toFixed(3)}`);
      addValue(`PF_2=PA_2=${focusDistances[1].toFixed(3)}`);
      const result = state.type === 'ellipse'
        ? focusDistances[0] + focusDistances[1]
        : Math.abs(focusDistances[0] - focusDistances[1]);
      const symbol = state.type === 'ellipse' ? 'PF_1+PF_2' : '|PF_1-PF_2|';
      addValue(`${symbol}=${result.toFixed(3)}`);
    }
  }

  const updateProofChain = () => {
    const chain = [
      document.querySelector('#cone-chain-one-v5'),
      document.querySelector('#cone-chain-two-v5'),
      document.querySelector('#cone-chain-three-v5'),
    ];
    if (currentType === 'parabola') {
      renderTex(chain[0], 'PF=PA');
      renderTex(chain[1], 'PA=PQ');
      renderTex(chain[2], 'PF=PQ=d(P,\\ell)');
    } else if (currentType === 'ellipse') {
      renderTex(chain[0], 'PF_1=PA_1,\\;PF_2=PA_2');
      renderTex(chain[1], 'PA_1+PA_2=A_1A_2');
      renderTex(chain[2], 'PF_1+PF_2=\\text{constant}');
    } else {
      renderTex(chain[0], 'PF_1=PA_1,\\;PF_2=PA_2');
      renderTex(chain[1], '|PA_1-PA_2|=A_1A_2');
      renderTex(chain[2], '|PF_1-PF_2|=\\text{constant}');
    }
    const headings = document.querySelectorAll('.cone-proof-chain-v5 li b');
    headings[0].textContent = '① 같은 점에서 구에 그은 접선';
    headings[1].textContent = currentType === 'parabola' ? '② 평행 조건으로 얻는 같은 길이' : '② 같은 생성선 위의 고정된 접점';
    headings[2].textContent = `③ ${typeNames[currentType]}의 정의`;
  };

  const updateStep = (step) => {
    currentStep = step;
    const [title, text, formula] = copyFor(currentType, step);
    stepCount.textContent = `STEP ${step} / 4 · ${typeNames[currentType]}`;
    proofTitle.textContent = title;
    proofText.textContent = text;
    renderTex(proofFormula, formula, true);
    state.sphereGroup.visible = step >= 2;
    state.proofGroup.visible = step >= 3;
    distanceValues.hidden = step < 3;
    state.curveMeshes.forEach(({ glow, line }) => {
      glow.material.opacity = step === 4 ? 0.36 : 0.18;
      line.material.emissiveIntensity = step === 4 ? 0.82 : 0.34;
    });
    document.querySelectorAll('[data-cone-step]').forEach((button) => button.classList.toggle('active', Number(button.dataset.coneStep) === step));
    document.querySelectorAll('.cone-proof-chain-v5 li').forEach((item, index) => item.classList.toggle('active', step >= (index < 2 ? 3 : 4)));
  };

  const resetCamera = () => {
    const config = configs[currentType];
    camera.position.set(...config.camera);
    controls.target.set(...config.target);
    controls.update();
  };

  function applyPointVisibility() {
    if (!state) return;
    const visibilityToggle = document.querySelector('#cone-toggle-points-v6');
    pointsVisible = visibilityToggle.checked;
    state.focusPoints.forEach((point) => { point.visible = pointsVisible; });
    state.pPoint.visible = pointsVisible;
    state.aPoints.forEach((point) => { point.visible = pointsVisible; });
    if (state.qPoint) state.qPoint.visible = pointsVisible;
    document.querySelector('#cone-toggle-state-v7').textContent = pointsVisible ? '표시' : '숨김';
  }

  const selectType = (type) => {
    currentType = type;
    pointSlider.value = '620';
    document.querySelectorAll('[data-cone-type-v6]').forEach((button) => button.classList.toggle('active', button.dataset.coneTypeV6 === type));
    const stepTwoButton = document.querySelector('[data-cone-step="2"]');
    stepTwoButton.textContent = type === 'parabola' ? '2 초점·준선' : '2 두 초점';
    document.querySelector('[data-cone-step="3"]').textContent = type === 'parabola' ? '3 거리 비교' : '3 접선 길이';
    buildScene(type);
    updateProofChain();
    updateStep(1);
    resetCamera();
  };

  document.querySelectorAll('[data-cone-type-v6]').forEach((button) => button.addEventListener('click', () => selectType(button.dataset.coneTypeV6)));
  document.querySelectorAll('[data-cone-step]').forEach((button) => button.addEventListener('click', () => updateStep(Number(button.dataset.coneStep))));
  pointSlider.addEventListener('input', updatePoint);
  document.querySelector('#cone-reset-view-v5').addEventListener('click', resetCamera);
  document.querySelector('#cone-toggle-points-v6').addEventListener('change', applyPointVisibility);

  const updateLabels = () => {
    const width = mount.clientWidth;
    const height = mount.clientHeight;
    labels.forEach(({ element, getPosition, minStep }) => {
      if (currentStep < minStep || !pointsVisible) { element.hidden = true; return; }
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
  selectType('parabola');

  const animate = () => {
    controls.update();
    updateLabels();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };
  animate();
}
