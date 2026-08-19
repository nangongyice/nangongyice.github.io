// ============================================================
// SearchBar.js — 搜索输入
// 桌面端默认折叠为图标，展开输入框
// 移动端点击进入全屏搜索
// ============================================================

import { Component } from './Component.js';
import { navigate } from '../app/router.js';

export class SearchBar extends Component {
  constructor() {
    super();
    this.state = { expanded: false, value: '' };
  }

  template() {
    return `
      <div class="searchbar" data-component="searchbar-root">
        <button class="searchbar__toggle" type="button" aria-label="搜索" data-role="search-toggle">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7"/>
            <path d="m20 20-3.5-3.5"/>
          </svg>
        </button>
        <form class="searchbar__form" data-role="search-form" role="search">
          <input
            class="searchbar__input"
            type="search"
            name="q"
            placeholder="搜索课程、创作者、关键词"
            aria-label="搜索"
            autocomplete="off"
            data-role="search-input"
          />
          <button class="searchbar__submit" type="submit" aria-label="搜索">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="7"/>
              <path d="m20 20-3.5-3.5"/>
            </svg>
          </button>
        </form>
      </div>`;
  }

  bindEvents() {
    if (!this.el) return;
    this.delegate('click', '[data-role="search-toggle"]', () => {
      this.setState({ expanded: !this.state.expanded });
      if (this.state.expanded) {
        setTimeout(() => this.el?.querySelector('[data-role="search-input"]')?.focus(), 100);
      }
    });
    this.delegate('submit', '[data-role="search-form"]', (e) => {
      e.preventDefault();
      const form = new FormData(e.target);
      const q = String(form.get('q') || '').trim();
      if (!q) return;
      navigate(`/discover?search=${encodeURIComponent(q)}`);
      this.setState({ expanded: false });
    });
  }

  onMount() {
    // 点击外部收起
    this._onDocClick = (e) => {
      if (!this.el?.contains(e.target)) this.setState({ expanded: false });
    };
    document.addEventListener('click', this._onDocClick);
  }

  onUnmount() {
    document.removeEventListener('click', this._onDocClick);
  }

  update() {
    if (!this.el) return;
    this.el.classList.toggle('is-expanded', this.state.expanded);
  }
}
