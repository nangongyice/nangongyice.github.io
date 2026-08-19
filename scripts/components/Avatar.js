// ============================================================
// Avatar.js — 头像
// ============================================================

import { Component } from './Component.js';
import { imageUrl, setImageLazy } from '../core/image.js';

export class Avatar extends Component {
  constructor({ src = null, prompt = null, alt = '', name = '', size = 'md', category = 'default' } = {}) {
    super({ src, prompt, alt, name, size, category });
    this._resolvedSrc = src || (prompt ? imageUrl(prompt, 'square_hd') : '');
  }
  template() {
    const { alt, name, size, category } = this.props;
    const initial = (name || '?').slice(0, 1);
    return `
      <span class="avatar avatar--${size}" data-category="${category}">
        <span class="avatar__fallback">${initial}</span>
        <img class="avatar__img" alt="${alt || name || 'avatar'}" />
      </span>`;
  }
  afterRender() {
    const img = this.el?.querySelector('.avatar__img');
    if (img && this._resolvedSrc) {
      setImageLazy(img, { src: this._resolvedSrc, alt: this.props.alt || this.props.name, category: this.props.category });
    }
  }
}

export function avatarHTML({ src = null, prompt = null, alt = '', name = '', size = 'md', category = 'default' } = {}) {
  const resolved = src || (prompt ? imageUrl(prompt, 'square_hd') : '');
  const initial = (name || '?').slice(0, 1);
  // 内联返回（懒加载由父组件扫描 .avatar__img[data-src] 触发）
  return `<span class="avatar avatar--${size}" data-category="${category}"><span class="avatar__fallback">${initial}</span><img class="avatar__img" data-src="${resolved}" alt="${alt || name || 'avatar'}" /></span>`;
}
