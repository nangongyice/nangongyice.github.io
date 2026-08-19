// ============================================================
// Modal.js — 模态浮层
// 用法：Modal.open({ title, body, actions: [{ label, onClick, variant }] })
// ============================================================

import { fromHTML } from '../core/dom.js';
import { prefersReducedMotion } from '../core/animation.js';

class ModalManager {
  constructor() {
    this.overlay = null;
    this._onEsc = null;
  }

  _ensure() {
    if (this.overlay) return;
    this.overlay = fromHTML('<div class="modal-overlay" data-component="modal" aria-hidden="true"></div>');
    document.getElementById('app')?.appendChild(this.overlay);
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
    this._onEsc = (e) => { if (e.key === 'Escape') this.close(); };
    document.addEventListener('keydown', this._onEsc);
  }

  open({ title = '', body = '', actions = [], closable = true } = {}) {
    this._ensure();
    if (!this.overlay) return;
    const actionsHTML = actions.map((a, i) => {
      const variant = a.variant === 'primary' ? 'btn--primary' : 'btn--secondary';
      const arrow = a.arrow ? ' btn--arrow' : '';
      return `<button class="btn ${variant}${arrow}" data-modal-action="${i}"><span class="btn__label">${a.label}</span>${a.arrow ? '<span class="btn__arrow" aria-hidden="true">→</span>' : ''}</button>`;
    }).join('');

    this.overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        ${closable ? `<button class="modal__close" type="button" aria-label="关闭">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>` : ''}
        ${title ? `<h2 class="modal__title">${title}</h2>` : ''}
        <div class="modal__body">${body}</div>
        ${actions.length ? `<div class="modal__actions">${actionsHTML}</div>` : ''}
      </div>`;

    // 绑定 actions
    actions.forEach((a, i) => {
      const btn = this.overlay.querySelector(`[data-modal-action="${i}"]`);
      if (btn) btn.addEventListener('click', (e) => {
        if (a.onClick) a.onClick(e);
        if (a.keepOpen !== true) this.close();
      });
    });

    const closeBtn = this.overlay.querySelector('.modal__close');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    this.overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => this.overlay.classList.add('is-open'));
  }

  close() {
    if (!this.overlay) return;
    this.overlay.classList.remove('is-open');
    this.overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (prefersReducedMotion()) {
      this.overlay.innerHTML = '';
    } else {
      setTimeout(() => { if (this.overlay) this.overlay.innerHTML = ''; }, 300);
    }
  }
}

export const Modal = new ModalManager();
export default Modal;
