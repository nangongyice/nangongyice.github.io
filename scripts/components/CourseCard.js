// ============================================================
// CourseCard.js — 课程卡片
// 弱化电商感：封面 + 标题 + 副标题 + 价格 + 学习人数
// Hover：图片 1.05x 缩放、卡片上移、阴影增强、CTA 浮现（A 级）
// 点击触发共享元素过渡（P6 实施）
// ============================================================

import { Component } from './Component.js';
import { imageUrl, setImageLazy } from '../core/image.js';
import { formatPrice, formatLearnerCount, formatDuration } from '../core/format.js';
import { store } from '../core/store.js';

export class CourseCard extends Component {
  constructor({ course, index = 0, showPrice = true } = {}) {
    super({ course, index, showPrice });
    this._coverUrl = imageUrl(course.coverPrompt, 'landscape_4_3');
  }

  template() {
    const { course, index, showPrice } = this.props;
    const purchased = store.isPurchased(course.id);
    const favorite = store.isFavorite(course.id);
    return `
      <article class="course-card" data-course-id="${course.id}" data-cursor="open" data-reveal data-reveal-delay="${index * 100}">
        <a class="course-card__link" href="/course/${course.id}" data-link data-shared-id="cover-${course.id}" data-shared-from="cover-${course.id}">
          <div class="course-card__cover" data-shared="cover-${course.id}" data-category="${course.categoryId}">
            <img class="course-card__img" alt="${course.title}" data-src="${this._coverUrl}" />
            <span class="course-card__level">${course.level}</span>
            ${purchased ? '<span class="course-card__purchased">已加入书架</span>' : ''}
            <button class="course-card__favorite" type="button" data-role="favorite" aria-label="${favorite ? '取消收藏' : '加入收藏'}" data-stop-link>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="${favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>
          <div class="course-card__body">
            <div class="course-card__meta">
              <span class="course-card__duration">${formatDuration(course.duration)}</span>
              <span class="course-card__separator">·</span>
              <span class="course-card__learners">${formatLearnerCount(course.learnerCount)} 人在学</span>
            </div>
            <h3 class="course-card__title">${course.title}</h3>
            <p class="course-card__subtitle">${course.subtitle}</p>
            <div class="course-card__footer">
              ${showPrice ? `
                <div class="course-card__price">
                  ${course.originalPrice ? `<span class="course-card__price-original">¥${course.originalPrice}</span>` : ''}
                  <span class="course-card__price-current">${formatPrice(course.price)}</span>
                </div>
              ` : ''}
              <span class="course-card__cta">
                <span class="course-card__cta-label">${purchased ? '继续学习' : '查看详情'}</span>
                <span class="course-card__cta-arrow" aria-hidden="true">→</span>
              </span>
            </div>
          </div>
        </a>
      </article>`;
  }

  afterRender() {
    const img = this.el?.querySelector('.course-card__img');
    if (img) setImageLazy(img, { src: this._coverUrl, alt: this.props.course.title, category: this.props.course.categoryId });
  }

  bindEvents() {
    // 收藏按钮（阻止冒泡到 link）
    this.delegate('click', '[data-role="favorite"], [data-stop-link]', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = this.props.course.id;
      store.toggleFavorite(id);
      this.setState({});
    });
  }

  update() {
    // 局部更新：仅刷新收藏/购买状态（避免重新加载图片）
    if (!this.el) return;
    const course = this.props.course;
    const purchased = store.isPurchased(course.id);
    const favorite = store.isFavorite(course.id);
    // 收藏图标
    const favBtn = this.el.querySelector('[data-role="favorite"] svg');
    if (favBtn) {
      favBtn.setAttribute('fill', favorite ? 'currentColor' : 'none');
    }
    // 已购标记
    const cover = this.el.querySelector('.course-card__cover');
    if (cover) {
      const existing = cover.querySelector('.course-card__purchased');
      if (purchased && !existing) {
        const badge = document.createElement('span');
        badge.className = 'course-card__purchased';
        badge.textContent = '已加入书架';
        cover.appendChild(badge);
      } else if (!purchased && existing) {
        existing.remove();
      }
    }
    // CTA 文案
    const ctaLabel = this.el.querySelector('.course-card__cta-label');
    if (ctaLabel) ctaLabel.textContent = purchased ? '继续学习' : '查看详情';
  }
}

/**
 * 用于在父组件模板内联生成的卡片 HTML（不绑事件，依赖父组件扫描）
 */
export function courseCardInlineHTML(course, index = 0) {
  const coverUrl = imageUrl(course.coverPrompt, 'landscape_4_3');
  const purchased = store.isPurchased(course.id);
  const favorite = store.isFavorite(course.id);
  return `
    <article class="course-card" data-course-id="${course.id}" data-cursor="open" data-reveal data-reveal-delay="${index * 100}">
      <a class="course-card__link" href="/course/${course.id}" data-link data-shared-id="cover-${course.id}" data-shared-from="cover-${course.id}">
        <div class="course-card__cover" data-shared="cover-${course.id}" data-category="${course.categoryId}">
          <img class="course-card__img" alt="${course.title}" data-src="${coverUrl}" />
          <span class="course-card__level">${course.level}</span>
          ${purchased ? '<span class="course-card__purchased">已加入书架</span>' : ''}
        </div>
        <div class="course-card__body">
          <div class="course-card__meta">
            <span class="course-card__duration">${formatDuration(course.duration)}</span>
            <span class="course-card__separator">·</span>
            <span class="course-card__learners">${formatLearnerCount(course.learnerCount)} 人在学</span>
          </div>
          <h3 class="course-card__title">${course.title}</h3>
          <p class="course-card__subtitle">${course.subtitle}</p>
          <div class="course-card__footer">
            <div class="course-card__price">
              ${course.originalPrice ? `<span class="course-card__price-original">¥${course.originalPrice}</span>` : ''}
              <span class="course-card__price-current">${formatPrice(course.price)}</span>
            </div>
            <span class="course-card__cta">
              <span class="course-card__cta-label">${purchased ? '继续学习' : '查看详情'}</span>
              <span class="course-card__cta-arrow" aria-hidden="true">→</span>
            </span>
          </div>
        </div>
      </a>
    </article>`;
}
