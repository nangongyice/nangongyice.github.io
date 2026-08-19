// ============================================================
// course-detail.js — 课程详情页
// 结构：封面+标题+作者+价格+CTA → 介绍 → 目录 → 收获 → 创作者 → 相关
// 共享元素：封面带 data-shared="cover-{id}" 接收 FLIP
// ============================================================

import { api } from '../core/api.js';
import { store } from '../core/store.js';
import { observeReveal } from '../core/intersection.js';
import { qsa, qs } from '../core/dom.js';
import { imageUrl, setImageLazy, setImageSync } from '../core/image.js';
import { formatPrice, formatLearnerCount, formatDuration, formatDateCN } from '../core/format.js';
import { Avatar } from '../components/Avatar.js';
import { ChapterNumber } from '../components/ChapterNumber.js';
import { navigate } from '../app/router.js';
import { Toast } from '../components/Toast.js';
import { eventBus, EVENTS } from '../app/event-bus.js';

export default {
  path: '/course/:id',
  title: '课程详情 · NEW PAGE 新页',

  async load({ params }) {
    const id = params.id;
    const [course, related, testimonials] = await Promise.all([
      api.getCourse(id),
      api.getRelatedCourses(id, 4),
      api.getTestimonials(id),
    ]);
    if (!course) return { notFound: true };
    const creator = await api.getCreator(course.creatorId);
    return { course, creator, related, testimonials };
  },

  async mount(root, { data }) {
    if (data.notFound) {
      root.innerHTML = notFoundHTML();
      return;
    }
    const { course, creator, related = [], testimonials = [] } = data;
    // 记录最近浏览
    store.pushRecent(course.id);

    root.innerHTML = renderDetail({ course, creator, related, testimonials });

    // —— 初始化子组件 ——
    this._components = [];

    // 创作者头像
    const avatarSlot = qs('[data-role="creator-avatar"]', root);
    if (avatarSlot && creator) {
      const avatar = new Avatar({
        prompt: creator.avatarPrompt,
        name: creator.name,
        alt: creator.name,
        size: 'xl',
      });
      avatar.mount(avatarSlot);
      this._components.push(avatar);
    }

    // 章节编号
    qsa('[data-component="chapter-number"]', root).forEach(el => {
      const cn = new ChapterNumber({
        index: parseInt(el.dataset.index, 10),
        total: parseInt(el.dataset.total, 10) || 5,
        label: el.dataset.label || '',
      });
      cn.mount(el);
      this._components.push(cn);
    });

    // 同步加载详情页封面（共享元素目标）
    const coverImg = qs('.course-detail__cover img', root);
    if (coverImg) {
      setImageSync(coverImg, {
        src: imageUrl(course.coverPrompt, 'landscape_4_3'),
        alt: course.title,
        category: course.categoryId,
      });
    }

    // 懒加载相关课程封面
    qsa('.related-course img[data-src]', root).forEach(img => {
      setImageLazy(img, { src: img.dataset.src, alt: img.alt });
    });

    // 评价用户头像
    qsa('.testimonial__avatar img[data-src]', root).forEach(img => {
      setImageLazy(img, { src: img.dataset.src, alt: img.alt });
    });

    // 绑定事件
    this._bindEvents(root, course);

    observeReveal(root);
    this._root = root;
  },

  unmount() {
    this._components?.forEach(c => c?.unmount?.());
    this._components = [];
  },

  _bindEvents(root, course) {
    // 立即购买 / 开始学习
    root.addEventListener('click', (e) => {
      const buyBtn = e.target.closest('[data-role="buy"]');
      if (buyBtn) {
        e.preventDefault();
        const purchased = store.isPurchased(course.id);
        if (purchased) {
          navigate(`/learn/${course.id}`);
        } else {
          store.setCart(course.id, 1);
          navigate('/checkout');
        }
        return;
      }
      const favBtn = e.target.closest('[data-role="favorite"]');
      if (favBtn) {
        e.preventDefault();
        const wasFav = store.isFavorite(course.id);
        store.toggleFavorite(course.id);
        const svg = favBtn.querySelector('svg');
        if (svg) svg.setAttribute('fill', !wasFav ? 'currentColor' : 'none');
        favBtn.classList.toggle('is-active', !wasFav);
        Toast.show(!wasFav ? '已加入收藏' : '已取消收藏', { variant: !wasFav ? 'success' : 'default' });
        return;
      }
      const tocItem = e.target.closest('[data-role="toc-item"]');
      if (tocItem) {
        e.preventDefault();
        // 跳到学习页对应章节
        if (store.isPurchased(course.id)) {
          navigate(`/learn/${course.id}?ch=${tocItem.dataset.chapterId}`);
        } else {
          Toast.show('购买后即可学习完整内容', { variant: 'info' });
        }
        return;
      }
    });
  },
};

function notFoundHTML() {
  return `
    <div class="container" style="padding:120px 0;text-align:center;">
      <h1 style="font-size:var(--fs-display);color:var(--color-text-faint);">404</h1>
      <p style="margin-top:16px;color:var(--color-text-mute);">这一页似乎还没有被翻开。</p>
      <a href="/" class="btn btn--primary btn--arrow" data-link style="margin-top:24px;">
        <span class="btn__label">回到首页</span><span class="btn__arrow">→</span>
      </a>
    </div>`;
}

function renderDetail({ course, creator, related, testimonials }) {
  const purchased = store.isPurchased(course.id);
  const favorite = store.isFavorite(course.id);
  const progress = store.getProgress(course.id);

  return `
    <article class="course-detail">
      ${renderHero({ course, creator, purchased, favorite, progress })}
      <div class="course-detail__body">
        ${renderIntro(course)}
        ${renderTOC(course, purchased)}
        ${renderOutcomes(course)}
        ${renderCreator(creator)}
        ${renderTestimonials(testimonials)}
        ${renderRelated(related)}
      </div>
    </article>`;
}

function renderHero({ course, creator, purchased, favorite, progress }) {
  return `
    <section class="course-detail__hero">
      <div class="container course-detail__hero-inner">
        <div class="course-detail__cover-wrap">
          <div class="course-detail__cover" data-shared="cover-${course.id}" data-category="${course.categoryId}">
            <img alt="${course.title}" />
          </div>
        </div>
        <div class="course-detail__info">
          <nav class="breadcrumb" aria-label="路径">
            <a href="/" data-link>首页</a>
            <span class="breadcrumb__sep">/</span>
            <a href="/discover" data-link>发现</a>
            <span class="breadcrumb__sep">/</span>
            <span class="breadcrumb__current">${course.title}</span>
          </nav>
          <div class="course-detail__tags">
            <span class="tag tag--brand">${categoryName(course.categoryId)}</span>
            <span class="tag tag--outline">${course.level}</span>
          </div>
          <h1 class="course-detail__title">${course.title}</h1>
          <p class="course-detail__subtitle">${course.subtitle}</p>

          <div class="course-detail__meta">
            ${creator ? `
              <div class="course-detail__author">
                <span class="course-detail__author-label">主讲</span>
                <span class="course-detail__author-name">${creator.name}</span>
                <span class="course-detail__author-prof">${creator.profession}</span>
              </div>` : ''}
            <div class="course-detail__stats">
              <span>${formatDuration(course.duration)}</span>
              <span class="course-detail__sep">·</span>
              <span>${course.chapters?.length || 0} 章节</span>
              <span class="course-detail__sep">·</span>
              <span>${formatLearnerCount(course.learnerCount)} 人在学</span>
            </div>
          </div>

          ${progress ? `
            <div class="course-detail__progress">
              <span class="course-detail__progress-label">上次学习进度：${Math.round(progress.percent * 100)}%</span>
            </div>` : ''}

          <div class="course-detail__actions">
            <div class="course-detail__price">
              ${course.originalPrice ? `<span class="course-detail__price-original">¥${course.originalPrice}</span>` : ''}
              <span class="course-detail__price-current">${formatPrice(course.price)}</span>
            </div>
            <button class="btn btn--primary btn--lg btn--arrow course-detail__buy" data-role="buy">
              <span class="btn__label">${purchased ? '继续学习' : '立即购买'}</span>
              <span class="btn__arrow" aria-hidden="true">→</span>
            </button>
            <button class="btn btn--secondary course-detail__favorite${favorite ? ' is-active' : ''}" data-role="favorite" aria-label="收藏">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="${favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
              <span>${favorite ? '已收藏' : '收藏'}</span>
            </button>
          </div>
        </div>
      </div>
    </section>`;
}

function renderIntro(course) {
  return `
    <section class="course-detail__section" data-reveal-group>
      <div class="container">
        <header class="section__header" data-reveal>
          <span class="section__eyebrow">INTRODUCTION · 课程介绍</span>
          <div data-component="chapter-number" data-index="1" data-total="5" data-label="Intro"></div>
          <h2 class="section__title">关于这门课</h2>
        </header>
        <div class="course-detail__intro" data-reveal>
          <p>${course.description}</p>
          <p>这门课程共 <strong>${course.chapters?.length || 0} 章</strong>，总时长 <strong>${formatDuration(course.duration)}</strong>，由 <strong>${course.title.split('：')[0]}</strong> 的领域创作者亲述。每一章都是一次完整的翻开——不是知识点罗列，而是从问题到方法的推演。</p>
        </div>
      </div>
    </section>`;
}

function renderTOC(course, purchased) {
  const chapters = course.chapters || [];
  return `
    <section class="course-detail__section" data-reveal-group style="background: var(--color-bg-mist);">
      <div class="container">
        <header class="section__header" data-reveal>
          <span class="section__eyebrow">TABLE OF CONTENTS · 课程目录</span>
          <div data-component="chapter-number" data-index="2" data-total="5" data-label="TOC"></div>
          <h2 class="section__title">章节目录</h2>
          <p class="section__desc">共 ${chapters.length} 章 · ${formatDuration(course.duration)} · ${chapters.filter(c => c.free).length} 章可试看</p>
        </header>
        <ol class="course-toc" data-reveal>
          ${chapters.map((ch, i) => `
            <li class="course-toc__item" data-role="toc-item" data-chapter-id="${ch.id}" data-cursor="open">
              <span class="course-toc__index">${String(i + 1).padStart(2, '0')}</span>
              <div class="course-toc__body">
                <h3 class="course-toc__title">${ch.title}</h3>
                <span class="course-toc__duration">${formatDuration(ch.duration)}</span>
              </div>
              ${ch.free ? '<span class="tag tag--brand">试看</span>' : ''}
              <span class="course-toc__arrow" aria-hidden="true">${purchased ? '→' : '🔒'}</span>
            </li>
          `).join('')}
        </ol>
      </div>
    </section>`;
}

function renderOutcomes(course) {
  // 基于 description 生成收获项（DEMO）
  const outcomes = [
    '建立一套可执行的方法论，而非零散知识点',
    '理解底层逻辑，能迁移到自己的真实场景',
    '获得 1 份可下载的作业清单与工具包',
    '加入创作者答疑社群，与同期学员共学',
  ];
  return `
    <section class="course-detail__section" data-reveal-group>
      <div class="container">
        <header class="section__header" data-reveal>
          <span class="section__eyebrow">OUTCOMES · 学习收获</span>
          <div data-component="chapter-number" data-index="3" data-total="5" data-label="Outcomes"></div>
          <h2 class="section__title">学完之后，你能</h2>
        </header>
        <ul class="course-outcomes" data-reveal>
          ${outcomes.map((o, i) => `
            <li class="course-outcome" data-reveal data-reveal-delay="${i * 100}">
              <span class="course-outcome__check" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              </span>
              <span class="course-outcome__text">${o}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    </section>`;
}

function renderCreator(creator) {
  if (!creator) return '';
  return `
    <section class="course-detail__section" data-reveal-group style="background: var(--color-bg-mist);">
      <div class="container">
        <header class="section__header" data-reveal>
          <span class="section__eyebrow">CREATOR · 创作者介绍</span>
          <div data-component="chapter-number" data-index="4" data-total="5" data-label="Creator"></div>
        </header>
        <div class="course-creator" data-reveal>
          <div class="course-creator__avatar-slot" data-role="creator-avatar"></div>
          <div class="course-creator__body">
            <h3 class="course-creator__name">${creator.name}</h3>
            <p class="course-creator__profession">${creator.profession}</p>
            <p class="course-creator__bio">${creator.bio}</p>
            <div class="course-creator__specialty">
              ${creator.specialty.map(s => `<span class="tag tag--outline">${s}</span>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </section>`;
}

function renderTestimonials(testimonials) {
  if (!testimonials.length) return '';
  return `
    <section class="course-detail__section" data-reveal-group>
      <div class="container">
        <header class="section__header" data-reveal>
          <span class="section__eyebrow">VOICES · 学员声音</span>
          <h2 class="section__title">他们读过这一页</h2>
        </header>
        <div class="course-testimonials" data-reveal>
          ${testimonials.slice(0, 3).map(t => `
            <blockquote class="course-testimonial">
              <div class="testimonial__avatar">
                <img data-src="${imageUrl(t.userAvatarPrompt, 'square_hd')}" alt="${t.userName}" />
              </div>
              <div class="course-testimonial__body">
                <p class="course-testimonial__content">"${t.content}"</p>
                <footer class="course-testimonial__author">
                  <span class="course-testimonial__name">${t.userName}</span>
                  <span class="course-testimonial__sep">·</span>
                  <span class="course-testimonial__role">${t.userRole}</span>
                  <span class="course-testimonial__sep">·</span>
                  <span class="course-testimonial__date">${formatDateCN(t.createdAt)}</span>
                </footer>
              </div>
            </blockquote>
          `).join('')}
        </div>
      </div>
    </section>`;
}

function renderRelated(related) {
  if (!related.length) return '';
  return `
    <section class="course-detail__section" data-reveal-group style="background: var(--color-bg-mist);">
      <div class="container">
        <header class="section__header" data-reveal>
          <span class="section__eyebrow">RELATED · 相关课程</span>
          <h2 class="section__title">下一页，可能是</h2>
        </header>
        <div class="related-grid" data-reveal>
          ${related.map((c, i) => `
            <a class="related-course" href="/course/${c.id}" data-link data-shared-id="cover-${c.id}" data-shared-from="cover-${c.id}" data-reveal data-reveal-delay="${i * 100}">
              <div class="related-course__cover" data-shared="cover-${c.id}" data-category="${c.categoryId}">
                <img alt="${c.title}" data-src="${imageUrl(c.coverPrompt, 'landscape_4_3')}" />
              </div>
              <h3 class="related-course__title">${c.title}</h3>
              <p class="related-course__subtitle">${c.subtitle}</p>
              <span class="related-course__price">${formatPrice(c.price)}</span>
            </a>
          `).join('')}
        </div>
      </div>
    </section>`;
}

function categoryName(id) {
  const map = { design: '设计', tech: '技术', product: '产品', business: '商业', writing: '写作', art: '艺术', mind: '心智', growth: '成长' };
  return map[id] || id;
}
