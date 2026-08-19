// ============================================================
// Button.js — CTA 按钮
// 变体：primary / secondary / ghost / link
// 修饰：lg / sm / block；支持 trailing 箭头
// ============================================================

import { Component } from './Component.js';

export class Button extends Component {
  constructor({ label, variant = 'primary', size = 'md', block = false, arrow = false, link = null, onClick = null, type = 'button', ariaLabel = null } = {}) {
    super({ label, variant, size, block, arrow, link, onClick, type, ariaLabel });
  }

  template() {
    const { label, variant, size, block, arrow, link, type, ariaLabel } = this.props;
    const cls = ['btn', `btn--${variant}`, `btn--${size}`];
    if (block) cls.push('btn--block');
    if (arrow) cls.push('btn--arrow');
    const tag = link ? 'a' : 'button';
    const attrs = [
      `class="${cls.join(' ')}"`,
      link ? `href="${link}" data-link` : `type="${type}"`,
      ariaLabel ? `aria-label="${ariaLabel}"` : '',
    ].filter(Boolean).join(' ');
    return `
      <${tag} ${attrs}>
        <span class="btn__label">${label}</span>
        ${arrow ? '<span class="btn__arrow" aria-hidden="true">→</span>' : ''}
      </${tag}>`;
  }

  bindEvents() {
    if (!this.el) return;
    if (this.props.onClick) {
      this.on(this.el, 'click', (e) => {
        if (!this.props.link) e.preventDefault();
        this.props.onClick(e, this);
      });
    }
  }
}

/**
 * 速记函数：返回 Button HTML 字符串（无事件绑定，用于在父组件模板内联）
 */
export function buttonHTML({ label, variant = 'primary', size = 'md', block = false, arrow = false, link = null, type = 'button' } = {}) {
  const cls = ['btn', `btn--${variant}`, `btn--${size}`];
  if (block) cls.push('btn--block');
  if (arrow) cls.push('btn--arrow');
  const tag = link ? 'a' : 'button';
  const attrs = [
    `class="${cls.join(' ')}"`,
    link ? `href="${link}" data-link` : `type="${type}"`,
  ].filter(Boolean).join(' ');
  return `<${tag} ${attrs}><span class="btn__label">${label}</span>${arrow ? '<span class="btn__arrow" aria-hidden="true">→</span>' : ''}</${tag}>`;
}
