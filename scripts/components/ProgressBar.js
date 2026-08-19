// ============================================================
// ProgressBar.js — 学习进度条
// 支持 A 级动画：进入视口时填充
// ============================================================

import { Component } from './Component.js';

export class ProgressBar extends Component {
  constructor({ percent = 0, showLabel = false, size = 'md', animated = true } = {}) {
    super({ percent, showLabel, size, animated });
    this.state.percent = Math.max(0, Math.min(1, percent));
  }
  template() {
    const { showLabel, size, animated } = this.props;
    const { percent } = this.state;
    const pct = Math.round(percent * 100);
    return `
      <div class="progress-bar progress-bar--${size}${animated ? ' progress-bar--animated' : ''}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}">
        <div class="progress-bar__track">
          <div class="progress-bar__fill" style="width:${pct}%"></div>
        </div>
        ${showLabel ? `<span class="progress-bar__label">${pct}%</span>` : ''}
      </div>`;
  }
  setPercent(p) {
    p = Math.max(0, Math.min(1, p));
    if (Math.abs(p - this.state.percent) < 0.001) return;
    this.setState({ percent: p });
  }
  /** 直接更新填充宽度，不重渲染（避免重置动画） */
  updatePercent(p) {
    p = Math.max(0, Math.min(1, p));
    this.state.percent = p;
    const fill = this.el?.querySelector('.progress-bar__fill');
    const label = this.el?.querySelector('.progress-bar__label');
    if (fill) fill.style.width = `${Math.round(p * 100)}%`;
    if (label) label.textContent = `${Math.round(p * 100)}%`;
    if (this.el) this.el.setAttribute('aria-valuenow', String(Math.round(p * 100)));
  }
}

export function progressBarHTML({ percent = 0, showLabel = false, size = 'md', animated = true } = {}) {
  const p = Math.max(0, Math.min(1, percent));
  const pct = Math.round(p * 100);
  return `
    <div class="progress-bar progress-bar--${size}${animated ? ' progress-bar--animated' : ''}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}">
      <div class="progress-bar__track">
        <div class="progress-bar__fill" style="width:${pct}%"></div>
      </div>
      ${showLabel ? `<span class="progress-bar__label">${pct}%</span>` : ''}
    </div>`;
}
