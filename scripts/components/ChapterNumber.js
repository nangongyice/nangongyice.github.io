// ============================================================
// ChapterNumber.js — 章节大号编号 "01 / 07"
// 视觉关键词：细字重、低对比度、巨大字号
// ============================================================

import { Component } from './Component.js';

export class ChapterNumber extends Component {
  constructor({ index, total, label = '', align = 'left' } = {}) {
    super({ index, total, label, align });
  }
  template() {
    const { index, total, label, align } = this.props;
    const idx = String(index).padStart(2, '0');
    const tot = String(total).padStart(2, '0');
    return `
      <div class="chapter-number chapter-number--${align}" data-component="chapter-number">
        <div class="chapter-number__index" aria-hidden="true">${idx}<span class="chapter-number__slash">/</span><span class="chapter-number__total">${tot}</span></div>
        ${label ? `<div class="chapter-number__label">${label}</div>` : ''}
      </div>`;
  }
}

export function chapterNumberHTML({ index, total, label = '', align = 'left' } = {}) {
  const idx = String(index).padStart(2, '0');
  const tot = String(total).padStart(2, '0');
  return `
    <div class="chapter-number chapter-number--${align}" data-component="chapter-number">
      <div class="chapter-number__index" aria-hidden="true">${idx}<span class="chapter-number__slash">/</span><span class="chapter-number__total">${tot}</span></div>
      ${label ? `<div class="chapter-number__label">${label}</div>` : ''}
    </div>`;
}
