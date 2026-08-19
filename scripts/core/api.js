// ============================================================
// api.js — Mock / 真接口抽象层
// 切换：USE_MOCK = false 即走 fetch，签名不变
// ============================================================

import * as mock from '../data/index.js';

const USE_MOCK = true;
const BASE = '/api';            // 真接口时改这里
const DELAY = 320;              // Mock 网络延迟（演示 Skeleton）

function delay(data, ms = DELAY) {
  return new Promise(resolve => setTimeout(() => resolve(data), ms));
}

function byQuery(list, q = {}) {
  let out = list;
  if (q.categoryId) out = out.filter(x => x.categoryId === q.categoryId);
  if (q.creatorId)  out = out.filter(x => x.creatorId === q.creatorId);
  if (q.featured != null)  out = out.filter(x => x.featured === q.featured);
  if (q.happening != null) out = out.filter(x => x.happening === q.happening);
  if (q.search) {
    const k = String(q.search).toLowerCase();
    out = out.filter(x =>
      x.title.toLowerCase().includes(k) ||
      x.subtitle.toLowerCase().includes(k) ||
      (x.tags || []).some(t => t.toLowerCase().includes(k))
    );
  }
  if (q.limit) out = out.slice(0, q.limit);
  if (q.offset) out = out.slice(q.offset, q.offset + (q.limit || out.length));
  return out;
}

export const api = {
  // —— 课程 ——————————————————————
  async getCourses(query = {}) {
    return USE_MOCK
      ? delay(byQuery(mock.coursesWithChapters, query))
      : fetch(`${BASE}/courses?${new URLSearchParams(query)}`).then(r => r.json());
  },

  async getCourse(id) {
    return USE_MOCK
      ? delay(mock.courseMap[id] || null)
      : fetch(`${BASE}/courses/${id}`).then(r => r.json());
  },

  async getRelatedCourses(id, limit = 4) {
    const target = mock.courseMap[id];
    if (!target) return delay([]);
    const related = mock.coursesWithChapters
      .filter(c => c.id !== id && (c.categoryId === target.categoryId || c.creatorId === target.creatorId))
      .slice(0, limit);
    return delay(related);
  },

  // —— 创作者 ——————————————————————
  async getCreators(query = {}) {
    return USE_MOCK
      ? delay(byQuery(mock.creators, query))
      : fetch(`${BASE}/creators?${new URLSearchParams(query)}`).then(r => r.json());
  },

  async getCreator(id) {
    return USE_MOCK
      ? delay(mock.creatorMap[id] || null)
      : fetch(`${BASE}/creators/${id}`).then(r => r.json());
  },

  // —— 分类 / Banner / 评价 ——————————————
  async getCategories() {
    return USE_MOCK ? delay(mock.categories) : fetch(`${BASE}/categories`).then(r => r.json());
  },

  async getBanners() {
    return USE_MOCK ? delay(mock.banners) : fetch(`${BASE}/banners`).then(r => r.json());
  },

  async getTestimonials(courseId) {
    const list = courseId
      ? mock.testimonials.filter(t => t.courseId === courseId)
      : mock.testimonials;
    return USE_MOCK ? delay(list) : fetch(`${BASE}/testimonials?courseId=${courseId || ''}`).then(r => r.json());
  },

  async getScenePrompts() {
    return USE_MOCK ? delay(mock.scenePrompts) : fetch(`${BASE}/scenes`).then(r => r.json());
  },

  // —— 购买 ——————————————————————
  async purchase(courseId) {
    return USE_MOCK
      ? delay({ ok: true, orderId: `ord_${Date.now()}`, courseId, paidAt: new Date().toISOString() })
      : fetch(`${BASE}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId }),
        }).then(r => r.json());
  },
};
