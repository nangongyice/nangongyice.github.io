// ============================================================
// intersection.js — 滚动入场观察器（带 stagger）
// 用法：observeReveal(rootEl) 自动扫描 [data-reveal]
//      或 observeElement(el) 观察单个元素
// ============================================================

import { qsa } from './dom.js';

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let sharedObserver = null;

function getObserver() {
  if (sharedObserver) return sharedObserver;
  if (!('IntersectionObserver' in window)) return null;
  sharedObserver = new IntersectionObserver(handleIntersection, {
    root: null,
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.1,
  });
  return sharedObserver;
}

function handleIntersection(entries, observer) {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const group = el.closest('[data-reveal-group]');
    const siblings = group ? Array.from(group.querySelectorAll('[data-reveal]')) : [el];
    const index = siblings.indexOf(el);
    const delay = parseInt(el.dataset.revealDelay ?? (index >= 0 ? index * 120 : 0), 10);

    if (prefersReducedMotion()) {
      el.classList.add('is-visible');
    } else {
      setTimeout(() => el.classList.add('is-visible'), delay);
    }
    observer.unobserve(el);
  });
}

/**
 * 观察单个元素入场
 */
export function observeElement(el) {
  if (!el) return;
  if (prefersReducedMotion()) { el.classList.add('is-visible'); return; }
  if (!el.classList.contains('reveal')) el.classList.add('reveal');
  const obs = getObserver();
  if (!obs) { el.classList.add('is-visible'); return; }
  obs.observe(el);
}

/**
 * 扫描 root 下所有 [data-reveal] 元素并观察
 * 用法：observeReveal(sectionEl)
 */
export function observeReveal(root = document) {
  const items = qsa('[data-reveal]', root);
  items.forEach(el => {
    if (!el.classList.contains('reveal')) el.classList.add('reveal');
  });
  const obs = getObserver();
  if (!obs) { items.forEach(el => el.classList.add('is-visible')); return; }
  items.forEach(el => obs.observe(el));
}

/**
 * 取消所有观察并清理
 */
export function disconnectObserver() {
  if (sharedObserver) {
    sharedObserver.disconnect();
    sharedObserver = null;
  }
}

/**
 * 重置某个根下的 reveal 状态（页面切换时用）
 */
export function resetReveal(root) {
  if (!root) return;
  qsa('[data-reveal]', root).forEach(el => {
    el.classList.remove('is-visible');
  });
}
