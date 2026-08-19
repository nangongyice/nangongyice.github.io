// ============================================================
// home.js — 首页视图（完整版）
// 结构：Hero Banner → 精选内容 → 正在发生 → 热门课程 → 创作者 → 品牌区
// 涉及 S1（Hero 3D 翻页）与 S3（章节滚动入场）
// ============================================================

import { api } from '../core/api.js';
import { store } from '../core/store.js';
import { observeReveal } from '../core/intersection.js';
import { qsa, qs } from '../core/dom.js';
import { imageUrl, setImageLazy } from '../core/image.js';
import { formatDuration, formatLearnerCount, formatRelative } from '../core/format.js';
import { HeroBanner } from '../components/HeroBanner.js';
import { CourseCard } from '../components/CourseCard.js';
import { CreatorCard } from '../components/CreatorCard.js';
import { ChapterNumber } from '../components/ChapterNumber.js';
import { courseMap, creatorMap } from '../data/index.js';

const TOTAL_SECTIONS = 7;

export default {
  path: '/',
  title: 'NEW PAGE 新页 · 每一次学习，都是打开人生的新一页',

  async load() {
    const [banners, courses, creators, testimonials] = await Promise.all([
      api.getBanners(),
      api.getCourses({ limit: 8 }),
      api.getCreators({ limit: 4 }),
      api.getTestimonials(),
    ]);
    return { banners, courses, creators, testimonials };
  },

  async mount(root, { data }) {
    const { banners = [], courses = [], creators = [], testimonials = [] } = data;

    root.innerHTML = renderHome({ banners, courses, creators, testimonials });

    // —— 初始化子组件 ——
    this._components = [];

    // HeroBanner
    const heroEl = qs('.hero-banner', root);
    if (heroEl && banners.length) {
      // 替换占位结构为真实 HeroBanner 模板
      const hero = new HeroBanner({ banners });
      hero.mount(heroEl);
      heroEl.classList.add('is-mounted');
      this._components.push(hero);
    }

    // ChapterNumber 组件（首页章节编号 01-05）
    qsa('[data-component="chapter-number"]', root).forEach(el => {
      const index = parseInt(el.dataset.index, 10);
      const total = parseInt(el.dataset.total, 10) || TOTAL_SECTIONS;
      const label = el.dataset.label || '';
      const cn = new ChapterNumber({ index, total, label, align: 'left' });
      cn.mount(el);
      this._components.push(cn);
    });

    // CourseCard 组件（精选 + 热门）
    const coursesForFeatured = courses.slice(0, 6);
    qsa('.home-featured__grid [data-course-id]', root).forEach((el, i) => {
      const course = courseMap[el.dataset.courseId];
      if (!course) return;
      // 直接复用 CourseCard 的逻辑但挂载到已渲染的 article
      // 由于已经渲染了结构，我们只附加事件 + 图片懒加载
      wireCourseCard(el, course);
    });

    qsa('.home-popular__grid [data-course-id]', root).forEach((el, i) => {
      const course = courseMap[el.dataset.courseId];
      if (!course) return;
      wireCourseCard(el, course);
    });

    // CreatorCard 组件
    qsa('.home-creators__grid [data-creator-id]', root).forEach((el, i) => {
      const creator = creatorMap[el.dataset.creatorId];
      if (!creator) return;
      const card = new CreatorCard({ creator, index: i });
      // 替换占位结构
      el.innerHTML = '';
      card.mount(el);
      this._components.push(card);
    });

    observeReveal(root);
    this._root = root;
  },

  unmount() {
    this._components?.forEach(c => c?.unmount?.());
    this._components = [];
    // 解绑 course card 上的事件（已通过 wireCourseCard 中的委托挂载到 document，需要手动清理）
    // 简化处理：依赖 document 委托，路由切换后元素被清空，委托自然失效
  },
};

function renderHome({ banners, courses, creators, testimonials }) {
  return `
    <section class="hero-banner" data-component="hero-banner"></section>

    ${sectionFeatured({ courses: courses.slice(0, 6) })}
    ${sectionHappening({ courses: courses.filter(c => c.happening).slice(0, 3), testimonials })}
    ${sectionPopularCourses({ courses: courses.slice(0, 8) })}
    ${sectionCreators({ creators })}
    ${sectionBrand()}
  `;
}

function sectionFeatured({ courses }) {
  return `
    <section class="section home-featured" id="featured" data-reveal-group>
      <div class="container">
        <header class="section__header" data-reveal>
          <span class="section__eyebrow">FEATURED · 精选内容</span>
          <div data-component="chapter-number" data-index="1" data-total="${TOTAL_SECTIONS}" data-label="Featured"></div>
          <h2 class="section__title">本周值得翻开</h2>
          <p class="section__desc">由编辑与算法共同挑选的 6 篇内容，覆盖设计、产品、写作、心智四个维度。</p>
        </header>
        <div class="home-featured__grid">
          ${courses.map((c, i) => courseCardPlaceholder(c, i)).join('')}
        </div>
      </div>
    </section>`;
}

function sectionHappening({ courses, testimonials }) {
  return `
    <section class="section home-happening" id="happening" data-reveal-group style="background: var(--color-bg-mist);">
      <div class="container">
        <header class="section__header" data-reveal>
          <span class="section__eyebrow">HAPPENING · 正在发生</span>
          <div data-component="chapter-number" data-index="2" data-total="${TOTAL_SECTIONS}" data-label="Happening"></div>
          <h2 class="section__title">今天的知识现场</h2>
        </header>
        <div class="home-happening__list">
          ${courses.map((c, i) => `
            <article class="happening-item" data-reveal data-reveal-delay="${i * 100}">
              <a href="/course/${c.id}" data-link>
                <span class="happening-item__time">${formatRelative(c.publishedAt)}</span>
                <h3 class="happening-item__title">${c.title}</h3>
                <p class="happening-item__desc">${c.subtitle}</p>
              </a>
            </article>
          `).join('')}
        </div>
        ${testimonials.length ? `
          <div class="home-happening__testimonials" data-reveal>
            ${testimonials.slice(0, 3).map(t => `
              <blockquote class="testimonial">
                <p class="testimonial__content">"${t.content}"</p>
                <footer class="testimonial__author">— ${t.userName} · ${t.userRole}</footer>
              </blockquote>
            `).join('')}
          </div>` : ''}
      </div>
    </section>`;
}

function sectionPopularCourses({ courses }) {
  return `
    <section class="section home-popular" id="popular" data-reveal-group>
      <div class="container">
        <header class="section__header" data-reveal>
          <span class="section__eyebrow">COURSES · 热门课程</span>
          <div data-component="chapter-number" data-index="3" data-total="${TOTAL_SECTIONS}" data-label="Courses"></div>
          <h2 class="section__title">不必通读所有书，<br/>但该读对的那一本</h2>
        </header>
        <div class="home-popular__grid">
          ${courses.map((c, i) => courseCardPlaceholder(c, i)).join('')}
        </div>
      </div>
    </section>`;
}

function sectionCreators({ creators }) {
  return `
    <section class="section home-creators" id="creators" data-reveal-group style="background: var(--color-bg-mist);">
      <div class="container">
        <header class="section__header" data-reveal>
          <span class="section__eyebrow">CREATORS · 创作者</span>
          <div data-component="chapter-number" data-index="4" data-total="${TOTAL_SECTIONS}" data-label="Creators"></div>
          <h2 class="section__title">从一页开始，<br/>写完整个世界</h2>
        </header>
        <div class="home-creators__grid">
          ${creators.map((c, i) => `
            <article class="creator-card" data-creator-id="${c.id}" data-cursor="open" data-reveal data-reveal-delay="${i * 100}"></article>
          `).join('')}
        </div>
      </div>
    </section>`;
}

function sectionBrand() {
  return `
    <section class="section home-brand" id="brand" data-reveal-group>
      <div class="container">
        <div class="home-brand__inner" data-reveal>
          <span class="section__eyebrow">PHILOSOPHY · 关于「页」</span>
          <div data-component="chapter-number" data-index="5" data-total="${TOTAL_SECTIONS}" data-label="Philosophy"></div>
          <h2 class="home-brand__title">页，是单位<br/>也是阶段</h2>
          <p class="home-brand__desc">我们以页为名，因为相信学习不该是一次性购买，而是一段被持续翻开的旅程。每一次学习，都是打开人生的新一页。</p>
          <a href="/discover" class="btn btn--primary btn--lg btn--arrow" data-link>
            <span class="btn__label">开始你的下一页</span>
            <span class="btn__arrow" aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>`;
}

/** 占位 article 结构，wireCourseCard 会填充内容 */
function courseCardPlaceholder(course, index) {
  return `
    <article class="course-card" data-course-id="${course.id}" data-cursor="open" data-reveal data-reveal-delay="${index * 100}"></article>`;
}

/**
 * 为已存在的 .course-card article 填充内容（图片懒加载 + 收藏按钮）
 */
function wireCourseCard(el, course) {
  const purchased = store.isPurchased(course.id);
  const favorite = store.isFavorite(course.id);
  const coverUrl = imageUrl(course.coverPrompt, 'landscape_4_3');

  el.innerHTML = `
    <a class="course-card__link" href="/course/${course.id}" data-link data-shared-id="cover-${course.id}" data-shared-from="cover-${course.id}">
      <div class="course-card__cover" data-shared="cover-${course.id}" data-category="${course.categoryId}">
        <img class="course-card__img" alt="${course.title}" data-src="${coverUrl}" />
        <span class="course-card__level">${course.level}</span>
        ${purchased ? '<span class="course-card__purchased">已加入书架</span>' : ''}
        <button class="course-card__favorite" type="button" data-role="favorite" data-course-id="${course.id}" aria-label="${favorite ? '取消收藏' : '加入收藏'}">
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
          <div class="course-card__price">
            ${course.originalPrice ? `<span class="course-card__price-original">¥${course.originalPrice}</span>` : ''}
            <span class="course-card__price-current">¥${course.price}</span>
          </div>
          <span class="course-card__cta">
            <span class="course-card__cta-label">${purchased ? '继续学习' : '查看详情'}</span>
            <span class="course-card__cta-arrow" aria-hidden="true">→</span>
          </span>
        </div>
      </div>
    </a>`;

  // 懒加载图片
  const img = el.querySelector('.course-card__img');
  if (img) setImageLazy(img, { src: coverUrl, alt: course.title, category: course.categoryId });

  // 收藏按钮：document 级委托，会在 unmount 时随元素移除而失效（简化处理）
  // 这里不做事件绑定，依赖父组件或全局监听
}

// 全局监听收藏按钮点击（避免每个卡片单独绑定）
document.addEventListener('click', (e) => {
  const favBtn = e.target.closest('[data-role="favorite"]');
  if (!favBtn) return;
  e.preventDefault();
  e.stopPropagation();
  const courseId = favBtn.dataset.courseId;
  if (!courseId) return;
  const wasFav = store.isFavorite(courseId);
  store.toggleFavorite(courseId);
  // 更新图标
  const svg = favBtn.querySelector('svg');
  if (svg) svg.setAttribute('fill', !wasFav ? 'currentColor' : 'none');
  favBtn.setAttribute('aria-label', !wasFav ? '取消收藏' : '加入收藏');
}, { capture: true });
