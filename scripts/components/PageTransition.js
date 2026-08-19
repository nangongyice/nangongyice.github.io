// ============================================================
// PageTransition.js — 页面转场 / 共享元素 / 飞入书架
// S4: 旧页前进淡出 → 新页展开淡入
// S5: 购买成功 → 封面飞入书架导航
// ============================================================

import { fromHTML, nextFrame } from '../core/dom.js';
import { tween, prefersReducedMotion, easing, rafThrottle } from '../core/animation.js';
import { eventBus, EVENTS } from '../app/event-bus.js';

class PageTransitionManager {
  constructor() {
    this.overlay = null;
    this._initOverlay();
  }

  _initOverlay() {
    if (typeof document === 'undefined') return;
    this.overlay = document.querySelector('[data-component="page-transition"]');
    if (!this.overlay) {
      this.overlay = fromHTML('<div class="page-transition-overlay" data-component="page-transition" aria-hidden="true"></div>');
      document.getElementById('app')?.appendChild(this.overlay);
    }
  }

  /**
   * 共享元素过渡：从 source 移动到 target（FLIP）
   * @param {HTMLElement} source - 起始元素（如卡片封面）
   * @param {HTMLElement} target - 目标元素（如详情页封面）
   */
  async playShared(source, target) {
    if (!source || !target) return;
    if (prefersReducedMotion()) return;
    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    // 克隆 source 作为飞行的替身
    const clone = source.cloneNode(true);
    clone.classList.add('page-transition-clone');
    Object.assign(clone.style, {
      position: 'fixed',
      left: sourceRect.left + 'px',
      top: sourceRect.top + 'px',
      width: sourceRect.width + 'px',
      height: sourceRect.height + 'px',
      margin: '0',
      borderRadius: getComputedStyle(source).borderRadius,
      zIndex: '999',
      pointerEvents: 'none',
      transition: 'none',
      transformOrigin: 'top left',
    });
    document.body.appendChild(clone);

    // 隐藏 target 自身（飞行结束时再显示）
    target.style.opacity = '0';

    await nextFrame();

    // 计算位移和缩放
    const dx = targetRect.left - sourceRect.left;
    const dy = targetRect.top - sourceRect.top;
    const sx = targetRect.width / sourceRect.width;
    const sy = targetRect.height / sourceRect.height;

    clone.style.transition = `transform 500ms cubic-bezier(0.65, 0.05, 0.36, 1), border-radius 500ms cubic-bezier(0.65, 0.05, 0.36, 1)`;
    clone.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    clone.style.borderRadius = getComputedStyle(target).borderRadius;

    await new Promise(r => setTimeout(r, 500));

    target.style.opacity = '';
    target.style.animation = 'page-transition-target-in 400ms cubic-bezier(0.22, 1, 0.36, 1)';
    clone.remove();
    setTimeout(() => { target.style.animation = ''; }, 500);
  }

  /**
   * 购买成功 → 封面飞入书架导航（DEMO 核心记忆点 S5）
   * @param {HTMLElement} coverEl - 课程封面元素
   * @param {Object} [opts]
   * @param {number} [opts.duration=1100]
   */
  async flyIntoBookshelf(coverEl, opts = {}) {
    if (!coverEl) return;
    const { duration = 1100 } = opts;
    const bookshelfNav = document.querySelector('[data-nav-item="bookshelf"]');
    if (!bookshelfNav) {
      console.warn('[PageTransition] bookshelf nav not found');
      return;
    }

    const sourceRect = coverEl.getBoundingClientRect();
    const targetRect = bookshelfNav.getBoundingClientRect();

    // 克隆封面
    const clone = coverEl.cloneNode(true);
    clone.classList.add('page-transition-clone', 'page-transition-fly');
    Object.assign(clone.style, {
      position: 'fixed',
      left: sourceRect.left + 'px',
      top: sourceRect.top + 'px',
      width: sourceRect.width + 'px',
      height: sourceRect.height + 'px',
      margin: '0',
      borderRadius: getComputedStyle(coverEl).borderRadius,
      zIndex: '9999',
      pointerEvents: 'none',
      transition: 'none',
      transformOrigin: 'center',
      boxShadow: '0 24px 56px rgba(26,26,26,0.30)',
    });
    document.body.appendChild(clone);

    if (prefersReducedMotion()) {
      clone.remove();
      bookshelfNav.classList.add('is-bump');
      setTimeout(() => bookshelfNav.classList.remove('is-bump'), 600);
      return;
    }

    // 飞行终点：书架图标中心
    const startX = sourceRect.left + sourceRect.width / 2;
    const startY = sourceRect.top + sourceRect.height / 2;
    const endX = targetRect.left + targetRect.width / 2;
    const endY = targetRect.top + targetRect.height / 2;

    // 中间控制点（贝塞尔）：先轻微上浮再下落
    const midX = (startX + endX) / 2;
    const midY = Math.min(startY, endY) - 120;

    // 关键帧动画
    const startW = sourceRect.width;
    const startH = sourceRect.height;
    const endSize = 28;

    await tween(duration, (t) => {
      // 二次贝塞尔
      const u = 1 - t;
      const x = u * u * startX + 2 * u * t * midX + t * t * endX;
      const y = u * u * startY + 2 * u * t * midY + t * t * endY;

      // 尺寸：先轻微放大（0-15%）再缩小到 endSize
      let scale;
      if (t < 0.15) {
        scale = 1 + (t / 0.15) * 0.1;  // 1 → 1.1
      } else {
        const tt = (t - 0.15) / 0.85;
        scale = 1.1 - tt * (1.1 - endSize / startW);
      }
      const rotate = t * 8; // 0 → 8deg

      const w = startW * scale;
      const h = startH * scale;
      clone.style.left = (x - w / 2) + 'px';
      clone.style.top = (y - h / 2) + 'px';
      clone.style.width = w + 'px';
      clone.style.height = h + 'px';
      clone.style.transform = `rotate(${rotate}deg)`;
      clone.style.opacity = String(1 - Math.max(0, (t - 0.85) * 6));
    }, 'easeInOut');

    // 书架导航 bump + badge +1 + Toast
    bookshelfNav.classList.add('is-bump');
    setTimeout(() => bookshelfNav.classList.remove('is-bump'), 600);
    eventBus.emit(EVENTS.BOOKSHELF_UPDATED, { bump: true });
    clone.remove();
  }

  /**
   * 显示一个简单的"翻页" overlay（页面切换时使用）
   */
  async playPageTurn(duration = 450) {
    if (!this.overlay || prefersReducedMotion()) return;
    this.overlay.style.transition = 'none';
    this.overlay.style.transform = 'translateY(-100%)';
    this.overlay.style.opacity = '0';
    await nextFrame();
    this.overlay.style.transition = `transform ${duration}ms cubic-bezier(0.65, 0.05, 0.36, 1), opacity ${duration}ms ease`;
    this.overlay.style.transform = 'translateY(0)';
    this.overlay.style.opacity = '1';
    await new Promise(r => setTimeout(r, duration * 0.6));
    this.overlay.style.transform = 'translateY(100%)';
    this.overlay.style.opacity = '0';
    await new Promise(r => setTimeout(r, duration));
    this.overlay.style.transition = 'none';
    this.overlay.style.transform = '';
  }
}

export const PageTransition = new PageTransitionManager();
export default PageTransition;
