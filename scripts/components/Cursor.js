// ============================================================
// Cursor.js — 定制光标（B 级，桌面端核心交互区）
// 默认隐藏，进入 [data-cursor="hover"] 区域时显示
// 移动端 / prefers-reduced-motion 自动禁用
// ============================================================

import { rafThrottle, prefersReducedMotion } from '../core/animation.js';

class CursorManager {
  constructor() {
    this.el = null;
    this.dot = null;
    this.ring = null;
    this.enabled = false;
    this._onMove = null;
  }

  init() {
    if (typeof window === 'undefined') return;
    const isDesktop = window.matchMedia('(min-width: 1024px) and (pointer: fine)').matches;
    if (!isDesktop || prefersReducedMotion()) return;
    this.el = document.querySelector('[data-component="cursor"]');
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.className = 'custom-cursor';
      this.el.dataset.component = 'cursor';
      document.body.appendChild(this.el);
    }
    this.el.innerHTML = `
      <div class="custom-cursor__dot"></div>
      <div class="custom-cursor__ring"></div>
    `;
    this.dot = this.el.querySelector('.custom-cursor__dot');
    this.ring = this.el.querySelector('.custom-cursor__ring');
    this.enabled = true;
    document.body.classList.add('has-custom-cursor');
    this._onMove = rafThrottle((e) => this._handleMove(e));
    window.addEventListener('mousemove', this._onMove);
    document.addEventListener('mouseover', (e) => {
      const interactive = e.target.closest('[data-cursor], a, button, .course-card, .creator-card');
      this.el?.classList.toggle('is-hovering', !!interactive);
      const variant = interactive?.dataset.cursor;
      this.el?.setAttribute('data-variant', variant || '');
    });
  }

  _handleMove(e) {
    if (!this.enabled || !this.dot || !this.ring) return;
    const { clientX: x, clientY: y } = e;
    this.dot.style.transform = `translate(${x}px, ${y}px)`;
    this.ring.style.transform = `translate(${x}px, ${y}px)`;
  }

  destroy() {
    if (this._onMove) window.removeEventListener('mousemove', this._onMove);
    document.body.classList.remove('has-custom-cursor');
    this.el?.remove();
    this.el = null;
    this.enabled = false;
  }
}

export const Cursor = new CursorManager();
export default Cursor;
