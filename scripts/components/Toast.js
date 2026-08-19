// ============================================================
// Toast.js — Toast 浮层
// 用法：Toast.show('已加入书架', { variant: 'success' })
// ============================================================

import { fromHTML } from '../core/dom.js';
import { eventBus, EVENTS } from '../app/event-bus.js';

class ToastManager {
  constructor() {
    this.stack = null;
    this._initStack();
    this._bindBus();
  }

  _initStack() {
    if (typeof document === 'undefined') return;
    this.stack = document.querySelector('[data-component="toast-stack"]');
    if (!this.stack) {
      this.stack = fromHTML('<div class="toast-stack" data-component="toast-stack" aria-live="polite"></div>');
      document.getElementById('app')?.appendChild(this.stack);
    }
  }

  _bindBus() {
    eventBus.on(EVENTS.TOAST, ({ message, variant = 'default', duration = 2400 }) => {
      this.show(message, { variant, duration });
    });
  }

  show(message, { variant = 'default', duration = 2400 } = {}) {
    if (!this.stack) this._initStack();
    if (!this.stack) return;
    const toast = fromHTML(`
      <div class="toast toast--${variant}" role="status">
        <span class="toast__icon" aria-hidden="true">${this._icon(variant)}</span>
        <span class="toast__message">${message}</span>
      </div>
    `);
    this.stack.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    setTimeout(() => {
      toast.classList.remove('is-visible');
      toast.classList.add('is-leaving');
      setTimeout(() => toast.remove(), 400);
    }, duration);
  }

  _icon(variant) {
    const icons = {
      success: '✓',
      info: 'i',
      warning: '!',
      error: '×',
      default: '·',
    };
    return icons[variant] || icons.default;
  }
}

export const Toast = new ToastManager();
export default Toast;
