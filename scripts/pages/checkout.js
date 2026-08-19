// ============================================================
// checkout.js — 订单确认 / 模拟支付
// 流程：课程详情 → 订单确认 → 支付成功 → 封面飞入书架（S5）
// ============================================================

import { api } from '../core/api.js';
import { store } from '../core/store.js';
import { observeReveal } from '../core/intersection.js';
import { qs } from '../core/dom.js';
import { imageUrl, setImageSync } from '../core/image.js';
import { formatPrice, formatDuration, formatLearnerCount } from '../core/format.js';
import { ChapterNumber } from '../components/ChapterNumber.js';
import { Toast } from '../components/Toast.js';
import { PageTransition } from '../components/PageTransition.js';
import { eventBus, EVENTS } from '../app/event-bus.js';
import { navigate } from '../app/router.js';
import { prefersReducedMotion } from '../core/animation.js';
import { courseMap, creatorMap } from '../data/index.js';

export default {
  path: '/checkout',
  title: '订单确认 · NEW PAGE 新页',

  async load() {
    const cart = store.get().cart;
    if (!cart) return { empty: true };
    const course = courseMap[cart.courseId];
    if (!course) return { empty: true };
    const creator = creatorMap[course.creatorId] || null;
    return { course, creator, qty: cart.qty || 1 };
  },

  async mount(root, { data }) {
    if (data.empty) {
      root.innerHTML = this._renderEmpty();
      this._bindEmpty(root);
      observeReveal(root);
      return;
    }

    const { course, creator, qty: initQty } = data;
    this._course = course;
    this._creator = creator;
    this._state = { qty: Math.max(1, initQty), phase: 'review' }; // review | processing | success
    this._components = [];

    root.innerHTML = this._renderShell();
    this._root = root;

    // 章节编号
    this._root.querySelectorAll('[data-component="chapter-number"]').forEach(el => {
      const cn = new ChapterNumber({
        index: parseInt(el.dataset.index, 10),
        total: 2,
        label: el.dataset.label,
      });
      cn.mount(el);
      this._components.push(cn);
    });

    // 同步加载封面（用作飞入书架起点）
    const coverImg = qs('.checkout-summary__cover img', root);
    if (coverImg) {
      setImageSync(coverImg, {
        src: imageUrl(course.coverPrompt, 'landscape_4_3'),
        alt: course.title,
        category: course.categoryId,
      });
    }

    this._bindEvents(root);
    observeReveal(root);
  },

  unmount() {
    this._components?.forEach(c => c?.unmount?.());
    this._components = [];
    clearTimeout(this._processingTimer);
  },

  _renderShell() {
    const course = this._course;
    const creator = this._creator;
    const original = course.originalPrice || course.price;
    const savings = course.originalPrice ? course.originalPrice - course.price : 0;
    return `
      <section class="checkout-page">
        <div class="checkout-hero section">
          <div class="container">
            <header class="section__header" data-reveal>
              <span class="section__eyebrow">CHECKOUT · 订单确认</span>
              <div data-component="chapter-number" data-index="1" data-total="2" data-label="Checkout"></div>
              <h1 class="section__title">翻开下一页前<br/>先确认这一次</h1>
              <p class="section__desc">在模拟支付环节，所有数据均保留在你的浏览器本地，不发生任何真实交易。</p>
            </header>
          </div>
        </div>

        <div class="container checkout-body">
          <div class="checkout-main" data-reveal>
            <div class="checkout-summary" data-role="summary">
              <div class="checkout-summary__cover" data-shared="cover-${course.id}" data-category="${course.categoryId}">
                <img alt="${course.title}" />
                <span class="checkout-summary__level">${course.level}</span>
              </div>
              <div class="checkout-summary__body">
                <nav class="breadcrumb" aria-label="路径">
                  <a href="/discover" data-link>发现</a>
                  <span class="breadcrumb__sep">/</span>
                  <a href="/course/${course.id}" data-link>${course.title}</a>
                  <span class="breadcrumb__sep">/</span>
                  <span class="breadcrumb__current">订单确认</span>
                </nav>
                <div class="checkout-summary__tags">
                  <span class="tag tag--brand">${categoryName(course.categoryId)}</span>
                  <span class="tag tag--outline">${course.level}</span>
                </div>
                <h2 class="checkout-summary__title">${course.title}</h2>
                <p class="checkout-summary__subtitle">${course.subtitle}</p>
                <div class="checkout-summary__meta">
                  ${creator ? `<span class="checkout-summary__author">主讲 · ${creator.name}</span><span class="checkout-summary__sep">·</span>` : ''}
                  <span>${formatDuration(course.duration)}</span>
                  <span class="checkout-summary__sep">·</span>
                  <span>${course.chapters?.length || 0} 章</span>
                  <span class="checkout-summary__sep">·</span>
                  <span>${formatLearnerCount(course.learnerCount)} 人在学</span>
                </div>
                <div class="checkout-summary__qty">
                  <span class="checkout-summary__qty-label">数量</span>
                  <div class="qty-stepper" data-role="qty-stepper">
                    <button class="qty-stepper__btn" type="button" data-role="qty-dec" aria-label="减少">−</button>
                    <input class="qty-stepper__input" type="text" inputmode="numeric" value="${this._state.qty}" data-role="qty-input" aria-label="数量" readonly />
                    <button class="qty-stepper__btn" type="button" data-role="qty-inc" aria-label="增加">+</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside class="checkout-aside" data-reveal data-reveal-delay="120">
            <div class="checkout-card">
              <h3 class="checkout-card__title">订单明细</h3>
              <dl class="checkout-card__list">
                <div class="checkout-card__row">
                  <dt>课程单价</dt>
                  <dd>${formatPrice(course.price)}</dd>
                </div>
                <div class="checkout-card__row">
                  <dt>数量</dt>
                  <dd data-role="qty-display">×${this._state.qty}</dd>
                </div>
                ${savings > 0 ? `
                  <div class="checkout-card__row checkout-card__row--saving">
                    <dt>限时优惠</dt>
                    <dd>−${formatPrice(savings)}</dd>
                  </div>` : ''}
                <div class="checkout-card__row checkout-card__row--original">
                  <dt>原价</dt>
                  <dd>${formatPrice(original * this._state.qty)}</dd>
                </div>
              </dl>
              <div class="checkout-card__total">
                <span class="checkout-card__total-label">应付</span>
                <span class="checkout-card__total-amount" data-role="total-amount">${formatPrice(course.price * this._state.qty)}</span>
              </div>
              ${!store.isLoggedIn() ? `
                <p class="checkout-card__hint">登录后即可完成模拟支付，并保留你的学习进度。</p>
                <a class="btn btn--secondary btn--block" href="/login" data-link>先去登录</a>
                <button class="btn btn--primary btn--lg btn--block btn--arrow checkout-card__pay is-disabled" data-role="pay" disabled>
                  <span class="btn__label">请先登录</span>
                </button>` : `
                <button class="btn btn--primary btn--lg btn--block btn--arrow checkout-card__pay" data-role="pay" data-cursor="open">
                  <span class="btn__label">模拟支付 ${formatPrice(course.price * this._state.qty)}</span>
                  <span class="btn__arrow" aria-hidden="true">→</span>
                </button>`}
              <p class="checkout-card__safety">支付过程仅模拟，无任何真实交易。完成后课程将自动加入你的书架。</p>
            </div>
          </aside>
        </div>

        <div class="checkout-processing" data-role="processing" aria-hidden="true">
          <div class="checkout-processing__inner">
            <div class="checkout-processing__page" aria-hidden="true">
              <span></span><span></span><span></span>
            </div>
            <p class="checkout-processing__text">正在翻开这一页…</p>
          </div>
        </div>
      </section>`;
  },

  _bindEvents(root) {
    root.addEventListener('click', async (e) => {
      const dec = e.target.closest('[data-role="qty-dec"]');
      if (dec) { this._state.qty = Math.max(1, this._state.qty - 1); this._updateQty(); return; }
      const inc = e.target.closest('[data-role="qty-inc"]');
      if (inc) { this._state.qty = Math.min(99, this._state.qty + 1); this._updateQty(); return; }
      const pay = e.target.closest('[data-role="pay"]');
      if (pay && !pay.disabled) { await this._handlePay(); return; }
    });
  },

  _updateQty() {
    const course = this._course;
    const qty = this._state.qty;
    const input = qs('[data-role="qty-input"]', this._root);
    const display = qs('[data-role="qty-display"]', this._root);
    const total = qs('[data-role="total-amount"]', this._root);
    const pay = qs('[data-role="pay"]', this._root);
    if (input) input.value = qty;
    if (display) display.textContent = `×${qty}`;
    if (total) total.textContent = formatPrice(course.price * qty);
    if (pay && store.isLoggedIn()) {
      pay.querySelector('.btn__label').textContent = `模拟支付 ${formatPrice(course.price * qty)}`;
    }
    store.setCart(course.id, qty);
  },

  async _handlePay() {
    if (this._state.phase !== 'review') return;
    this._state.phase = 'processing';
    const course = this._course;

    const processing = qs('[data-role="processing"]', this._root);
    if (processing) {
      processing.classList.add('is-visible');
      processing.setAttribute('aria-hidden', 'false');
    }

    // 调用 api.purchase 模拟支付
    try { await api.purchase(course.id); } catch (e) { /* 演示容错 */ }

    // 标记已购 + 清空购物车
    store.addPurchase(course.id);
    store.clearCart();
    eventBus.emit(EVENTS.PURCHASE_SUCCESS, { courseId: course.id });

    // 模拟支付延迟
    await new Promise(r => setTimeout(r, prefersReducedMotion() ? 200 : 900));

    // 隐藏 processing
    if (processing) {
      processing.classList.remove('is-visible');
      processing.setAttribute('aria-hidden', 'true');
    }

    // 飞入书架动画（S5）
    const coverEl = qs('.checkout-summary__cover', this._root);
    if (coverEl && !prefersReducedMotion()) {
      // Toast 同时提示
      Toast.show('支付成功，已加入书架', { variant: 'success' });
      try { await PageTransition.flyIntoBookshelf(coverEl, { duration: 1100 }); }
      catch (e) { /* 兜底 */ }
    } else {
      Toast.show('支付成功，已加入书架', { variant: 'success' });
    }

    this._state.phase = 'success';
    // 跳转至书架
    setTimeout(() => navigate('/bookshelf', { force: true }), 220);
  },

  _renderEmpty() {
    return `
      <section class="checkout-page">
        <div class="container" style="padding: 80px 0;">
          <div class="empty-state" data-reveal>
            <div class="empty-state__visual" aria-hidden="true">
              <svg viewBox="0 0 80 80" width="80" height="80" fill="none" stroke="currentColor" stroke-width="1.4">
                <rect x="14" y="22" width="52" height="42" rx="3" />
                <path d="M14 30h52" />
                <path d="M28 22v-6a6 6 0 0 1 12 0v6" stroke-linecap="round" />
              </svg>
            </div>
            <h3 class="empty-state__title">购物车是空的</h3>
            <p class="empty-state__desc">从课程详情页选择"立即购买"，再来这里翻开下一页。</p>
            <a class="btn btn--primary btn--arrow" href="/discover" data-link>
              <span class="btn__label">去发现课程</span>
              <span class="btn__arrow" aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>`;
  },

  _bindEmpty(root) {
    // 静态空状态，无需事件
  },
};

function categoryName(id) {
  const map = { design: '设计', tech: '技术', product: '产品', business: '商业', writing: '写作', art: '艺术', mind: '心智', growth: '成长' };
  return map[id] || id;
}
