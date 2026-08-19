// ============================================================
// Badge.js — 计数徽标（书架导航角标等）
// ============================================================

import { Component } from './Component.js';

export class Badge extends Component {
  constructor({ count = 0, max = 99 } = {}) {
    super({ count, max });
    this.state.count = count;
  }
  template() {
    const { count, max } = this.state;
    if (!count) return '<span class="badge badge--hidden" aria-hidden="true"></span>';
    const display = count > max ? `${max}+` : String(count);
    return `<span class="badge" aria-label="${count} 个项目">${display}</span>`;
  }
  setCount(n) { this.setState({ count: n }); }
}

export function badgeHTML(count, max = 99) {
  if (!count) return '<span class="badge badge--hidden" aria-hidden="true"></span>';
  const display = count > max ? `${max}+` : String(count);
  return `<span class="badge" aria-label="${count} 个项目">${display}</span>`;
}
