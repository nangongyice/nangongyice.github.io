// ============================================================
// bookshelf.js — 我的书架
// 替代传统"我的课程"：展示已购课程 + 进度 + 收藏
// 强化"内容沉淀"的品牌感知
// ============================================================

import { api } from '../core/api.js';
import { store } from '../core/store.js';
import { observeReveal } from '../core/intersection.js';
import { qsa, qs } from '../core/dom.js';
import { imageUrl, setImageLazy } from '../core/image.js';
import { formatPrice, formatLearnerCount, formatDuration, formatRelative } from '../core/format.js';
import { ChapterNumber } from '../components/ChapterNumber.js';
import { ProgressBar } from '../components/ProgressBar.js';
import { Toast } from '../components/Toast.js';
import { navigate } from '../app/router.js';
import { courseMap } from '../data/index.js';

export default {
  path: '/bookshelf',
  title: '我的书架 · NEW PAGE 新页',

  async load() {
    // 获取全部课程（用于在本地匹配已购 + 收藏）
    const courses = await api.getCourses();
    return { courses };
  },

  async mount(root, { data }) {
    const { courses = [] } = data;
    this._all = courses;
    this._components = [];
    this._state = { tab: 'reading' }; // reading / all / favorites

    root.innerHTML = this._renderShell();
    this._root = root;

    // 初始化章节编号
    qsa('[data-component="chapter-number"]', root).forEach(el => {
      const cn = new ChapterNumber({
        index: parseInt(el.dataset.index, 10),
        total: 2,
        label: el.dataset.label,
      });
      cn.mount(el);
      this._components.push(cn);
    });

    this._bindEvents(root);
    this._render();
    observeReveal(root);
  },

  unmount() {
    this._components?.forEach(c => c?.unmount?.());
    this._components = [];
  },

  _renderShell() {
    const total = store.get().purchases.length;
    const favs = store.get().favorites.length;
    return `
      <section class="bookshelf-page">
        <div class="bookshelf-hero section">
          <div class="container">
            <header class="section__header" data-reveal>
              <span class="section__eyebrow">BOOKSHELF · 我的书架</span>
              <div data-component="chapter-number" data-index="1" data-total="2" data-label="Shelf"></div>
              <h1 class="section__title">每一页都在静默生长</h1>
              <p class="section__desc">你的书架共有 <strong>${total}</strong> 本课程，<strong>${favs}</strong> 个收藏。每一次续读，都是接续上一次的呼吸。</p>
            </header>
          </div>
        </div>

        <div class="bookshelf-toolbar">
          <div class="container bookshelf-toolbar__inner">
            <button class="bookshelf-toolbar__tab is-active" data-role="tab" data-tab="reading">
              <span class="bookshelf-toolbar__tab-label">正在阅读</span>
              <span class="bookshelf-toolbar__tab-count" data-role="count-reading">0</span>
            </button>
            <button class="bookshelf-toolbar__tab" data-role="tab" data-tab="all">
              <span class="bookshelf-toolbar__tab-label">全部课程</span>
              <span class="bookshelf-toolbar__tab-count" data-role="count-all">0</span>
            </button>
            <button class="bookshelf-toolbar__tab" data-role="tab" data-tab="favorites">
              <span class="bookshelf-toolbar__tab-label">收藏夹</span>
              <span class="bookshelf-toolbar__tab-count" data-role="count-favorites">0</span>
            </button>
          </div>
        </div>

        <div class="bookshelf-content section" data-role="content"></div>
      </section>`;
  },

  _bindEvents(root) {
    root.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-role="tab"]');
      if (tab) {
        this._state.tab = tab.dataset.tab;
        qsa('[data-role="tab"]', root).forEach(t => t.classList.toggle('is-active', t === tab));
        this._render();
        root.querySelector('.bookshelf-hero')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      const resume = e.target.closest('[data-role="resume"]');
      if (resume) {
        e.preventDefault();
        const id = resume.dataset.courseId;
        if (id) navigate(`/learn/${id}`);
        return;
      }
      const remove = e.target.closest('[data-role="remove-fav"]');
      if (remove) {
        e.preventDefault();
        const id = remove.dataset.courseId;
        if (id) {
          store.toggleFavorite(id);
          Toast.show('已移出收藏', { variant: 'default' });
          this._render();
        }
        return;
      }
      const browse = e.target.closest('[data-role="browse"]');
      if (browse) {
        e.preventDefault();
        navigate('/discover');
        return;
      }
    });
  },

  _render() {
    const content = qs('[data-role="content"]', this._root);
    if (!content) return;

    const state = store.get();
    const purchased = state.purchases.map(id => courseMap[id]).filter(Boolean);
    const favorites = state.favorites.map(id => courseMap[id]).filter(Boolean);

    // 更新 tab 计数
    const readingCount = purchased.filter(c => state.progress[c.id] && state.progress[c.id].percent > 0).length;
    this._setCount('count-reading', readingCount);
    this._setCount('count-all', purchased.length);
    this._setCount('count-favorites', favorites.length);

    let list;
    if (this._state.tab === 'reading') {
      list = purchased
        .filter(c => state.progress[c.id] && state.progress[c.id].percent > 0)
        .sort((a, b) => (state.progress[b.id].updatedAt || 0) - (state.progress[a.id].updatedAt || 0));
    } else if (this._state.tab === 'all') {
      list = purchased;
    } else {
      list = favorites;
    }

    if (!list.length) {
      content.innerHTML = this._renderEmpty(this._state.tab);
    } else {
      content.innerHTML = `
        <div class="container">
          <div class="bookshelf-list" data-reveal>
            ${list.map((c, i) => this._renderItem(c, i, this._state.tab)).join('')}
          </div>
        </div>`;
      this._wireImages(content);
      this._wireProgress(content, list);
    }
    observeReveal(this._root);
  },

  _setCount(role, n) {
    const el = qs(`[data-role="${role}"]`, this._root);
    if (el) el.textContent = n;
  },

  _renderItem(c, i, tab) {
    const state = store.get();
    const progress = state.progress[c.id];
    const percent = progress ? progress.percent : 0;
    const chapter = c.chapters?.find(ch => ch.id === progress?.chapterId) || c.chapters?.[0];
    const isFavorite = tab === 'favorites';
    return `
      <article class="bookshelf-item" data-course-id="${c.id}" data-reveal data-reveal-delay="${i * 80}">
        <a class="bookshelf-item__cover" href="/learn/${c.id}" data-link data-shared-id="cover-${c.id}" data-shared-from="cover-${c.id}" data-cursor="open">
          <div class="bookshelf-item__cover-inner" data-shared="cover-${c.id}" data-category="${c.categoryId}">
            <img class="bookshelf-item__img" alt="${c.title}" data-src="${imageUrl(c.coverPrompt, 'landscape_4_3')}" />
            <span class="bookshelf-item__level">${c.level}</span>
            ${percent >= 1 ? '<span class="bookshelf-item__done">已读完</span>' : ''}
          </div>
        </a>
        <div class="bookshelf-item__body">
          <div class="bookshelf-item__meta">
            <span class="bookshelf-item__category">${categoryName(c.categoryId)}</span>
            <span class="bookshelf-item__sep">·</span>
            <span class="bookshelf-item__duration">${formatDuration(c.duration)}</span>
            <span class="bookshelf-item__sep">·</span>
            <span class="bookshelf-item__learners">${formatLearnerCount(c.learnerCount)} 在学</span>
          </div>
          <h3 class="bookshelf-item__title">${c.title}</h3>
          <p class="bookshelf-item__subtitle">${c.subtitle}</p>
          ${chapter ? `
            <p class="bookshelf-item__chapter">
              ${percent > 0 ? `上次到 · <span>${chapter.title}</span>` : `从首章开始 · <span>${chapter.title}</span>`}
              ${progress?.updatedAt ? `<span class="bookshelf-item__chapter-time">${formatRelative(new Date(progress.updatedAt).toISOString())}</span>` : ''}
            </p>` : ''}
          <div class="bookshelf-item__progress" data-role="progress" data-course-id="${c.id}">
            <div class="progress-bar progress-bar--md" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(percent * 100)}">
              <div class="progress-bar__track">
                <div class="progress-bar__fill" style="width:${Math.round(percent * 100)}%"></div>
              </div>
            </div>
            <span class="bookshelf-item__progress-label">${Math.round(percent * 100)}%</span>
          </div>
          <div class="bookshelf-item__actions">
            <a class="btn btn--primary btn--arrow" href="/learn/${c.id}" data-link data-role="resume" data-course-id="${c.id}" data-cursor="open">
              <span class="btn__label">${percent > 0 ? '续读' : '开始阅读'}</span>
              <span class="btn__arrow" aria-hidden="true">→</span>
            </a>
            <a class="btn btn--ghost bookshelf-item__detail" href="/course/${c.id}" data-link>查看详情</a>
            ${isFavorite ? `<button class="btn btn--ghost bookshelf-item__remove" data-role="remove-fav" data-course-id="${c.id}">移出收藏</button>` : ''}
          </div>
        </div>
      </article>`;
  },

  _wireImages(scope) {
    qsa('.bookshelf-item__img[data-src]', scope).forEach(img => {
      const cardEl = img.closest('[data-course-id]');
      const course = cardEl ? courseMap[cardEl.dataset.courseId] : null;
      if (course) setImageLazy(img, { src: img.dataset.src, alt: course.title, category: course.categoryId });
    });
  },

  _wireProgress(scope, list) {
    // 让进度条进入视口时填充（A 级动画）
    qsa('[data-role="progress"]', scope).forEach(el => {
      const id = el.dataset.courseId;
      const course = list.find(c => c.id === id);
      if (!course) return;
      const progress = store.getProgress(id);
      const target = progress ? progress.percent : 0;
      const fill = el.querySelector('.progress-bar__fill');
      if (!fill) return;
      // 起始为 0，进入视口后动画到目标值
      fill.style.width = '0%';
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const dur = 700;
            const start = performance.now();
            const tick = (now) => {
              const t = Math.min(1, (now - start) / dur);
              const eased = 1 - Math.pow(1 - t, 3);
              fill.style.width = `${Math.round(target * 100 * eased)}%`;
              if (t < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
            io.disconnect();
          }
        });
      }, { threshold: 0.3 });
      io.observe(el);
    });
  },

  _renderEmpty(tab) {
    const map = {
      reading: { title: '尚未翻开任何一页', desc: '从已购课程中开始学习，进度会自动记录在这里。', cta: '去全部课程' },
      all: { title: '书架还是空的', desc: '去发现页逛逛，把对的那本课程加入你的书架。', cta: '去发现' },
      favorites: { title: '收藏夹是空的', desc: '在课程卡片右上角点收藏，让喜欢的内容停在这里。', cta: '去发现' },
    };
    const t = map[tab] || map.all;
    return `
      <div class="container">
        <div class="empty-state" data-reveal>
          <div class="empty-state__visual" aria-hidden="true">
            <svg viewBox="0 0 80 80" width="80" height="80" fill="none" stroke="currentColor" stroke-width="1.4">
              <rect x="14" y="18" width="52" height="48" rx="3" />
              <path d="M14 30h52 M40 18v48" />
              <path d="M22 42h12 M22 50h8 M46 42h12 M46 50h8" stroke-linecap="round" />
            </svg>
          </div>
          <h3 class="empty-state__title">${t.title}</h3>
          <p class="empty-state__desc">${t.desc}</p>
          <button class="btn btn--primary btn--arrow" data-role="browse">
            <span class="btn__label">${t.cta}</span>
            <span class="btn__arrow" aria-hidden="true">→</span>
          </button>
        </div>
      </div>`;
  },
};

function categoryName(id) {
  const map = { design: '设计', tech: '技术', product: '产品', business: '商业', writing: '写作', art: '艺术', mind: '心智', growth: '成长' };
  return map[id] || id;
}
