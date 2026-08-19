// ============================================================
// router.js — 自研 SPA 路由
// - History API + <a data-link> 拦截 + popstate
// - 页面切换调度经 PageTransition
// - 支持共享元素过渡（opts.sharedEl + opts.sharedId）
// ============================================================

import { exitFadeDown, enterFadeUp, unfoldFromCenter, prefersReducedMotion } from '../core/animation.js';
import { disconnectObserver, resetReveal } from '../core/intersection.js';
import { eventBus, EVENTS } from './event-bus.js';
import { PageTransition } from '../components/PageTransition.js';

const routes = new Map();       // pathPattern → view module
const patterns = [];             // 用于按顺序匹配（含动态参数）

/** 注册视图：register({ path: '/', ... }) */
export function register(view) {
  if (!view?.path) throw new Error('view.path required');
  routes.set(view.path, view);
  patterns.push({ view, regex: pathToRegex(view.path), keys: extractKeys(view.path) });
}

/** 注册多个视图 */
export function registerAll(list) { list.forEach(register); }

function pathToRegex(path) {
  const escaped = path.replace(/[.+*?^${}()|[\]\\]/g, c => '\\' + c);
  return new RegExp('^' + escaped.replace(/:([^/]+)/g, (_, k) => `(?<${k}>[^/]+)`) + '$');
}

function extractKeys(path) {
  const keys = [];
  const re = /:([^/]+)/g;
  let m;
  while ((m = re.exec(path)) !== null) keys.push(m[1]);
  return keys;
}

function matchRoute(fullPath) {
  // 允许带 query string
  const [path, search = ''] = fullPath.split('?');
  for (const p of patterns) {
    const match = p.regex.exec(path);
    if (!match) continue;
    const params = match.groups ? { ...match.groups } : {};
    const query = Object.fromEntries(new URLSearchParams(search));
    return { view: p.view, params, query, path, search };
  }
  return null;
}

let currentView = null;
let isTransitioning = false;

/** 跳转：navigate('/course/k01', { sharedEl: cardEl, sharedId: 'cover-k01' }) */
export async function navigate(fullPath, opts = {}) {
  if (isTransitioning) return false;
  const matched = matchRoute(fullPath);
  if (!matched) {
    console.warn('[router] no route for', fullPath);
    return false;
  }
  const { view, params, query, path } = matched;

  // 同路径只处理 hash/scroll
  if (currentView && currentView.path === view.path && !opts.force) {
    return false;
  }
  isTransitioning = true;
  document.body.classList.add('is-routing');

  try {
    // —— 1. 退出动画（旧视图） ——
    const viewEl = document.getElementById('view');
    if (currentView && !prefersReducedMotion()) {
      await exitFadeDown(viewEl, { duration: 350, distance: 30 });
    }

    // —— 2. 清理旧视图 ——
    disconnectObserver();
    if (currentView?.unmount) {
      try { await currentView.unmount(); } catch (err) { console.error('[router] unmount error', err); }
    }
    viewEl.innerHTML = '';
    resetReveal(viewEl);

    // —— 3. 推 history（避免重复 push） ——
    if (opts.pushState !== false && fullPath !== location.pathname + location.search) {
      history.pushState({ path: fullPath }, '', fullPath);
    }

    // —— 4. 数据预取 ——
    let data = {};
    if (view.load) {
      try { data = await view.load({ params, query }) || {}; }
      catch (err) { console.error('[router] load error', err); }
    }

    // —— 5. 挂载新视图（先透明） ——
    viewEl.style.opacity = '0';
    if (view.title) document.title = view.title;
    if (view.mount) await view.mount(viewEl, { params, query, data });
    currentView = view;

    // —— 6. 进入动画 ——
    if (!prefersReducedMotion()) {
      await nextFrame();
      viewEl.style.opacity = '';
      // 共享元素 FLIP（若有）
      if (opts.sharedEl && opts.sharedId) {
        const target = viewEl.querySelector(`[data-shared="${opts.sharedId}"]`);
        if (target) {
          await PageTransition.playShared(opts.sharedEl, target);
        } else {
          await enterFadeUp(viewEl, { duration: 600, distance: 0 });
        }
      } else {
        await unfoldFromCenter(viewEl, { duration: 600 });
        await enterFadeUp(viewEl, { duration: 400, distance: 0 });
      }
    } else {
      viewEl.style.opacity = '';
    }

    // —— 7. 滚动到顶（除非带 hash） ——
    if (!location.hash) window.scrollTo({ top: 0, behavior: 'instant' });
    else {
      // 让目标元素滚动到视口（容错：hash 可能不是合法选择器）
      requestAnimationFrame(() => {
        const hash = location.hash;
        // 仅当 hash 形如 #id 且 id 为合法 HTML id 时才滚动
        const m = /^#([A-Za-z][\w-]*)$/.exec(hash);
        if (m) {
          try {
            document.getElementById(m[1])?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } catch { /* ignore */ }
        }
      });
    }

    eventBus.emit(EVENTS.ROUTE_CHANGED, { path: fullPath, view });
  } finally {
    isTransitioning = false;
    document.body.classList.remove('is-routing');
  }
  return true;
}

function nextFrame() {
  return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
}

/** 启动路由：拦截 <a data-link>、监听 popstate、解析初始 URL */
export function startRouter() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-link]');
    if (!a) return;
    if (a.target === '_blank') return;
    if (a.hasAttribute('download')) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    // 共享元素查找：先按 id，再按 data-shared 属性
    let sharedEl = null;
    const sharedFrom = a.dataset.sharedFrom;
    if (sharedFrom) {
      sharedEl = document.getElementById(sharedFrom)
        || document.querySelector(`[data-shared="${sharedFrom}"]`)
        || a.querySelector(`[data-shared="${sharedFrom}"]`)
        || null;
    }
    navigate(href, {
      sharedEl,
      sharedId: a.dataset.sharedId || null,
    });
  });

  window.addEventListener('popstate', (e) => {
    const path = e.state?.path || location.pathname + location.search;
    navigate(path, { pushState: false, force: true });
  });

  // 初始路由
  const initial = location.pathname + location.search;
  navigate(initial, { pushState: false });
}

export function getCurrentView() { return currentView; }
