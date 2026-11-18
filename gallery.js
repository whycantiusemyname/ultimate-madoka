const stage = document.querySelector('#viewer-stage');
const guide = document.querySelector('#viewer-guide');
const description = document.querySelector('#viewer-description');
const loadButton = document.querySelector('#load-model');
const progress = document.querySelector('#model-progress');
const actions = document.querySelector('#viewer-actions');
const status = document.querySelector('#viewer-status');
const editionButtons = [...document.querySelectorAll('[data-edition]')];
const cameraButtons = [...actions.querySelectorAll('.viewer-controls button')];

const editions = {
  web: { label: '网页版', file: 'madoka.glb' },
  full: { label: '完整版', file: 'madoka-full.glb' },
};
const assetBase = new URL('./assets/', import.meta.url);
const defaultView = { orbit: '0deg 83deg 94%', target: 'auto auto auto', fov: 'auto' };
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
let component;
let importAttempts = 0;
let lastAnnouncedProgress = -1;

function sizeLabel(bytes) {
  return Number.isFinite(bytes) && bytes > 0 ? `约 ${Math.ceil(bytes / 1_000_000)} MB` : '';
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
    if (stage.dataset.state === 'idle' && editions.web.size) {
      description.textContent = `加载网页版模型（${editions.web.size}），即可旋转与放大。`;
    }
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
  component.modelCacheSize = 1;
  return component;
}

function setState(state) {
  stage.dataset.state = state;
  const loading = state === 'loading';
  const ready = state === 'ready';
  guide.hidden = ready;
  progress.hidden = !loading;
  actions.hidden = state === 'idle';
  for (const button of cameraButtons) button.disabled = !ready;
  for (const button of editionButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.edition === edition));
    button.setAttribute('aria-disabled', String(loading));
  }
  loadButton.setAttribute('aria-disabled', String(loading));
  loadButton.firstChild.textContent = loading ? '正在载入…' : '重试加载';
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
  if (state === 'loading' || (state === 'ready' && id === edition)) return;
  if (state === 'ready') savedView = readCamera(viewer);
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
  button.addEventListener('click', () => loadEdition(button.dataset.edition));
}
document.querySelector('#zoom-out').addEventListener('click', () => viewer?.zoom(-1));
document.querySelector('#zoom-in').addEventListener('click', () => viewer?.zoom(1));
document.querySelector('#reset-view').addEventListener('click', () => {
  if (!viewer) return;
  savedView = defaultView;
  setCamera(viewer, defaultView, reduceMotion.matches);
  status.textContent = '已重置视角。';
});

loadButton.hidden = false;
