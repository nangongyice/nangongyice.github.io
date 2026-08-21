// ============================================================
// theme.js — 全局主题服务
// 支持 6 套 palette × 3 种显示模式（跟随系统 / 浅色 / 深色）
// 通过在 <html data-palette data-theme> 设置属性驱动 CSS 变量
// 持久化到 localStorage，并防止首屏闪烁（在 <head> 里先跑一段同构逻辑）
// ============================================================

export const PALETTES = [
  { id: 'amber',    name: '琥珀橙', label: 'Amber',    swatch: '#E8552B' },
  { id: 'forest',   name: '墨绿',   label: 'Forest',   swatch: '#2E6454' },
  { id: 'ocean',    name: '深海蓝', label: 'Ocean',    swatch: '#2B5FA0' },
  { id: 'lavender', name: '暮山紫', label: 'Lavender', swatch: '#7B4FB7' },
  { id: 'sakura',   name: '樱粉',   label: 'Sakura',   swatch: '#C94A6C' },
  { id: 'midnight', name: '暗夜',   label: 'Midnight', swatch: '#374151' },
];

export const MODES = [
  { id: 'auto',  name: '跟随系统', icon: 'auto'  },
  { id: 'light', name: '浅色模式', icon: 'sun'   },
  { id: 'dark',  name: '深色模式', icon: 'moon'  },
];

const LS_KEY = 'newpage:theme';
const DEFAULT_PALETTE = 'amber';
const DEFAULT_MODE = 'auto';

const listeners = new Set();
let _current = {
  palette: DEFAULT_PALETTE,
  mode:    DEFAULT_MODE,
  appliedTheme: 'light', // 实际生效的 theme 属性（light/dark）
};

/** 是否浏览器环境 */
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

/** 取系统亮色/暗色偏好 */
function systemPrefersDark() {
  if (!isBrowser) return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches === true;
}

/** 根据 mode 计算实际应用到 [data-theme] 的值 */
function resolveThemeAttr(mode) {
  if (mode === 'dark')  return 'dark';
  if (mode === 'light') return 'light';
  // auto
  return systemPrefersDark() ? 'dark' : 'light';
}

/** 持久化 */
function persist() {
  if (!isBrowser) return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ palette: _current.palette, mode: _current.mode }));
  } catch {}
}

/** 应用到 <html> 属性 */
function applyAttrs() {
  if (!isBrowser) return;
  const root = document.documentElement;
  if (!root) return;
  const applied = resolveThemeAttr(_current.mode);
  root.setAttribute('data-palette', _current.palette);
  root.setAttribute('data-theme',   applied);
  // 给 body 也打上，便于个别组件用 body[data-theme="dark"] 做兜底
  document.body?.setAttribute('data-theme', applied);
  document.body?.setAttribute('data-palette', _current.palette);
  _current.appliedTheme = applied;
}

/** 初始化（读取 localStorage 并应用） */
export function initTheme() {
  if (!isBrowser) return;

  // 读取持久化
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved && typeof saved === 'object') {
        if (PALETTES.some(p => p.id === saved.palette)) _current.palette = saved.palette;
        if (MODES.some(m => m.id === saved.mode))         _current.mode    = saved.mode;
      }
    }
  } catch {}

  applyAttrs();

  // 订阅系统主题变化（仅当 mode=auto 时响应）
  if (window.matchMedia) {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (_current.mode === 'auto') {
        applyAttrs();
        _notify();
      }
    };
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
    } else if (typeof mql.addListener === 'function') {
      mql.addListener(onChange); // 旧 Safari
    }
  }
}

/** 设置色系 */
export function setPalette(paletteId) {
  if (!PALETTES.some(p => p.id === paletteId)) return;
  if (_current.palette === paletteId) return;
  _current.palette = paletteId;
  applyAttrs();
  persist();
  _notify();
}

/** 设置显示模式（auto/light/dark） */
export function setMode(modeId) {
  if (!MODES.some(m => m.id === modeId)) return;
  if (_current.mode === modeId) return;
  _current.mode = modeId;
  applyAttrs();
  persist();
  _notify();
}

/** 重置为默认 */
export function resetTheme() {
  _current.palette = DEFAULT_PALETTE;
  _current.mode    = DEFAULT_MODE;
  applyAttrs();
  persist();
  _notify();
}

/** 获取当前状态（只读拷贝） */
export function getThemeState() {
  return { ..._current };
}

/** 订阅变化 */
export function onThemeChange(fn) {
  if (typeof fn !== 'function') return () => {};
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function _notify() {
  const snap = getThemeState();
  listeners.forEach(fn => {
    try { fn(snap); } catch {}
  });
}
