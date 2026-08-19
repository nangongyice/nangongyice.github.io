// ============================================================
// dom.js — DOM 操作工具：h()/delegate/qs/qsa
// ============================================================

/**
 * querySelector 速记
 */
export function qs(selector, root = document) {
  return root.querySelector(selector);
}

/**
 * querySelectorAll 速记（返回真数组）
 */
export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

/**
 * 从 HTML 字符串创建元素（首个根元素）
 */
export function fromHTML(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = String(html).trim();
  return tpl.content.firstElementChild;
}

/**
 * 极简 h() —— 仅做属性绑定，不做 diff
 *   h('button', { class: 'btn', onClick: fn }, 'Click me')
 */
export function h(tag, props = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class' || k === 'className') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'dataset' && typeof v === 'object') {
      for (const [dk, dv] of Object.entries(v)) el.dataset[dk] = dv;
    } else if (k in el) {
      try { el[k] = v; } catch { el.setAttribute(k, v); }
    } else {
      el.setAttribute(k, v === true ? '' : v);
    }
  }
  appendChildren(el, children);
  return el;
}

function appendChildren(el, children) {
  const list = Array.isArray(children) ? children : [children];
  for (const c of list) {
    if (c == null || c === false) continue;
    el.appendChild(
      typeof c === 'string' || typeof c === 'number'
        ? document.createTextNode(String(c))
        : c
    );
  }
}

/**
 * 事件委托
 *   delegate(root, 'click', '[data-role=cta]', handler)
 *   handler 接收 (event, matchedEl)
 *   返回取消函数
 */
export function delegate(root, eventType, selector, handler) {
  const listener = (e) => {
    const matched = e.target.closest(selector);
    if (!matched || !root.contains(matched)) return;
    handler(e, matched);
  };
  root.addEventListener(eventType, listener);
  return () => root.removeEventListener(eventType, listener);
}

/**
 * 等待下一帧（rAF 包成 Promise）
 */
export function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

/**
 * 等待 transitionend / animationend
 */
export function onTransitionEnd(el, property = null, timeout = 1500) {
  return new Promise(resolve => {
    const handler = (e) => {
      if (property && e.propertyName !== property) return;
      el.removeEventListener('transitionend', handler);
      resolve(e);
    };
    el.addEventListener('transitionend', handler);
    // 超时兜底
    setTimeout(() => {
      el.removeEventListener('transitionend', handler);
      resolve(null);
    }, timeout);
  });
}

/**
 * 当元素挂载/卸载时回调（基于 MutationObserver，简化版）
 */
export function waitForElement(selector, root = document.body, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const existing = root.querySelector(selector);
    if (existing) return resolve(existing);
    const obs = new MutationObserver(() => {
      const found = root.querySelector(selector);
      if (found) { obs.disconnect(); resolve(found); }
    });
    obs.observe(root, { childList: true, subtree: true });
    setTimeout(() => { obs.disconnect(); reject(new Error('waitForElement timeout')); }, timeout);
  });
}
