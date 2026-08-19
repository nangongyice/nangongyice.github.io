// ============================================================
// Header.js — 顶部导航栏
// 包含：Logo / Navigation / SearchBar / Login/Avatar + 书架 Badge
// 滚动时切换 .is-scrolled 优化投影
// ============================================================

import { Component } from './Component.js';
import { Navigation } from './Navigation.js';
import { SearchBar } from './SearchBar.js';
import { Badge } from './Badge.js';
import { store } from '../core/store.js';
import { eventBus, EVENTS } from '../app/event-bus.js';
import { rafThrottle } from '../core/animation.js';

export class Header extends Component {
  constructor(props = {}) {
    super(props);
    this.state = { user: store.get().auth.user, purchases: store.get().purchases };
    this.navigation = new Navigation();
    this.searchBar = new SearchBar();
    this.badge = new Badge({ count: this.state.purchases.length });
  }

  template() {
    const { user, purchases } = this.state;
    return `
      <div class="header__inner container">
        <a href="/" class="header__logo" data-link aria-label="NEW PAGE 新页 首页">
          <span class="header__logo-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none" width="28" height="28">
              <path d="M4 6 L16 4 L28 6 L28 26 L16 28 L4 26 Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" fill="none"/>
              <path d="M16 4 L16 28" stroke="currentColor" stroke-width="1.6"/>
              <path d="M10 11 L13 11 M10 15 L13 15 M10 19 L13 19" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
          </span>
          <span class="header__logo-text">
            <span class="header__logo-en">NEW PAGE</span>
            <span class="header__logo-cn">新页</span>
          </span>
        </a>

        <nav class="header__nav" id="header-nav" data-component="navigation"></nav>

        <div class="header__right">
          <button class="header__hamburger" type="button" data-role="hamburger" aria-label="打开菜单" aria-expanded="false" aria-controls="header-nav">
            <span></span><span></span><span></span>
          </button>
          <div class="header__search" data-component="searchbar"></div>
          <a href="/bookshelf" class="header__nav-item header__nav-item--bookshelf" data-link data-nav-item="bookshelf" aria-label="我的书架">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4h4v16H4z M9 4h4v16H9z M14 4l4 1-3 15-4-1z"/>
            </svg>
            <span class="header__nav-label">书架</span>
            <span class="header__badge" data-role="bookshelf-badge"></span>
          </a>
          ${user
            ? `<a href="/login" class="header__avatar-link" data-link aria-label="${user.name}">
                 <span class="header__avatar">${user.name.slice(0, 1)}</span>
               </a>`
            : `<a href="/login" class="btn btn--secondary btn--sm header__login" data-link>登录</a>`}
        </div>
      </div>`;
  }

  afterRender() {
    // 挂载子组件
    const navSlot = this.el?.querySelector('[data-component="navigation"]');
    if (navSlot && this.navigation) this.navigation.mount(navSlot);

    const searchSlot = this.el?.querySelector('[data-component="searchbar"]');
    if (searchSlot && this.searchBar) this.searchBar.mount(searchSlot);

    const badgeSlot = this.el?.querySelector('[data-role="bookshelf-badge"]');
    if (badgeSlot && this.badge) {
      badgeSlot.innerHTML = '';
      this.badge.render();
      badgeSlot.appendChild(this.badge.el);
    }
  }

  onMount() {
    // 滚动时切换样式
    this._onScroll = rafThrottle(() => {
      const scrolled = window.scrollY > 24;
      this.el?.classList.toggle('is-scrolled', scrolled);
    });
    window.addEventListener('scroll', this._onScroll, { passive: true });

    // 移动端汉堡菜单：document 级委托（抗 setState 重渲染）
    this._onDocClick = (e) => {
      const hamburger = e.target.closest('[data-role="hamburger"]');
      if (hamburger) {
        e.stopPropagation();
        this._toggleMenu();
        return;
      }
      // 点击抽屉内链接后自动收起
      if (e.target.closest('.header__nav a[data-link]')) {
        this._toggleMenu(false);
        return;
      }
      // 抽屉打开时，点击外部区域收起
      if (this.el?.classList.contains('is-menu-open')) {
        const nav = this.el?.querySelector('.header__nav');
        if (nav && !nav.contains(e.target)) this._toggleMenu(false);
      }
    };
    this._onEscMenu = (e) => { if (e.key === 'Escape') this._toggleMenu(false); };
    document.addEventListener('click', this._onDocClick);
    document.addEventListener('keydown', this._onEscMenu);

    // 路由变化时收起菜单
    this._unsubRoute = eventBus.on(EVENTS.ROUTE_CHANGED, () => this._toggleMenu(false));

    // 订阅 store
    this.subscribeStore(s => s.auth.user, user => this.setState({ user }));
    this.subscribeStore(s => s.purchases, purchases => {
      this.setState({ purchases });
      this.badge.setCount(purchases.length);
      // 触发 bump 动画
      const badgeEl = this.el?.querySelector('.badge');
      if (badgeEl) {
        badgeEl.classList.remove('is-bump');
        void badgeEl.offsetWidth;
        badgeEl.classList.add('is-bump');
      }
    });
  }

  _toggleMenu(open) {
    if (!this.el) return;
    const next = typeof open === 'boolean' ? open : !this.el.classList.contains('is-menu-open');
    this.el.classList.toggle('is-menu-open', next);
    const btn = this.el.querySelector('[data-role="hamburger"]');
    if (btn) btn.setAttribute('aria-expanded', String(next));
    document.body.classList.toggle('is-menu-open', next);
  }

  onUnmount() {
    if (this._onScroll) window.removeEventListener('scroll', this._onScroll);
    document.removeEventListener('click', this._onDocClick);
    document.removeEventListener('keydown', this._onEscMenu);
    this._unsubRoute?.();
    this.navigation?.unmount();
    this.searchBar?.unmount();
    this.badge?.unmount();
  }
}
