// ============================================================
// HeroBanner.js — 3D 翻页 + 鼠标视差 + 自动播放（S1）
// - 5s/张自动切换
// - rotateY 翻页：旧页 0→-90（出左），新页 90→0（从右入）
// - 鼠标移动时不同层按 data-depth 视差位移
// - 移动端降级为横向滑动
// ============================================================

import { Component } from './Component.js';
import { setImageSync, imageUrl } from '../core/image.js';
import { rafThrottle, prefersReducedMotion } from '../core/animation.js';

const AUTOPLAY_MS = 5000;
const TRANSITION_MS = 1000;

export class HeroBanner extends Component {
  constructor({ banners = [] } = {}) {
    super({ banners });
    this.state = { activeIndex: 0, isPlaying: true };
    this._timer = null;
    this._isMobile = window.matchMedia('(max-width: 768px)').matches;
    this._reduceMotion = prefersReducedMotion();
  }

  template() {
    const { banners } = this.props;
    if (!banners || !banners.length) {
      return `<div class="hero-banner"><div class="hero-banner__empty"></div></div>`;
    }
    return `
      <div class="hero-banner__viewport" data-role="viewport">
        ${banners.map((b, i) => this._slideHTML(b, i)).join('')}
      </div>
      <div class="hero-banner__chrome">
        <div class="hero-banner__dots">
          ${banners.map((_, i) => `<button class="hero-banner__dot${i === 0 ? ' is-active' : ''}" data-role="dot" data-index="${i}" aria-label="切换到第 ${i + 1} 张"></button>`).join('')}
        </div>
        <div class="hero-banner__counter">
          <span class="hero-banner__counter-current" data-role="counter-current">01</span>
          <span class="hero-banner__counter-sep">/</span>
          <span class="hero-banner__counter-total">${String(banners.length).padStart(2, '0')}</span>
        </div>
      </div>`;
  }

  _slideHTML(banner, i) {
    const bgUrl = imageUrl(banner.imagePrompt, 'landscape_16_9');
    const titleAccent = banner.titleAccent
      ? `<span class="hero-banner__title hero-banner__title--accent">${banner.titleAccent}</span>`
      : '';
    return `
      <article class="hero-banner__slide${i === 0 ? ' is-active' : ''}" data-role="slide" data-index="${i}" data-accent="${banner.accent || 'brand'}">
        <div class="hero-banner__bg" data-depth="0.3" data-role="bg">
          <img alt="${banner.title}" data-src="${bgUrl}" />
        </div>
        <div class="hero-banner__scrim" data-depth="0.1"></div>
        <div class="hero-banner__content" data-depth="0.6">
          <span class="hero-banner__eyebrow">${banner.eyebrow}</span>
          <h1 class="hero-banner__title">${banner.title}</h1>
          ${titleAccent}
          <p class="hero-banner__subtitle">${banner.subtitle}</p>
          <a href="${banner.ctaLink}" class="btn btn--primary btn--lg btn--arrow hero-banner__cta" data-link>
            <span class="btn__label">${banner.ctaText}</span>
            <span class="btn__arrow" aria-hidden="true">→</span>
          </a>
        </div>
      </article>`;
  }

  afterRender() {
    if (!this.el) return;
    // 同步加载首张图（不懒加载），其余可懒加载
    const slides = this.el.querySelectorAll('[data-role="slide"]');
    slides.forEach((slide, i) => {
      const img = slide.querySelector('img[data-src]');
      if (!img) return;
      if (i === 0) {
        setImageSync(img, { src: img.dataset.src, alt: img.alt, category: 'default' });
      } else {
        // 预加载其他张（在切到时再加载也行，这里提前加载保证切换流畅）
        const preload = new Image();
        preload.src = img.dataset.src;
        img.dataset.src = img.dataset.src; // 保留，激活时再用
      }
    });

    this._viewport = this.el.querySelector('[data-role="viewport"]');
    this._current = this.el.querySelector('.hero-banner__slide.is-active');

    // 启动自动播放
    if (this.state.isPlaying && !this._reduceMotion) this._startAutoplay();

    // 绑定鼠标视差（桌面 + 非 reduce-motion）
    if (!this._isMobile && !this._reduceMotion) {
      this._onMouseMove = rafThrottle((e) => this._handleParallax(e));
      this._viewport?.addEventListener('mousemove', this._onMouseMove);
      this._onMouseLeave = () => this._resetParallax();
      this._viewport?.addEventListener('mouseleave', this._onMouseLeave);
    }

    // 绑定点击 dots
    this.delegate('click', '[data-role="dot"]', (e, target) => {
      const idx = parseInt(target.dataset.index, 10);
      this.goTo(idx);
    });

    // 鼠标进入暂停
    this._onEnter = () => this.pause();
    this._onLeave = () => this.play();
    this.el.addEventListener('mouseenter', this._onEnter);
    this.el.addEventListener('mouseleave', this._onLeave);
  }

  _startAutoplay() {
    this._stopAutoplay();
    this._timer = setInterval(() => this.next(), AUTOPLAY_MS);
  }

  _stopAutoplay() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  play() {
    if (!this.state.isPlaying && !this._reduceMotion) {
      this.state.isPlaying = true;
      this._startAutoplay();
    }
  }

  pause() {
    this.state.isPlaying = false;
    this._stopAutoplay();
  }

  next() {
    const { banners } = this.props;
    const next = (this.state.activeIndex + 1) % banners.length;
    this.goTo(next);
  }

  prev() {
    const { banners } = this.props;
    const prev = (this.state.activeIndex - 1 + banners.length) % banners.length;
    this.goTo(prev);
  }

  goTo(targetIndex) {
    if (targetIndex === this.state.activeIndex) return;
    const { banners } = this.props;
    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const slides = this.el.querySelectorAll('[data-role="slide"]');
    const oldEl = slides[this.state.activeIndex];
    const newEl = slides[targetIndex];

    // 加载新图（如果还没加载）
    const newImg = newEl.querySelector('img[data-src]');
    if (newImg && newImg.dataset.src && !newImg.src) {
      setImageSync(newImg, { src: newImg.dataset.src, alt: newImg.alt, category: 'default' });
    }

    // 切换 class
    oldEl.classList.remove('is-active');
    oldEl.classList.add('is-outgoing');
    newEl.classList.remove('is-outgoing');
    newEl.classList.add('is-active');

    // 清理 outgoing 状态
    setTimeout(() => {
      oldEl.classList.remove('is-outgoing');
    }, TRANSITION_MS + 50);

    // 更新 dots
    this.el.querySelectorAll('[data-role="dot"]').forEach((d, i) => {
      d.classList.toggle('is-active', i === targetIndex);
    });

    // 更新计数
    const counter = this.el.querySelector('[data-role="counter-current"]');
    if (counter) counter.textContent = String(targetIndex + 1).padStart(2, '0');

    this.state.activeIndex = targetIndex;
  }

  _handleParallax(e) {
    if (!this._viewport) return;
    const rect = this._viewport.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    const active = this.el.querySelector('.hero-banner__slide.is-active');
    if (!active) return;
    active.querySelectorAll('[data-depth]').forEach(layer => {
      const depth = parseFloat(layer.dataset.depth || 0.5);
      const tx = x * 30 * depth;
      const ty = y * 18 * depth;
      layer.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    });
  }

  _resetParallax() {
    this.el?.querySelectorAll('[data-depth]').forEach(layer => {
      layer.style.transform = '';
    });
  }

  onUnmount() {
    this._stopAutoplay();
    if (this._onMouseMove && this._viewport) this._viewport.removeEventListener('mousemove', this._onMouseMove);
    if (this._onMouseLeave && this._viewport) this._viewport.removeEventListener('mouseleave', this._onMouseLeave);
    if (this._onEnter) this.el?.removeEventListener('mouseenter', this._onEnter);
    if (this._onLeave) this.el?.removeEventListener('mouseleave', this._onLeave);
  }
}
