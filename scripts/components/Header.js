// ============================================================
// Header.js — 顶部导航栏
// 包含：Logo / Navigation / SearchBar / 主题切换 / Login/Avatar + 书架 Badge
// 滚动时切换 .is-scrolled 优化投影
// ============================================================

import { Component } from './Component.js';
import { Navigation } from './Navigation.js';
import { SearchBar } from './SearchBar.js';
import { Badge } from './Badge.js';
import { store } from '../core/store.js';
import { eventBus, EVENTS } from '../app/event-bus.js';
import { rafThrottle } from '../core/animation.js';
import { PALETTES, MODES, setPalette, setMode, getThemeState, onThemeChange } from '../core/theme.js';

export class Header extends Component {
  constructor(props = {}) {
    super(props);
    this.state = { user: store.get().auth.user, purchases: store.get().purchases, theme: getThemeState() };
    this.navigation = new Navigation();
    this.searchBar = new SearchBar();
    this.badge = new Badge({ count: this.state.purchases.length });
  }

  template() {
    const { user, purchases, theme } = this.state;
    const p = theme?.palette || 'amber';
    const m = theme?.mode || 'auto';
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

          <!-- 主题切换：调色板按钮 + 下拉面板 -->
          <div class="header__theme" data-role="theme-root">
            <button class="header__nav-item header__theme-trigger" type="button" data-role="theme-trigger" aria-haspopup="menu" aria-expanded="false" aria-label="主题色彩">
              <!-- 调色板图标 -->
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="13.5" cy="6.5" r="1.1" fill="currentColor" stroke="none"/>
                <circle cx="17.5" cy="10.5" r="1.1" fill="currentColor" stroke="none"/>
                <circle cx="8.5" cy="7.5" r="1.1" fill="currentColor" stroke="none"/>
                <circle cx="6.5" cy="12.5" r="1.1" fill="currentColor" stroke="none"/>
                <path d="M12 3a9 9 0 1 0 0 18c1.66 0 2.5-1.34 2.5-3 0-.76-.3-1.42-.78-1.85-.44-.4-.72-.95-.72-1.55 0-1.38 1.12-2.5 2.5-2.5h1.5A4.5 4.5 0 0 0 12 3z"/>
              </svg>
              <span class="header__nav-label">主题</span>
              <span class="header__theme-swatch" aria-hidden="true" style="background:${(PALETTES.find(x => x.id === p) || PALETTES[0]).swatch}"></span>
            </button>

            <div class="header__theme-panel" data-role="theme-panel" role="menu" aria-label="选择主题色彩与显示模式">
              <!-- 色板：6 套 palette -->
              <div class="theme-panel__section">
                <div class="theme-panel__title">色彩方案</div>
                <div class="theme-panel__swatches">
                  ${PALETTES.map(pt => `
                    <button class="theme-swatch${pt.id === p ? ' is-active' : ''}" type="button" data-role="palette-btn" data-id="${pt.id}" title="${pt.name} · ${pt.label}" aria-pressed="${pt.id === p}">
                      <span class="theme-swatch__dot" style="background:${pt.swatch}"></span>
                      <span class="theme-swatch__name">${pt.name}</span>
                      ${pt.id === p ? '<svg class="theme-swatch__check" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
                    </button>
                  `).join('')}
                </div>
              </div>

              <!-- 显示模式：auto / light / dark -->
              <div class="theme-panel__section">
                <div class="theme-panel__title">显示模式</div>
                <div class="theme-panel__modes">
                  ${MODES.map(md => `
                    <button class="theme-mode${md.id === m ? ' is-active' : ''}" type="button" data-role="mode-btn" data-id="${md.id}" aria-pressed="${md.id === m}">
                      <span class="theme-mode__icon" aria-hidden="true">
                        ${md.id === 'auto'
                          ? '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/><circle cx="8" cy="7" r="0.5" fill="currentColor"/></svg>'
                          : md.id === 'light'
                            ? '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>'
                            : '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
                        }
                      </span>
                      <span class="theme-mode__name">${md.name}</span>
                    </button>
                  `).join('')}
                </div>
              </div>

              <div class="theme-panel__footer">
                已选：<span class="theme-panel__hint">${(PALETTES.find(x=>x.id===p)||PALETTES[0]).name} · ${(MODES.find(x=>x.id===m)||MODES[0]).name}</span>
              </div>
            </div>
          </div>

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

    // 移动端汉堡菜单 + 主题面板：document 级委托
    this._onDocClick = (e) => {
      const hamburger = e.target.closest('[data-role="hamburger"]');
      if (hamburger) {
        e.stopPropagation();
        this._toggleMenu();
        return;
      }
      // 主题：点击触发按钮 -> 切换面板
      const themeTrigger = e.target.closest('[data-role="theme-trigger"]');
      if (themeTrigger) {
        e.stopPropagation();
        this._toggleThemePanel();
        // 先停止冒泡后，如果汉堡菜单开着就先关
        if (this.el?.classList.contains('is-menu-open')) this._toggleMenu(false);
        return;
      }
      // 点击 palette 按钮
      const paletteBtn = e.target.closest('[data-role="palette-btn"]');
      if (paletteBtn) {
        e.stopPropagation();
        const id = paletteBtn.dataset.id;
        if (id) setPalette(id);
        return;
      }
      // 点击 mode 按钮
      const modeBtn = e.target.closest('[data-role="mode-btn"]');
      if (modeBtn) {
        e.stopPropagation();
        const id = modeBtn.dataset.id;
        if (id) setMode(id);
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
      // 主题面板打开时，点击外部区域关闭
      if (this.el?.classList.contains('is-theme-open')) {
        const panel = this.el?.querySelector('[data-role="theme-panel"]');
        if (panel && !panel.contains(e.target)) this._toggleThemePanel(false);
      }
    };
    this._onEscMenu = (e) => {
      if (e.key === 'Escape') {
        this._toggleMenu(false);
        this._toggleThemePanel(false);
      }
    };
    document.addEventListener('click', this._onDocClick);
    document.addEventListener('keydown', this._onEscMenu);

    // 路由变化时收起菜单
    this._unsubRoute = eventBus.on(EVENTS.ROUTE_CHANGED, () => {
      this._toggleMenu(false);
      this._toggleThemePanel(false);
    });

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

    // 订阅主题变化：同步 active 态 + 按钮 swatch
    this._unsubTheme = onThemeChange((state) => {
      this.setState({ theme: state });
    });
  }

  _toggleMenu(open) {
    if (!this.el) return;
    const next = typeof open === 'boolean' ? open : !this.el.classList.contains('is-menu-open');
    this.el.classList.toggle('is-menu-open', next);
    if (next) this._toggleThemePanel(false); // 打开汉堡时关主题面板
    const btn = this.el.querySelector('[data-role="hamburger"]');
    if (btn) btn.setAttribute('aria-expanded', String(next));
    document.body.classList.toggle('is-menu-open', next);
  }

  _toggleThemePanel(open) {
    if (!this.el) return;
    const next = typeof open === 'boolean' ? open : !this.el.classList.contains('is-theme-open');
    this.el.classList.toggle('is-theme-open', next);
    if (next) this._toggleMenu(false); // 打开主题面板时关汉堡
    const btn = this.el.querySelector('[data-role="theme-trigger"]');
    if (btn) btn.setAttribute('aria-expanded', String(next));
  }

  onUnmount() {
    if (this._onScroll) window.removeEventListener('scroll', this._onScroll);
    document.removeEventListener('click', this._onDocClick);
    document.removeEventListener('keydown', this._onEscMenu);
    this._unsubRoute?.();
    this._unsubTheme?.();
    this.navigation?.unmount();
    this.searchBar?.unmount();
    this.badge?.unmount();
  }
}
