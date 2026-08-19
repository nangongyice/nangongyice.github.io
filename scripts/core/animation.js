// ============================================================
// animation.js — rAF 队列 / FLIP / 缓动
// ============================================================

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * 通用缓动函数集合
 */
export const easing = {
  linear:   (t) => t,
  easeOut:  (t) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
  easeSpring:  (t) => {
    // 轻微回弹
    const c = 1.56;
    const d = c - 1;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + d * Math.pow(t - 1, 2);
  },
};

/**
 * 基于 requestAnimationFrame 的 tween
 * @param {number} duration - ms
 * @param {(t:number)=>void} onUpdate - 每帧调用，t∈[0,1]
 * @param {keyof typeof easing} [ease='easeOut']
 * @returns {Promise<void>}
 */
export function tween(duration, onUpdate, ease = 'easeOut') {
  if (prefersReducedMotion() || duration <= 0) {
    onUpdate(1);
    return Promise.resolve();
  }
  const easeFn = easing[ease] || easing.easeOut;
  return new Promise(resolve => {
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      onUpdate(easeFn(t));
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
}

/**
 * FLIP 动画
 * @param {HTMLElement} el
 * @param {Function} mutate - 触发布局变化的操作
 * @param {Object} [opts]
 * @param {number} [opts.duration=450]
 * @param {string} [opts.ease='easeOut']
 * @param {string} [opts.transformOrigin='center']
 */
export async function flip(el, mutate, opts = {}) {
  if (!el) return;
  const { duration = 450, ease = 'easeOut', transformOrigin = 'center' } = opts;
  const firstRect = el.getBoundingClientRect();
  mutate();
  const lastRect = el.getBoundingClientRect();
  const dx = firstRect.left - lastRect.left;
  const dy = firstRect.top - lastRect.top;
  const sx = firstRect.width / (lastRect.width || 1);
  const sy = firstRect.height / (lastRect.height || 1);
  if (dx === 0 && dy === 0 && sx === 1 && sy === 1) return;

  el.style.transformOrigin = transformOrigin;
  el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
  el.style.willChange = 'transform';
  await nextFrameSafe();
  el.style.transition = `transform ${duration}ms var(--ease-${ease}, ${easing[ease] ? '' : ''})`;
  el.style.transition = `transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`;
  el.style.transform = '';
  return new Promise(resolve => {
    const handler = () => {
      el.style.transition = '';
      el.style.transform = '';
      el.style.transformOrigin = '';
      el.style.willChange = '';
      el.removeEventListener('transitionend', handler);
      resolve();
    };
    el.addEventListener('transitionend', handler, { once: true });
    setTimeout(handler, duration + 200); // 兜底
  });
}

function nextFrameSafe() {
  return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
}

/**
 * 元素入场：opacity 0 + translateY → 1 + 0
 */
export async function enterFadeUp(el, opts = {}) {
  if (!el) return;
  const { distance = 30, duration = 600, delay = 0, ease = 'easeOut' } = opts;
  if (prefersReducedMotion()) {
    el.style.opacity = '1';
    return;
  }
  el.style.opacity = '0';
  el.style.transform = `translateY(${distance}px)`;
  el.style.willChange = 'opacity, transform';
  await nextFrameSafe();
  if (delay) await new Promise(r => setTimeout(r, delay));
  el.style.transition = `opacity ${duration}ms var(--ease-${ease}), transform ${duration}ms var(--ease-${ease})`;
  el.style.transition = `opacity ${duration}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`;
  el.style.opacity = '1';
  el.style.transform = '';
  return new Promise(resolve => {
    const handler = () => {
      el.style.transition = '';
      el.style.transform = '';
      el.style.willChange = '';
      el.removeEventListener('transitionend', handler);
      resolve();
    };
    el.addEventListener('transitionend', handler, { once: true });
    setTimeout(handler, duration + 200);
  });
}

/**
 * 元素离场：opacity 1 → 0 + translateY
 */
export async function exitFadeDown(el, opts = {}) {
  if (!el) return;
  const { distance = 40, duration = 350, ease = 'easeOut' } = opts;
  if (prefersReducedMotion()) { el.style.opacity = '0'; return; }
  el.style.willChange = 'opacity, transform';
  el.style.transition = `opacity ${duration}ms var(--ease-${ease}), transform ${duration}ms var(--ease-${ease})`;
  el.style.transition = `opacity ${duration}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`;
  el.style.opacity = '0';
  el.style.transform = `translateY(-${distance}px)`;
  return new Promise(resolve => {
    const handler = () => {
      el.removeEventListener('transitionend', handler);
      resolve();
    };
    el.addEventListener('transitionend', handler, { once: true });
    setTimeout(handler, duration + 200);
  });
}

/**
 * clip-path 中心展开
 */
export async function unfoldFromCenter(el, opts = {}) {
  if (!el) return;
  const { duration = 600, ease = 'easeOut' } = opts;
  if (prefersReducedMotion()) return;
  el.style.clipPath = 'inset(50% 50% 50% 50%)';
  el.style.willChange = 'clip-path';
  await nextFrameSafe();
  el.style.transition = `clip-path ${duration}ms cubic-bezier(0.65, 0.05, 0.36, 1)`;
  el.style.clipPath = 'inset(0 0 0 0)';
  return new Promise(resolve => {
    const handler = () => {
      el.style.transition = '';
      el.style.clipPath = '';
      el.style.willChange = '';
      el.removeEventListener('transitionend', handler);
      resolve();
    };
    el.addEventListener('transitionend', handler, { once: true });
    setTimeout(handler, duration + 200);
  });
}

/**
 * 节流：rAF 包裹事件处理器
 */
export function rafThrottle(fn) {
  let scheduled = false;
  let lastArgs = null;
  return (...args) => {
    lastArgs = args;
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      fn(...lastArgs);
    });
  };
}

/**
 * 是否降级动画
 */
export { prefersReducedMotion };
