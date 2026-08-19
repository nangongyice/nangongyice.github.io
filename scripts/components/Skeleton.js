// ============================================================
// Skeleton.js — 加载占位
// ============================================================

import { Component } from './Component.js';

export class Skeleton extends Component {
  constructor({ variant = 'rect', width = null, height = null, radius = null, count = 1 } = {}) {
    super({ variant, width, height, radius, count });
  }
  template() {
    const { variant, width, height, radius, count } = this.props;
    const style = [
      width ? `width:${typeof width === 'number' ? width + 'px' : width}` : '',
      height ? `height:${typeof height === 'number' ? height + 'px' : height}` : '',
      radius ? `border-radius:${typeof radius === 'number' ? radius + 'px' : radius}` : '',
    ].filter(Boolean).join(';');
    return Array.from({ length: count }, () =>
      `<div class="skeleton skeleton--${variant}"${style ? ` style="${style}"` : ''} aria-hidden="true"></div>`
    ).join('');
  }
}

export function skeletonHTML({ variant = 'rect', width = null, height = null, radius = null } = {}) {
  const style = [
    width ? `width:${typeof width === 'number' ? width + 'px' : width}` : '',
    height ? `height:${typeof height === 'number' ? height + 'px' : height}` : '',
    radius ? `border-radius:${typeof radius === 'number' ? radius + 'px' : radius}` : '',
  ].filter(Boolean).join(';');
  return `<div class="skeleton skeleton--${variant}"${style ? ` style="${style}"` : ''} aria-hidden="true"></div>`;
}
