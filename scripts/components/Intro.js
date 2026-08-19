// ============================================================
// Intro.js — 首屏品牌入场动画（S2）
// 仅首次进入会话时播放一次（sessionStorage 控制）
// 动画：overlay 浮入 → 品牌字母错位 → 翻页揭幕
// ============================================================

import { prefersReducedMotion } from '../core/animation.js';

const SESSION_KEY = 'newpage:intro:played';

class IntroManager {
  constructor() {
    this.el = null;
    this._timer = null;
  }

  /**
   * 启动首屏 intro（仅一次）
   * @returns {Promise<void>} 动画结束后 resolve
   */
  play() {
    if (typeof document === 'undefined') return Promise.resolve();
    // 已播放过则跳过
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return Promise.resolve();
    } catch { /* 隐私模式兜底 */ }

    if (prefersReducedMotion()) {
      this._markPlayed();
      return Promise.resolve();
    }

    return this._run();
  }

  _run() {
    return new Promise(resolve => {
      this.el = document.createElement('div');
      this.el.className = 'intro-overlay';
      this.el.setAttribute('aria-hidden', 'true');
      this.el.innerHTML = `
        <div class="intro-overlay__inner">
          <div class="intro-overlay__pages" aria-hidden="true">
            <span></span><span></span><span></span>
          </div>
          <div class="intro-overlay__brand">
            <span class="intro-overlay__brand-en">NEW&nbsp;PAGE</span>
            <span class="intro-overlay__brand-cn">新页</span>
          </div>
          <p class="intro-overlay__tagline">每一次学习，都是打开人生的新一页</p>
        </div>`;
      document.body.appendChild(this.el);
      document.body.classList.add('is-intro');

      // 让浏览器渲染初始态后再触发动画
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.el.classList.add('is-visible');
        });
      });

      // 1.5s 后开始揭幕
      this._timer = setTimeout(() => {
        this.el.classList.add('is-leaving');
      }, 1500);

      // 2.0s 后完全清理
      const cleanup = () => {
        document.body.classList.remove('is-intro');
        this.el?.remove();
        this.el = null;
        clearTimeout(this._timer);
        this._markPlayed();
        resolve();
      };

      // 兜底定时器（防止动画事件未触发）
      setTimeout(cleanup, 2200);
    });
  }

  _markPlayed() {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
  }
}

export const Intro = new IntroManager();
export default Intro;
