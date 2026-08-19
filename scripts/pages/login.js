// ============================================================
// login.js — 登录 / 用户中心
// 核心文案：打开你的下一页
// 背景：缓慢移动的巨型文字与数字
// ============================================================

import { store } from '../core/store.js';
import { navigate } from '../app/router.js';
import { Toast } from '../components/Toast.js';
import { eventBus, EVENTS } from '../app/event-bus.js';
import { observeReveal } from '../core/intersection.js';
import { formatRelative } from '../core/format.js';

export default {
  path: '/login',
  title: '打开你的下一页 · NEW PAGE 新页',

  async load() {
    return { scenePrompts: await import('../core/api.js').then(m => m.api.getScenePrompts()) };
  },

  async mount(root, { data }) {
    const { scenePrompts = {} } = data;
    const user = store.get().auth.user;

    root.innerHTML = user ? renderUserCenter({ user, scenePrompts }) : renderLogin({ scenePrompts });
    this._root = root;
    this._bindEvents(root);
    observeReveal(root);
    this._startBackgroundMotion(root);
  },

  unmount() {
    this._stopBackgroundMotion?.();
  },

  _bindEvents(root) {
    root.addEventListener('click', (e) => {
      // 登录提交
      const loginBtn = e.target.closest('[data-role="login-submit"]');
      if (loginBtn) {
        e.preventDefault();
        const form = root.querySelector('[data-role="login-form"]');
        const input = form?.querySelector('input[name="name"]');
        const name = (input?.value || '').trim() || '新页读者';
        store.login(name);
        Toast.show(`欢迎回来，${name}`, { variant: 'success' });
        navigate('/');
        return;
      }
      // 退出登录
      const logoutBtn = e.target.closest('[data-role="logout"]');
      if (logoutBtn) {
        store.logout();
        Toast.show('已退出登录', { variant: 'default' });
        navigate('/');
        return;
      }
      // 跳转
      const link = e.target.closest('[data-role="goto-bookshelf"]');
      if (link) {
        e.preventDefault();
        navigate('/bookshelf');
        return;
      }
    });

    // 回车提交
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.closest('[data-role="login-form"]')) {
        e.preventDefault();
        root.querySelector('[data-role="login-submit"]')?.click();
      }
    });
  },

  _startBackgroundMotion(root) {
    const bg = root.querySelector('[data-role="bg-text"]');
    if (!bg) return;
    // 缓慢移动的巨型文字
    let offset = 0;
    let raf;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (motion) return;
    const tick = () => {
      offset = (offset + 0.06) % 100;
      bg.style.transform = `translateX(${-offset * 0.5}%) translateY(${Math.sin(offset / 20) * 2}%)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    this._stopBackgroundMotion = () => cancelAnimationFrame(raf);
  },
};

function renderLogin({ scenePrompts }) {
  return `
    <section class="login-page">
      <div class="login-page__bg" aria-hidden="true">
        <div class="login-page__bg-text" data-role="bg-text">
          ${'NEW PAGE 新页 '.repeat(20)}
        </div>
        <div class="login-page__bg-nums" aria-hidden="true">
          ${Array.from({ length: 12 }, (_, i) => `<span>${String(i).padStart(2, '0')}</span>`).join(' / ')}
        </div>
      </div>

      <div class="login-page__inner">
        <div class="login-page__card" data-reveal>
          <div class="login-page__logo">
            <svg viewBox="0 0 32 32" fill="none" width="40" height="40">
              <path d="M4 6 L16 4 L28 6 L28 26 L16 28 L4 26 Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" fill="none"/>
              <path d="M16 4 L16 28" stroke="currentColor" stroke-width="1.6"/>
            </svg>
          </div>
          <h1 class="login-page__title">打开你的<br/>下一页</h1>
          <p class="login-page__subtitle">每一次学习，都是打开人生的新一页。<br/>登录后，你的书架、进度与收藏将随之翻开。</p>

          <form class="login-page__form" data-role="login-form" onsubmit="return false">
            <label class="login-page__field">
              <span class="login-page__field-label">你的名字</span>
              <input class="login-page__input" type="text" name="name" placeholder="新页读者" autocomplete="name" />
            </label>
            <button class="btn btn--primary btn--lg btn--block btn--arrow login-page__submit" type="submit" data-role="login-submit">
              <span class="btn__label">翻开新一页</span>
              <span class="btn__arrow" aria-hidden="true">→</span>
            </button>
          </form>

          <p class="login-page__note">DEMO 演示版，无需密码，输入名字即可登录。</p>
        </div>
      </div>
    </section>`;
}

function renderUserCenter({ user, scenePrompts }) {
  const state = store.get();
  const purchaseCount = state.purchases.length;
  const favoriteCount = state.favorites.length;
  const progressCount = Object.keys(state.progress).length;
  const recentCount = state.recent.length;

  return `
    <section class="login-page login-page--user">
      <div class="login-page__bg" aria-hidden="true">
        <div class="login-page__bg-text" data-role="bg-text">
          ${'NEXT PAGE 下一页 '.repeat(20)}
        </div>
      </div>
      <div class="login-page__inner">
        <div class="user-center" data-reveal>
          <header class="user-center__header">
            <div class="user-center__avatar">${user.name.slice(0, 1)}</div>
            <div class="user-center__info">
              <h1 class="user-center__name">${user.name}</h1>
              <p class="user-center__since">加入于 ${formatRelative(user.joinedAt)} · NEW PAGE 第 ${purchaseCount + 1} 页</p>
            </div>
          </header>

          <div class="user-center__stats">
            <a class="user-center__stat" href="/bookshelf" data-link data-role="goto-bookshelf">
              <span class="user-center__stat-num">${purchaseCount}</span>
              <span class="user-center__stat-label">书架</span>
            </a>
            <div class="user-center__stat">
              <span class="user-center__stat-num">${favoriteCount}</span>
              <span class="user-center__stat-label">收藏</span>
            </div>
            <div class="user-center__stat">
              <span class="user-center__stat-num">${progressCount}</span>
              <span class="user-center__stat-label">学习进度</span>
            </div>
            <div class="user-center__stat">
              <span class="user-center__stat-num">${recentCount}</span>
              <span class="user-center__stat-label">最近浏览</span>
            </div>
          </div>

          <div class="user-center__actions">
            <a class="btn btn--primary btn--lg btn--arrow" href="/bookshelf" data-link data-role="goto-bookshelf">
              <span class="btn__label">查看我的书架</span>
              <span class="btn__arrow" aria-hidden="true">→</span>
            </a>
            <a class="btn btn--secondary" href="/" data-link>回到首页</a>
            <button class="btn btn--ghost" type="button" data-role="logout">退出登录</button>
          </div>

          <p class="user-center__hint">DEMO 数据保存在浏览器 LocalStorage，可随时重置（页脚入口）。</p>
        </div>
      </div>
    </section>`;
}
