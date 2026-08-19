// ============================================================
// Tag.js — 小标签（弱视觉权重）
// ============================================================

import { Component } from './Component.js';

export class Tag extends Component {
  constructor({ text, variant = 'default', icon = null } = {}) {
    super({ text, variant, icon });
  }
  template() {
    const { text, variant, icon } = this.props;
    return `<span class="tag tag--${variant}">${icon ? `<span class="tag__icon">${icon}</span>` : ''}<span class="tag__text">${text}</span></span>`;
  }
}

export function tagHTML({ text, variant = 'default', icon = null } = {}) {
  return `<span class="tag tag--${variant}">${icon ? `<span class="tag__icon">${icon}</span>` : ''}<span class="tag__text">${text}</span></span>`;
}
