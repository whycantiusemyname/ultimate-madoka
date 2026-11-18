const stage = document.querySelector('#viewer-stage');
const guide = document.querySelector('#viewer-guide');
const description = document.querySelector('#viewer-description');
const loadButton = document.querySelector('#load-model');
const progress = document.querySelector('#model-progress');
const actions = document.querySelector('#viewer-actions');
const status = document.querySelector('#viewer-status');
const cameraActions = document.querySelector('#camera-actions');
const baseActions = document.querySelector('#base-controls');
const pedestalButton = document.querySelector('#toggle-pedestal');
const controlsHint = document.querySelector('#viewer-controls-hint');
const editionButtons = [...document.querySelectorAll('[data-edition]')];
const cameraButtons = [...cameraActions.querySelectorAll('button')];

const editions = {
  web: { label: '高精压缩版', file: 'madoka.glb' },
  full: { label: '无损完整版', file: 'madoka-full.glb' },
};
const assetBase = new URL('./assets/', import.meta.url);
const defaultView = { orbit: '0deg 83deg 105%', target: 'auto 2.35m auto', fov: 'auto' };
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const cameraLabels = {
  front: '正面视角', back: '背面视角', left: '左侧视角', right: '右侧视角',
  'upper-front': '正面俯视', 'upper-back': '背面俯视', 'upper-left': '左侧俯视', 'upper-right': '右侧俯视',
  'lower-front': '正面仰视', 'lower-back': '背面仰视', 'lower-left': '左侧仰视', 'lower-right': '右侧仰视',
  'interaction-prompt': '拖动或用方向键旋转，用加号和减号缩放',
};

let viewer;
let edition = 'web';
let savedView = defaultView;
let resetFrame = defaultView;
let component;
let importAttempts = 0;
let lastAnnouncedProgress = -1;
let pedestalMaterials;
let pedestalVisible = false;
let pedestalLoading = false;

function sizeLabel(bytes) {
  return Number.isFinite(bytes) && bytes > 0 ? `${(bytes / 1_000_000).toFixed(2)} MB` : '';
}

function describeEdition() {
  const item = editions[edition];
  description.textContent = `已选${item.label}${item.size ? `（${item.size}）` : ''}。加载后即可旋转与放大。`;
}

const metadata = fetch(new URL('models.json', assetBase))
  .then((response) => response.ok ? response.json() : null)
  .then((models) => {
    for (const [id, item] of Object.entries(editions)) {
      const entry = models?.[id];
      if (typeof entry?.file === 'string' && /^(?:\.\/)?(?:assets\/)?[\w.-]+\.glb$/i.test(entry.file)) {
        item.file = entry.file.split('/').pop();
      }
      item.size = sizeLabel(entry?.bytes);
      const size = document.querySelector(`[data-size="${id}"]`);
      size.textContent = item.size;
      if (item.size) size.parentElement.setAttribute('aria-label', `${item.label}，${item.size}`);
    }
    if (stage.dataset.state === 'idle') describeEdition();
  })
  .catch(() => {});

async function getComponent() {
  if (component) return component;
  const decoder = new URL('./vendor/meshopt_decoder.js', import.meta.url).href;
  window.ModelViewerElement = { ...window.ModelViewerElement, meshoptDecoderLocation: decoder };
  const moduleUrl = new URL('./vendor/model-viewer.min.js', import.meta.url);
  if (importAttempts++) moduleUrl.searchParams.set('retry', String(importAttempts));
  await import(moduleUrl.href);
  component = customElements.get('model-viewer');
  if (!component) throw new Error('model-viewer did not register');
  component.meshoptDecoderLocation = decoder;
  component.modelCacheSize = 2;
  return component;
}

function setState(state) {
  stage.dataset.state = state;
  const loading = state === 'loading';
  const ready = state === 'ready';
  const busy = loading || pedestalLoading;
  guide.hidden = ready;
  progress.hidden = !loading;
  cameraActions.hidden = !ready;
  baseActions.hidden = !ready;
  controlsHint.textContent = ready ? '拖动或用方向键旋转 · 滚轮、捏合或用 ＋ / − 缩放' : '在此选择要加载的模型版本。';
  for (const button of cameraButtons) button.disabled = !ready || busy;
  for (const button of editionButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.edition === edition));
    button.setAttribute('aria-disabled', String(busy));
  }
  loadButton.setAttribute('aria-disabled', String(loading));
  loadButton.firstChild.textContent = { idle: '加载三维模型', loading: '正在载入…', error: '重试加载' }[state] ?? '加载三维模型';
  pedestalButton.setAttribute('aria-pressed', String(pedestalVisible));
  pedestalButton.setAttribute('aria-disabled', String(pedestalLoading));
  pedestalButton.textContent = pedestalLoading ? '加载底座…' : '魔法阵底座';
}

function readCamera(model) {
  return {
    orbit: model.getCameraOrbit().toString(),
    target: model.getCameraTarget().toString(),
    fov: `${model.getFieldOfView()}deg`,
  };
}

function setCamera(model, view, jump = false) {
  model.cameraOrbit = view.orbit;
  model.cameraTarget = view.target;
  model.fieldOfView = view.fov;
  if (jump) model.jumpCameraToGoal();
}

function waitForScene(model) {
  return new Promise((resolve, reject) => {
    const events = new AbortController();
    model.addEventListener('load', () => { events.abort(); resolve(); }, { signal: events.signal });
    model.addEventListener('error', (event) => { events.abort(); reject(event); }, { signal: events.signal });
  });
}

function setPedestalVisibility(visible) {
  for (const { material, mode, color } of pedestalMaterials) {
    material.setAlphaMode(visible ? mode : 'MASK');
    material.pbrMetallicRoughness.setBaseColorFactor(visible ? color : [...color.slice(0, 3), 0]);
  }
  pedestalVisible = visible;
  setState('ready');
  status.textContent = visible ? '已显示魔法阵底座。' : '已隐藏魔法阵底座。';
}

async function showPedestal(model) {
  const previousCamera = readCamera(model);
  const extra = document.createElement('extra-model');
  extra.src = new URL('pedestal.glb', assetBase).href;
  pedestalLoading = true;
  model.inert = true;
  setState('ready');
  status.textContent = '正在加载魔法阵底座。';
  try {
    const changed = waitForScene(model);
    model.append(extra);
    await changed;
    pedestalMaterials = extra.model.materials.map((material) => ({
      material,
      mode: material.getAlphaMode(),
      color: [...material.pbrMetallicRoughness.baseColorFactor],
    }));
    setCamera(model, previousCamera, true);
    setPedestalVisibility(true);
  } catch {
    const restored = waitForScene(model);
    extra.remove();
    try {
      await restored;
      setCamera(model, previousCamera, true);
      status.textContent = '底座加载失败。可以重试。';
    } catch {
      savedView = previousCamera;
      loadError();
    }
    pedestalVisible = false;
  } finally {
    model.inert = false;
    pedestalLoading = false;
    setState(stage.dataset.state);
  }
}

function loadError() {
  const restoreFocus = document.activeElement === viewer;
  viewer?.remove();
  viewer = undefined;
  setState('error');
  description.textContent = `${editions[edition].label}加载失败。可以重试、切换版本或浏览下方图录。`;
  status.textContent = description.textContent;
  if (restoreFocus) loadButton.focus({ preventScroll: true });
}

function updateProgress(event) {
  if (stage.dataset.state !== 'loading') return;
  const total = event.detail?.totalProgress;
  if (!Number.isFinite(total)) return;
  const percent = Math.min(99, Math.max(progress.value, Math.floor(total * 100)));
  if (percent > 0) progress.value = percent;
  const milestone = Math.floor(percent / 25);
  if (milestone <= lastAnnouncedProgress || milestone === 0) return;
  lastAnnouncedProgress = milestone;
  status.textContent = `${editions[edition].label}已加载 ${milestone * 25}%。`;
}

async function loadEdition(id) {
  const state = stage.dataset.state;
  if (pedestalLoading || state === 'loading' || (state === 'ready' && id === edition)) return;
  if (state === 'ready') savedView = readCamera(viewer);
  const restorePedestal = pedestalVisible;
  pedestalVisible = false;
  pedestalMaterials = undefined;
  viewer?.remove();
  viewer = undefined;
  edition = id;
  const item = editions[id];
  setState('loading');
  progress.removeAttribute('value');
  lastAnnouncedProgress = -1;
  description.textContent = `正在加载${item.label}${item.size ? `（${item.size}）` : ''}。`;
  status.textContent = description.textContent;

  try {
    await Promise.all([getComponent(), metadata]);
    const model = document.createElement('model-viewer');
    model.setAttribute('alt', `圆神数字雕塑，${item.label}`);
    model.a11y = cameraLabels;
    model.setAttribute('aria-describedby', 'viewer-controls-hint');
    model.setAttribute('camera-controls', '');
    model.setAttribute('touch-action', 'pan-y');
    model.setAttribute('interaction-prompt', 'none');
    model.setAttribute('environment-image', 'neutral');
    model.setAttribute('loading', 'eager');
    model.setAttribute('reveal', 'manual');
    model.inert = true;
    setCamera(model, savedView);
    model.addEventListener('progress', updateProgress);
    model.addEventListener('error', loadError, { once: true });
    model.addEventListener('load', () => {
      model.removeEventListener('error', loadError);
      const moveFocus = document.activeElement === loadButton;
      setCamera(model, savedView, true);
      setState('ready');
      model.inert = false;
      if (moveFocus) {
        model.tabIndex = -1;
        model.focus({ preventScroll: true });
      }
      model.dismissPoster();
      status.textContent = `${item.label}已加载。可以旋转、缩放或切换模型版本。`;
      if (resetFrame === defaultView) {
        resetFrame = readCamera(model);
      }
      if (restorePedestal) {
        model.updateComplete.then(() => requestAnimationFrame(() => {
          if (viewer === model && !pedestalLoading && !pedestalMaterials) showPedestal(model);
        }));
      }
    }, { once: true });
    model.addEventListener('keydown', (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (['+', '=', '-', '−'].includes(event.key)) {
        event.preventDefault();
        model.zoom(event.key === '+' || event.key === '=' ? 1 : -1);
      }
    });
    viewer = model;
    model.setAttribute('src', new URL(item.file, assetBase).href);
    stage.append(model);
  } catch {
    loadError();
  }
}

loadButton.addEventListener('click', () => loadEdition(edition));
for (const button of editionButtons) {
  button.addEventListener('click', () => {
    const id = button.dataset.edition;
    if (stage.dataset.state === 'idle') {
      edition = id;
      setState('idle');
      describeEdition();
    } else {
      loadEdition(id);
    }
  });
}
pedestalButton.addEventListener('click', () => {
  if (stage.dataset.state !== 'ready' || pedestalLoading) return;
  if (pedestalMaterials) setPedestalVisibility(!pedestalVisible);
  else showPedestal(viewer);
});
document.querySelector('#zoom-out').addEventListener('click', () => viewer?.zoom(-1));
document.querySelector('#zoom-in').addEventListener('click', () => viewer?.zoom(1));
document.querySelector('#reset-view').addEventListener('click', () => {
  if (!viewer) return;
  savedView = resetFrame;
  setCamera(viewer, resetFrame, reduceMotion.matches);
  status.textContent = '已重置视角。';
});

loadButton.hidden = false;
actions.hidden = false;
setState('idle');
describeEdition();
