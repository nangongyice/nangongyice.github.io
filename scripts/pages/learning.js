// ============================================================
// learning.js — 学习页
// 视频/模拟播放 + 章节目录 + 学习进度续播
// 进度自动存入 LocalStorage，重新打开恢复上次位置
// ============================================================

import { api } from '../core/api.js';
import { store } from '../core/store.js';
import { observeReveal } from '../core/intersection.js';
import { qsa, qs } from '../core/dom.js';
import { imageUrl, setImageSync, setImageLazy } from '../core/image.js';
import { formatDuration, formatTimecode } from '../core/format.js';
import { Toast } from '../components/Toast.js';
import { eventBus, EVENTS } from '../app/event-bus.js';
import { navigate } from '../app/router.js';
import { prefersReducedMotion } from '../core/animation.js';
import { courseMap, creatorMap } from '../data/index.js';

export default {
  path: '/learn/:id',
  title: '学习中 · NEW PAGE 新页',

  async load({ params, query }) {
    const id = params.id;
    const course = courseMap[id];
    if (!course) return { notFound: true };
    const creator = creatorMap[course.creatorId] || null;
    return { course, creator, query };
  },

  async mount(root, { data }) {
    if (data.notFound) {
      root.innerHTML = `
        <div class="container" style="padding:120px 0;text-align:center;">
          <h1 style="font-size:var(--fs-display);color:var(--color-text-faint);">404</h1>
          <p style="margin-top:16px;color:var(--color-text-mute);">这一页似乎还没有被翻开。</p>
          <a href="/" class="btn btn--primary btn--arrow" data-link style="margin-top:24px;">
            <span class="btn__label">回到首页</span><span class="btn__arrow">→</span>
          </a>
        </div>`;
      return;
    }

    const { course, creator, query = {} } = data;

    // 未购者：返回详情页（演示阶段允许试看第 1 章）
    const purchased = store.isPurchased(course.id);
    if (!purchased) {
      Toast.show('请先在课程详情页完成模拟购买', { variant: 'info' });
      setTimeout(() => navigate(`/course/${course.id}`, { force: true }), 600);
      return;
    }

    this._course = course;
    this._creator = creator;
    this._purchased = purchased;

    // 续读：恢复上次章节 / 时间
    const progress = store.getProgress(course.id);
    const chapters = course.chapters || [];
    let initChapter = chapters.find(c => c.id === progress?.chapterId) || chapters[0];
    const queryCh = query.ch;
    if (queryCh) {
      const found = chapters.find(c => c.id === queryCh);
      if (found) initChapter = found;
    }
    this._state = {
      chapterId: initChapter?.id,
      currentTime: progress && progress.chapterId === initChapter?.id ? Math.floor(progress.percent * initChapter.duration) : 0,
      isPlaying: false,
    };

    root.innerHTML = this._renderShell();
    this._root = root;

    // 同步加载课程封面（视觉背景）
    const coverImg = qs('.learning-player__cover-img', root);
    if (coverImg) {
      setImageSync(coverImg, {
        src: imageUrl(course.coverPrompt, 'landscape_16_9'),
        alt: course.title,
        category: course.categoryId,
      });
    }

    this._cacheDom(root);
    this._bindEvents(root);
    this._renderTOCState();
    this._updatePlayingUI();
    this._startTimeLoop();
    observeReveal(root);
  },

  unmount() {
    this._stopTimeLoop();
    this._saveProgress(true);
  },

  _renderShell() {
    const course = this._course;
    const creator = this._creator;
    const chapters = course.chapters || [];
    const currentChapter = chapters.find(c => c.id === this._state.chapterId) || chapters[0];
    const totalChapters = chapters.length;
    const idx = chapters.findIndex(c => c.id === currentChapter?.id);
    return `
      <section class="learning-page">
        <div class="learning-hero">
          <div class="container learning-hero__inner">
            <nav class="breadcrumb" aria-label="路径">
              <a href="/bookshelf" data-link>书架</a>
              <span class="breadcrumb__sep">/</span>
              <a href="/course/${course.id}" data-link>${course.title}</a>
              <span class="breadcrumb__sep">/</span>
              <span class="breadcrumb__current">学习中</span>
            </nav>
            <div class="learning-hero__head">
              <span class="learning-hero__eyebrow">CHAPTER ${String(idx + 1).padStart(2, '0')} / ${String(totalChapters).padStart(2, '0')}</span>
              <h1 class="learning-hero__title" data-role="chapter-title">${currentChapter?.title || ''}</h1>
              <p class="learning-hero__subtitle">${course.title} · ${creator ? creator.name : ''}</p>
            </div>
          </div>
        </div>

        <div class="container learning-body">
          <div class="learning-main">
            <div class="learning-player" data-role="player">
              <div class="learning-player__cover" data-cursor="open">
                <img class="learning-player__cover-img" alt="${course.title}" />
                <div class="learning-player__overlay" data-role="player-overlay">
                  <button class="learning-player__play-btn" data-role="play-toggle" aria-label="播放">
                    <svg viewBox="0 0 60 60" width="60" height="60" fill="currentColor" aria-hidden="true">
                      <circle cx="30" cy="30" r="29" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>
                      <path d="M24 20 L42 30 L24 40 Z"/>
                    </svg>
                  </button>
                </div>
                <div class="learning-player__page-anim" aria-hidden="true">
                  <span></span><span></span><span></span><span></span><span></span>
                </div>
              </div>
              <div class="learning-player__bar">
                <div class="learning-player__time" data-role="current-time">00:00</div>
                <div class="learning-player__seek" data-role="seek">
                  <div class="learning-player__seek-track">
                    <div class="learning-player__seek-fill" data-role="seek-fill"></div>
                    <div class="learning-player__seek-handle" data-role="seek-handle"></div>
                  </div>
                </div>
                <div class="learning-player__time learning-player__time--end" data-role="duration">${currentChapter ? formatTimecode(currentChapter.duration) : '00:00'}</div>
              </div>
              <div class="learning-player__controls">
                <button class="learning-player__btn" data-role="prev-chapter" ${idx === 0 ? 'disabled' : ''}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 4 L6 20 M20 4 L8 12 L20 20 Z"/></svg>
                  <span>上一章</span>
                </button>
                <button class="learning-player__btn learning-player__btn--play" data-role="play-toggle-2" aria-label="播放/暂停">
                  <span data-role="play-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M7 4 L7 20 L19 12 Z"/></svg>
                  </span>
                </button>
                <button class="learning-player__btn" data-role="next-chapter" ${idx === totalChapters - 1 ? 'disabled' : ''}>
                  <span>下一章</span>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18 4 L18 20 M4 4 L16 12 L4 20 Z"/></svg>
                </button>
                <a class="learning-player__btn learning-player__btn--link" href="/course/${course.id}" data-link>详情</a>
              </div>
            </div>

            <div class="learning-notes" data-reveal>
              <header class="learning-notes__head">
                <span class="section__eyebrow">NOTES · 本章要点</span>
                <h2 class="learning-notes__title">${currentChapter?.title || ''}</h2>
              </header>
              <div class="learning-notes__body">
                <p>这一章将围绕「${currentChapter?.title || ''}」展开。${course.title}是创作者${creator ? creator.name : ''}的系统性课程，本章聚焦核心方法与实践拆解。</p>
                <p>建议在阅读时记录 1-3 个对你最重要的观点，并在章节末回顾：你能否用自己的话把它们重新讲一遍？这是检验理解是否到位的最小可信测试。</p>
                <ul class="learning-notes__list">
                  <li>把握本章关键概念之间的因果链</li>
                  <li>对照自己当前的工作 / 学习场景做迁移</li>
                  <li>挑出 1 个可在本周尝试的具体动作</li>
                </ul>
              </div>
            </div>
          </div>

          <aside class="learning-aside" data-reveal data-reveal-delay="100">
            <div class="learning-toc">
              <header class="learning-toc__head">
                <span class="section__eyebrow">CONTENTS · 课程目录</span>
                <h3 class="learning-toc__title">${course.title}</h3>
                <p class="learning-toc__desc">共 ${totalChapters} 章 · ${formatDuration(course.duration)}</p>
              </header>
              <div class="accordion" data-role="toc-accordion">
                ${chapters.map((ch, i) => {
                  const isCurrent = ch.id === this._state.chapterId;
                  const chProgress = store.getProgress(course.id);
                  const isCompleted = chProgress && ch.id !== chProgress.chapterId
                    ? (chapters.findIndex(c => c.id === chProgress.chapterId) > i)
                    : false;
                  return `
                    <div class="accordion__item${isCurrent ? ' is-current is-open' : ''}" data-chapter-id="${ch.id}" data-role="toc-item">
                      <button class="accordion__head" type="button" data-role="accordion-toggle">
                        <span class="accordion__index">${String(i + 1).padStart(2, '0')}</span>
                        <span class="accordion__title">${ch.title}</span>
                        ${isCurrent ? '<span class="tag tag--brand">阅读中</span>' : ''}
                        ${isCompleted ? '<span class="accordion__done" aria-hidden="true">✓</span>' : ''}
                        <span class="accordion__duration">${formatDuration(ch.duration)}</span>
                        <span class="accordion__chevron" aria-hidden="true">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
                        </span>
                      </button>
                      <div class="accordion__panel">
                        <div class="accordion__panel-inner">
                          <p>本章为「${ch.title}」的内容简述，将在播放器中按章节顺序呈现。完成后系统会自动保存进度，下次进入本页可直接续读。</p>
                          <button class="btn btn--secondary btn--sm" data-role="jump-chapter" data-chapter-id="${ch.id}">
                            ${isCurrent ? '本章继续' : '跳到本章'}
                          </button>
                        </div>
                      </div>
                    </div>`;
                }).join('')}
              </div>
            </div>
          </aside>
        </div>
      </section>`;
  },

  _cacheDom(root) {
    this._elPlayIcons = qsa('[data-role="play-icon"]', root);
    this._elPlayerOverlay = qs('[data-role="player-overlay"]', root);
    this._elCurrentTime = qs('[data-role="current-time"]', root);
    this._elDuration = qs('[data-role="duration"]', root);
    this._elSeekFill = qs('[data-role="seek-fill"]', root);
    this._elSeekHandle = qs('[data-role="seek-handle"]', root);
    this._elSeek = qs('[data-role="seek"]', root);
    this._elChapterTitle = qs('[data-role="chapter-title"]', root);
  },

  _bindEvents(root) {
    root.addEventListener('click', (e) => {
      const playBtn = e.target.closest('[data-role="play-toggle"], [data-role="play-toggle-2"]');
      if (playBtn) { this._togglePlay(); return; }
      const prev = e.target.closest('[data-role="prev-chapter"]');
      if (prev && !prev.disabled) { this._goChapter(-1); return; }
      const next = e.target.closest('[data-role="next-chapter"]');
      if (next && !next.disabled) { this._goChapter(1); return; }
      const acc = e.target.closest('[data-role="accordion-toggle"]');
      if (acc) { this._toggleAccordion(acc.closest('.accordion__item')); return; }
      const jump = e.target.closest('[data-role="jump-chapter"]');
      if (jump) { this._switchChapter(jump.dataset.chapterId); return; }
      const tocItem = e.target.closest('[data-role="toc-item"]');
      if (tocItem && !e.target.closest('[data-role="accordion-toggle"]')) {
        // 点击条目整体：直接切换章节
        this._switchChapter(tocItem.dataset.chapterId);
        return;
      }
    });

    // 拖动进度条
    if (this._elSeek) {
      const onSeek = (e) => {
        const rect = this._elSeek.getBoundingClientRect();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        const ratio = Math.max(0, Math.min(1, x / rect.width));
        const ch = this._currentChapter();
        if (!ch) return;
        this._state.currentTime = Math.floor(ratio * ch.duration);
        this._updatePlayingUI();
        this._saveProgress();
      };
      let dragging = false;
      this._elSeek.addEventListener('mousedown', (e) => { dragging = true; onSeek(e); });
      window.addEventListener('mousemove', (e) => { if (dragging) onSeek(e); });
      window.addEventListener('mouseup', () => { dragging = false; });
      this._elSeek.addEventListener('touchstart', (e) => { dragging = true; onSeek(e); }, { passive: true });
      window.addEventListener('touchmove', (e) => { if (dragging) onSeek(e); }, { passive: true });
      window.addEventListener('touchend', () => { dragging = false; });
    }
  },

  _currentChapter() {
    return (this._course.chapters || []).find(c => c.id === this._state.chapterId);
  },

  _togglePlay() {
    this._state.isPlaying = !this._state.isPlaying;
    this._updatePlayingUI();
    if (this._state.isPlaying) this._startTimeLoop();
    else this._stopTimeLoop();
  },

  _startTimeLoop() {
    if (this._loopRaf) cancelAnimationFrame(this._loopRaf);
    if (prefersReducedMotion()) {
      // 降级：仍以低频推进
    }
    let last = performance.now();
    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      const ch = this._currentChapter();
      if (ch && this._state.isPlaying) {
        // 演示加速：每实际秒推进 6 秒章节时长（避免看完一章等 12 分钟）
        const RATE = 6;
        this._state.currentTime += dt * RATE;
        if (this._state.currentTime >= ch.duration) {
          this._state.currentTime = ch.duration;
          this._state.isPlaying = false;
          this._updatePlayingUI();
          this._saveProgress();
          Toast.show('本章已读完，自动进入下一章', { variant: 'success' });
          setTimeout(() => this._goChapter(1), 600);
          return;
        }
        this._updatePlayingUI();
        // 每 5% 保存一次
        if (this._shouldSave(this._state.currentTime, ch.duration)) {
          this._saveProgress();
        }
      }
      this._loopRaf = requestAnimationFrame(tick);
    };
    this._loopRaf = requestAnimationFrame(tick);
  },

  _stopTimeLoop() {
    if (this._loopRaf) cancelAnimationFrame(this._loopRaf);
    this._loopRaf = null;
  },

  _lastSaveRatio: 0,
  _shouldSave(current, duration) {
    if (!duration) return false;
    const ratio = current / duration;
    if (ratio - this._lastSaveRatio >= 0.05) {
      this._lastSaveRatio = ratio;
      return true;
    }
    return false;
  },

  _saveProgress(force = false) {
    const ch = this._currentChapter();
    if (!ch) return;
    const percent = Math.min(1, this._state.currentTime / ch.duration);
    store.setProgress(this._course.id, { chapterId: ch.id, percent });
    eventBus.emit(EVENTS.PROGRESS_SAVED, { courseId: this._course.id, chapterId: ch.id, percent });
    if (force) this._lastSaveRatio = 0;
  },

  _updatePlayingUI() {
    const ch = this._currentChapter();
    if (!ch) return;
    const ratio = Math.max(0, Math.min(1, this._state.currentTime / ch.duration));
    if (this._elSeekFill) this._elSeekFill.style.width = `${ratio * 100}%`;
    if (this._elSeekHandle) this._elSeekHandle.style.left = `${ratio * 100}%`;
    if (this._elCurrentTime) this._elCurrentTime.textContent = formatTimecode(this._state.currentTime);
    if (this._elDuration) this._elDuration.textContent = formatTimecode(ch.duration);
    // 播放/暂停图标
    this._elPlayIcons.forEach(icon => {
      icon.innerHTML = this._state.isPlaying
        ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>'
        : '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M7 4 L7 20 L19 12 Z"/></svg>';
    });
    // overlay 显隐
    if (this._elPlayerOverlay) {
      this._elPlayerOverlay.classList.toggle('is-hidden', this._state.isPlaying);
    }
    // page-anim 显隐
    const playerEl = qs('[data-role="player"]', this._root);
    if (playerEl) playerEl.classList.toggle('is-playing', this._state.isPlaying);
  },

  _goChapter(dir) {
    const chapters = this._course.chapters || [];
    const idx = chapters.findIndex(c => c.id === this._state.chapterId);
    const next = chapters[idx + dir];
    if (!next) return;
    this._switchChapter(next.id);
  },

  _switchChapter(chapterId) {
    const chapters = this._course.chapters || [];
    const ch = chapters.find(c => c.id === chapterId);
    if (!ch) return;
    // 切换章节前先保存当前进度
    this._saveProgress(true);
    this._state.chapterId = chapterId;
    this._state.currentTime = 0;
    this._lastSaveRatio = 0;
    // 续读：如果切换到的是已存在进度的章节
    const progress = store.getProgress(this._course.id);
    if (progress && progress.chapterId === chapterId) {
      this._state.currentTime = Math.floor(progress.percent * ch.duration);
    }
    // 更新标题
    if (this._elChapterTitle) this._elChapterTitle.textContent = ch.title;
    // 更新顶部章节编号 + duration
    const eyebrow = qs('.learning-hero__eyebrow', this._root);
    if (eyebrow) {
      const idx = chapters.findIndex(c => c.id === chapterId);
      eyebrow.textContent = `CHAPTER ${String(idx + 1).padStart(2, '0')} / ${String(chapters.length).padStart(2, '0')}`;
    }
    if (this._elDuration) this._elDuration.textContent = formatTimecode(ch.duration);
    // 上一/下一章按钮状态
    const idx = chapters.findIndex(c => c.id === chapterId);
    const prevBtn = qs('[data-role="prev-chapter"]', this._root);
    const nextBtn = qs('[data-role="next-chapter"]', this._root);
    if (prevBtn) prevBtn.disabled = idx === 0;
    if (nextBtn) nextBtn.disabled = idx === chapters.length - 1;
    // TOC 高亮
    this._renderTOCState();
    this._updatePlayingUI();
    // 自动开始播放
    if (!this._state.isPlaying) this._togglePlay();
    // 滚回顶部
    this._root.querySelector('.learning-hero')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  _renderTOCState() {
    const items = qsa('[data-role="toc-item"]', this._root);
    items.forEach(item => {
      const isCurrent = item.dataset.chapterId === this._state.chapterId;
      item.classList.toggle('is-current', isCurrent);
      if (isCurrent) item.classList.add('is-open');
    });
  },

  _toggleAccordion(item) {
    if (!item) return;
    // 单展开模式：关闭其它
    qsa('.accordion__item', this._root).forEach(o => {
      if (o !== item) o.classList.remove('is-open');
    });
    item.classList.toggle('is-open');
  },
};
