(() => {
  const render = (element, tex) => {
    if (window.katex) {
      window.katex.render(tex, element, {
        throwOnError: false,
        strict: false,
      });
    } else {
      element.textContent = tex;
    }
  };

  const optionX = document.querySelector('#directrix-axis-v4 option[value="x"]');
  const optionY = document.querySelector('#directrix-axis-v4 option[value="y"]');
  if (optionX) optionX.textContent = '세로 준선';
  if (optionY) optionY.textContent = '가로 준선';

  const presetMath = {
    right: ['기본형', 'y^2=4x'],
    left: ['왼쪽', 'y^2=-4x'],
    up: ['위쪽', 'x^2=4y'],
    down: ['아래쪽', 'x^2=-4y'],
  };

  document.querySelectorAll('[data-preset-v4]').forEach((button) => {
    const [label, tex] = presetMath[button.dataset.presetV4];
    button.innerHTML = `<span>${label}</span><span class="preset-tex-v4"></span>`;
    render(button.querySelector('.preset-tex-v4'), tex);
  });

  const ellipsePresetMath = {
    horizontal: ['가로형', '\\frac{x^2}{25}+\\frac{y^2}{9}=1'],
    vertical: ['세로형', '\\frac{x^2}{9}+\\frac{y^2}{25}=1'],
    circle: ['원형', '\\frac{x^2}{16}+\\frac{y^2}{16}=1'],
  };
  const hyperbolaPresetMath = {
    horizontal: ['좌우형', '\\frac{x^2}{9}-\\frac{y^2}{4}=1'],
    vertical: ['상하형', '\\frac{y^2}{9}-\\frac{x^2}{4}=1'],
    wide: ['넓은 가지', '\\frac{x^2}{4}-\\frac{y^2}{16}=1'],
  };

  const renderPreset = (button, entry) => {
    const [label, tex] = entry;
    button.innerHTML = `<span>${label}</span><span class="preset-tex-v4"></span>`;
    render(button.querySelector('.preset-tex-v4'), tex);
  };
  document.querySelectorAll('[data-ellipse-preset-v4]').forEach((button) => {
    renderPreset(button, ellipsePresetMath[button.dataset.ellipsePresetV4]);
  });
  document.querySelectorAll('[data-hyperbola-preset-v4]').forEach((button) => {
    renderPreset(button, hyperbolaPresetMath[button.dataset.hyperbolaPresetV4]);
  });
  document.querySelectorAll('[data-math-v4]').forEach((element) => {
    render(element, element.dataset.mathV4);
  });

  const target = document.querySelector('#definition-text');
  if (!target) return;
  const focusDirectrix = document.querySelector('#focus-directrix');
  const tangentText = document.querySelector('#tangent-text');
  let polishing = false;

  const mathSpan = (tex) => {
    const element = document.createElement('span');
    element.className = 'inline-math-v4';
    render(element, tex);
    return element;
  };

  const polishDefinition = () => {
    if (polishing) return;
    polishing = true;
    const active = document.querySelector('.curve-choice.active')?.dataset.curve;
    target.replaceChildren();

    if (active === 'parabola') {
      const fx = document.querySelector('#focus-x-v4')?.value ?? '1';
      const fy = document.querySelector('#focus-y-v4')?.value ?? '0';
      const d = document.querySelector('#directrix-value-v4')?.value ?? '-1';
      const axis = document.querySelector('#directrix-axis-v4')?.value ?? 'x';
      target.append(
        '초점 ', mathSpan(`F(${fx},${fy})`),
        '와 준선 ', mathSpan(`${axis}=${d}`),
        '까지의 거리가 같은 점 ', mathSpan('P'), '의 자취'
      );
    } else if (active === 'ellipse') {
      const a = Number(document.querySelector('#ellipse-a-v4')?.value ?? 5);
      const b = Number(document.querySelector('#ellipse-b-v4')?.value ?? 3);
      const majorSymbol = a >= b ? 'a' : 'b';
      target.append(
        '두 초점 ', mathSpan('F_1'), ', ', mathSpan('F_2'),
        '까지 거리의 합이 ', mathSpan(`2${majorSymbol}`),
        '로 일정한 점 ', mathSpan('P'), '의 자취'
      );
    } else {
      const axis = document.querySelector('#hyperbola-axis-v4')?.value ?? 'x';
      const majorSymbol = axis === 'x' ? 'a' : 'b';
      target.append(
        '두 초점 ', mathSpan('F_1'), ', ', mathSpan('F_2'),
        '까지 거리의 차가 ', mathSpan(`2${majorSymbol}`),
        '로 일정한 점 ', mathSpan('P'), '의 자취'
      );
    }

    if (focusDirectrix) {
      focusDirectrix.replaceChildren();
      if (active === 'parabola') {
        focusDirectrix.append(
          '포물선은 초점과 준선까지의 거리가 같습니다. 이심률은 ',
          mathSpan('e=1'), '입니다.'
        );
      } else if (active === 'ellipse') {
        focusDirectrix.append(
          '타원은 두 초점까지 거리의 합이 일정합니다. 이심률은 ',
          mathSpan('0<e<1'), '입니다.'
        );
      } else {
        focusDirectrix.append(
          '쌍곡선은 두 초점까지 거리의 차가 일정합니다. 이심률은 ',
          mathSpan('e>1'), '입니다.'
        );
      }
    }

    if (tangentText) {
      tangentText.replaceChildren();
      if (active === 'parabola') {
        tangentText.append(
          '곡선 위의 점 ', mathSpan('P(pt^2,2pt)'),
          '에서 접선의 방정식을 위와 같이 정리할 수 있습니다.'
        );
      } else if (active === 'ellipse') {
        tangentText.append(
          '곡선 위의 점 ', mathSpan('P(x_0,y_0)'),
          '에서 접선의 방정식을 위와 같이 정리할 수 있습니다.'
        );
      } else {
        tangentText.append(
          '곡선 위의 점 ', mathSpan('P(x_0,y_0)'),
          '에서 접선의 방정식을 위와 같이 정리할 수 있습니다.'
        );
      }
    }
    polishing = false;
  };

  const observer = new MutationObserver(() => {
    if (!polishing && !target.querySelector('.katex')) {
      requestAnimationFrame(polishDefinition);
    }
  });
  observer.observe(target, { childList: true, subtree: true, characterData: true });

  document.querySelectorAll('.curve-choice').forEach((element) => {
    element.addEventListener('click', () => requestAnimationFrame(polishDefinition));
  });
  document.querySelectorAll('.parameter-panel-v4 input, .parameter-panel-v4 select').forEach((element) => {
    element.addEventListener('input', () => requestAnimationFrame(polishDefinition));
  });
  document.querySelectorAll('[data-ellipse-preset-v4], [data-hyperbola-preset-v4]').forEach((element) => {
    element.addEventListener('click', () => requestAnimationFrame(polishDefinition));
  });
  polishDefinition();
})();
