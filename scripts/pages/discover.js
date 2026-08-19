// ============================================================
// discover.js — 发现 / 课程商城
// 含：分类 Tabs / 排序 / 课程网格 / 分页 / 空状态 / 创作者区
// ============================================================

import { api } from '../core/api.js';
import { store } from '../core/store.js';
import { observeReveal } from '../core/intersection.js';
import { qsa, qs } from '../core/dom.js';
import { imageUrl, setImageLazy } from '../core/image.js';
import { formatPrice, formatLearnerCount, formatDuration } from '../core/format.js';
import { ChapterNumber } from '../components/ChapterNumber.js';
import { Avatar } from '../components/Avatar.js';
import { courseMap, creatorMap } from '../data/index.js';

const PAGE_SIZE = 9;

export default {
  path: '/discover',
  title: '发现 · NEW PAGE 新页',

  async load({ query }) {
    const [courses, categories, creators] = await Promise.all([
      api.getCourses(),
      api.getCategories(),
      api.getCreators(),
    ]);
    return { courses, categories, creators, query };
  },

  async mount(root, { data }) {
    const { courses = [], categories = [], creators = [], query = {} } = data;
    this._all = courses;
    this._categories = categories;
    this._creators = creators;
    this._components = [];
    this._state = {
      categoryId: query.categoryId || null,
      sort: 'recommended',
      search: query.search || '',
      page: 1,
      focus: query.focus === 'creators' ? 'creators' : 'courses',
    };

    root.innerHTML = this._renderShell();
    this._root = root;

    // 注入分类 tabs
    this._injectCategoryTabs();

    // 初始化章节编号
    qsa('[data-component="chapter-number"]', root).forEach(el => {
      const cn = new ChapterNumber({
        index: parseInt(el.dataset.index, 10),
        total: 3,
        label: el.dataset.label,
      });
      cn.mount(el);
      this._components.push(cn);
    });

    // 绑定事件
    this._bindEvents(root);

    // 渲染内容
    this._render();

    observeReveal(root);
  },

  unmount() {
    this._components?.forEach(c => c?.unmount?.());
    this._components = [];
  },

  _renderShell() {
    return `
      <section class="discover-page">
        <div class="discover-hero section">
          <div class="container">
            <header class="section__header" data-reveal>
              <span class="section__eyebrow">DISCOVER · 发现</span>
              <div data-component="chapter-number" data-index="1" data-total="3" data-label="Discover"></div>
              <h1 class="section__title">不必通读所有书，<br/>但该读对的那一本</h1>
              <p class="section__desc">在 ${this._all.length} 门由领域创作者亲述的课程中，找到属于你下一阶段的那一页。</p>
            </header>
          </div>
        </div>

        <div class="discover-toolbar">
          <div class="container discover-toolbar__inner">
            <div class="discover-toolbar__focus">
              <button class="discover-toolbar__focus-tab${this._state.focus === 'courses' ? ' is-active' : ''}" data-role="focus-tab" data-focus="courses">课程</button>
              <button class="discover-toolbar__focus-tab${this._state.focus === 'creators' ? ' is-active' : ''}" data-role="focus-tab" data-focus="creators">创作者</button>
            </div>
            <div class="discover-toolbar__filters" data-role="filters">
              <button class="discover-toolbar__cat${this._state.categoryId === null ? ' is-active' : ''}" data-role="category-tab" data-category-id="">全部</button>
            </div>
            <div class="discover-toolbar__sort">
              <span class="discover-toolbar__sort-label">排序</span>
              <button class="discover-toolbar__sort-btn${this._state.sort === 'recommended' ? ' is-active' : ''}" data-role="sort" data-sort="recommended">推荐</button>
              <button class="discover-toolbar__sort-btn${this._state.sort === 'newest' ? ' is-active' : ''}" data-role="sort" data-sort="newest">最新</button>
              <button class="discover-toolbar__sort-btn${this._state.sort === 'popular' ? ' is-active' : ''}" data-role="sort" data-sort="popular">热门</button>
              <button class="discover-toolbar__sort-btn${this._state.sort === 'price-asc' ? ' is-active' : ''}" data-role="sort" data-sort="price-asc">价格↑</button>
            </div>
          </div>
        </div>

        <div class="discover-content section" data-role="content"></div>
      </section>`;
  },

  _injectCategoryTabs() {
    const filters = qs('[data-role="filters"]', this._root);
    if (!filters) return;
    this._categories.forEach(c => {
      const btn = document.createElement('button');
      btn.className = `discover-toolbar__cat${this._state.categoryId === c.id ? ' is-active' : ''}`;
      btn.dataset.role = 'category-tab';
      btn.dataset.categoryId = c.id;
      btn.textContent = c.name;
      filters.appendChild(btn);
    });
  },

  _bindEvents(root) {
    root.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-role="category-tab"]');
      if (tab) {
        this._state.categoryId = tab.dataset.categoryId || null;
        this._state.page = 1;
        this._render();
        return;
      }
      const focusTab = e.target.closest('[data-role="focus-tab"]');
      if (focusTab) {
        this._state.focus = focusTab.dataset.focus;
        this._state.page = 1;
        this._render();
        return;
      }
      const sort = e.target.closest('[data-role="sort"]');
      if (sort) {
        this._state.sort = sort.dataset.sort;
        this._state.page = 1;
        this._render();
        return;
      }
      const pageBtn = e.target.closest('[data-role="page"]');
      if (pageBtn && !pageBtn.disabled) {
        const p = parseInt(pageBtn.dataset.page, 10);
        if (Number.isFinite(p)) {
          this._state.page = p;
          this._render();
          root.querySelector('.discover-hero')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }
      const fav = e.target.closest('[data-role="favorite"]');
      if (fav) {
        e.preventDefault();
        e.stopPropagation();
        const id = fav.dataset.courseId;
        if (id) {
          const wasFav = store.isFavorite(id);
          store.toggleFavorite(id);
          const svg = fav.querySelector('svg');
          if (svg) svg.setAttribute('fill', !wasFav ? 'currentColor' : 'none');
          fav.setAttribute('aria-label', !wasFav ? '取消收藏' : '加入收藏');
        }
        return;
      }
      const resetBtn = e.target.closest('[data-role="reset-filters"]');
      if (resetBtn) {
        this._state.categoryId = null;
        this._state.search = '';
        this._state.page = 1;
        this._render();
        return;
      }
    });
  },

  _getFiltered() {
    let list = [...this._all];
    if (this._state.search) {
      const k = this._state.search.toLowerCase();
      list = list.filter(c =>
        c.title.toLowerCase().includes(k) ||
        c.subtitle.toLowerCase().includes(k) ||
        (c.tags || []).some(t => t.toLowerCase().includes(k))
      );
    }
    if (this._state.categoryId) {
      list = list.filter(c => c.categoryId === this._state.categoryId);
    }
    const sort = this._state.sort;
    if (sort === 'newest') list.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    else if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'popular') list.sort((a, b) => b.learnerCount - a.learnerCount);
    return list;
  },

  _render() {
    const content = qs('[data-role="content"]', this._root);
    if (!content) return;

    if (this._state.focus === 'creators') {
      content.innerHTML = this._renderCreatorsView();
      this._wireCreatorAvatars(content);
    } else {
      const filtered = this._getFiltered();
      const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      const page = Math.min(this._state.page, totalPages);
      const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
      content.innerHTML = this._renderCoursesView(slice, filtered.length, page, totalPages);
      this._wireCourseImages(content);
    }

    this._syncChrome();
    observeReveal(this._root);
  },

  _syncChrome() {
    qsa('[data-role="category-tab"]', this._root).forEach(t => {
      t.classList.toggle('is-active', (t.dataset.categoryId || null) === this._state.categoryId);
    });
    qsa('[data-role="focus-tab"]', this._root).forEach(t => {
      t.classList.toggle('is-active', t.dataset.focus === this._state.focus);
    });
    qsa('[data-role="sort"]', this._root).forEach(t => {
      t.classList.toggle('is-active', t.dataset.sort === this._state.sort);
    });
  },

  _renderCoursesView(courses, total, page, totalPages) {
    if (!courses.length) return this._renderEmpty();
    return `
      <div class="container">
        <p class="discover-content__count">共 ${total} 门课程</p>
        <div class="discover-grid">
          ${courses.map((c, i) => this._courseCardHTML(c, i)).join('')}
        </div>
        ${totalPages > 1 ? this._renderPagination(page, totalPages) : ''}
      </div>`;
  },

  _renderCreatorsView() {
    return `
      <div class="container">
        <p class="discover-content__count">共 ${this._creators.length} 位创作者</p>
        <div class="discover-creators">
          ${this._creators.map((c, i) => `
            <article class="creator-card" data-creator-id="${c.id}" data-cursor="open" data-reveal data-reveal-delay="${i * 80}">
              <div class="creator-card__inner">
                <div class="creator-card__avatar-slot" data-role="avatar"></div>
                <div class="creator-card__body">
                  <h3 class="creator-card__name">${c.name}</h3>
                  <p class="creator-card__profession">${c.profession}</p>
                  <p class="creator-card__bio">${c.bio}</p>
                  <div class="creator-card__stats">
                    <div class="creator-card__stat">
                      <span class="creator-card__stat-num">${c.courseCount}</span>
                      <span class="creator-card__stat-label">门课程</span>
                    </div>
                    <div class="creator-card__stat">
                      <span class="creator-card__stat-num">${formatLearnerCount(c.followerCount)}</span>
                      <span class="creator-card__stat-label">关注者</span>
                    </div>
                  </div>
                  <div class="creator-card__specialty">
                    ${c.specialty.map(s => `<span class="tag tag--outline">${s}</span>`).join('')}
                  </div>
                </div>
              </div>
            </article>
          `).join('')}
        </div>
      </div>`;
  },

  _renderEmpty() {
    const hint = this._state.search
      ? `没有找到与「${this._state.search}」相关的内容`
      : '这个分类下暂时还没有课程';
    return `
      <div class="container">
        <div class="empty-state" data-reveal>
          <div class="empty-state__visual" aria-hidden="true">
            <svg viewBox="0 0 80 80" width="80" height="80" fill="none" stroke="currentColor" stroke-width="1.4">
              <rect x="20" y="14" width="40" height="52" rx="2" />
              <path d="M40 14v52" />
              <path d="M28 28h4 M28 36h4 M48 28h4 M48 36h4" stroke-linecap="round" />
              <circle cx="40" cy="58" r="3" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <h3 class="empty-state__title">${hint}</h3>
          <p class="empty-state__desc">试试切换其他分类，或浏览全部课程。</p>
          <button class="btn btn--secondary" type="button" data-role="reset-filters">查看全部</button>
        </div>
      </div>`;
  },

  _renderPagination(current, total) {
    const pages = [];
    const range = 1;
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || Math.abs(i - current) <= range) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return `
      <nav class="pagination" aria-label="分页">
        <button class="pagination__btn" data-role="page" data-page="${Math.max(1, current - 1)}" ${current === 1 ? 'disabled' : ''} aria-label="上一页">←</button>
        ${pages.map(p => p === '...'
          ? `<span class="pagination__ellipsis">…</span>`
          : `<button class="pagination__btn${p === current ? ' is-active' : ''}" data-role="page" data-page="${p}">${p}</button>`
        ).join('')}
        <button class="pagination__btn" data-role="page" data-page="${Math.min(total, current + 1)}" ${current === total ? 'disabled' : ''} aria-label="下一页">→</button>
      </nav>`;
  },

  _courseCardHTML(c, i) {
    const purchased = store.isPurchased(c.id);
    const favorite = store.isFavorite(c.id);
    return `
      <article class="course-card" data-course-id="${c.id}" data-cursor="open" data-reveal data-reveal-delay="${i * 80}">
        <a class="course-card__link" href="/course/${c.id}" data-link data-shared-id="cover-${c.id}" data-shared-from="cover-${c.id}">
          <div class="course-card__cover" data-shared="cover-${c.id}" data-category="${c.categoryId}">
            <img class="course-card__img" alt="${c.title}" data-src="${imageUrl(c.coverPrompt, 'landscape_4_3')}" />
            <span class="course-card__level">${c.level}</span>
            ${purchased ? '<span class="course-card__purchased">已加入书架</span>' : ''}
            <button class="course-card__favorite" type="button" data-role="favorite" data-course-id="${c.id}" aria-label="${favorite ? '取消收藏' : '加入收藏'}">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="${favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>
          <div class="course-card__body">
            <div class="course-card__meta">
              <span class="course-card__duration">${formatDuration(c.duration)}</span>
              <span class="course-card__separator">·</span>
              <span class="course-card__learners">${formatLearnerCount(c.learnerCount)} 人在学</span>
            </div>
            <h3 class="course-card__title">${c.title}</h3>
            <p class="course-card__subtitle">${c.subtitle}</p>
            <div class="course-card__footer">
              <div class="course-card__price">
                ${c.originalPrice ? `<span class="course-card__price-original">¥${c.originalPrice}</span>` : ''}
                <span class="course-card__price-current">${formatPrice(c.price)}</span>
              </div>
              <span class="course-card__cta">
                <span class="course-card__cta-label">${purchased ? '继续学习' : '查看详情'}</span>
                <span class="course-card__cta-arrow" aria-hidden="true">→</span>
              </span>
            </div>
          </div>
        </a>
      </article>`;
  },

  _wireCourseImages(scope) {
    qsa('.course-card__img[data-src]', scope).forEach(img => {
      const cardEl = img.closest('[data-course-id]');
      const course = cardEl ? courseMap[cardEl.dataset.courseId] : null;
      if (course) setImageLazy(img, { src: img.dataset.src, alt: course.title, category: course.categoryId });
    });
  },

  _wireCreatorAvatars(scope) {
    qsa('.creator-card[data-creator-id]', scope).forEach(el => {
      const creator = creatorMap[el.dataset.creatorId];
      if (!creator) return;
      const avatarSlot = el.querySelector('[data-role="avatar"]');
      if (avatarSlot) {
        const av = new Avatar({ prompt: creator.avatarPrompt, name: creator.name, alt: creator.name, size: 'lg' });
        av.mount(avatarSlot);
        this._components.push(av);
      }
    });
  },
};
