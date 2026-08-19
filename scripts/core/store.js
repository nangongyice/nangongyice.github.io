// ============================================================
// store.js — 应用状态 + LocalStorage 持久化 + pub/sub
// 切片：auth / purchases / favorites / progress / recent / cart
// ============================================================

import { storage, migrate } from './storage.js';

const STATE_KEY = 'state';
const SCHEMA_VERSION = 1;

const initialState = {
  schema: SCHEMA_VERSION,
  auth: { user: null, loginAt: null },
  purchases: [],            // courseId[]
  favorites: [],            // courseId[]
  progress: {},             // { [courseId]: { chapterId, percent, updatedAt } }
  recent: [],                // courseId[]（最近浏览，最多 12）
  cart: null,                // { courseId, qty } | null
};

function load() {
  const saved = storage.get(STATE_KEY, null);
  if (!saved) return structuredClone(initialState);
  // 迁移
  const fromSchema = saved.schema ?? 1;
  const migrated = fromSchema < SCHEMA_VERSION ? migrate(saved, fromSchema) : saved;
  // 合并默认值（防止旧数据缺字段）
  return {
    ...structuredClone(initialState),
    ...migrated,
    schema: SCHEMA_VERSION,
  };
}

let state = load();
const subs = new Set();

function persist() {
  state.schema = SCHEMA_VERSION;
  storage.set(STATE_KEY, state);
}

function notify() {
  subs.forEach(fn => {
    try { fn(state); } catch (err) { console.error('[store] subscriber error', err); }
  });
}

export const store = {
  /**
   * 获取当前状态（只读引用，请勿直接修改）
   */
  get() { return state; },

  /**
   * 浅合并顶层字段，自动持久化 + 通知
   */
  set(patch) {
    Object.assign(state, patch);
    persist();
    notify();
  },

  /**
   * 针对某切片做更新：update('favorites', favs => [...favs, id])
   */
  update(slice, fn) {
    if (!(slice in state)) throw new Error(`[store] unknown slice: ${slice}`);
    state[slice] = fn(state[slice]);
    persist();
    notify();
  },

  /**
   * 订阅状态变化，返回取消订阅函数
   */
  subscribe(fn) {
    subs.add(fn);
    return () => subs.delete(fn);
  },

  /**
   * 重置到初始状态（DEMO 演示重置）
   */
  reset() {
    state = structuredClone(initialState);
    persist();
    notify();
  },

  // —— 业务便捷方法 ——————————————————————

  isLoggedIn() { return !!state.auth.user; },

  login(name = '新页读者') {
    this.update('auth', () => ({
      user: { id: 'u-demo', name, avatar: null, joinedAt: new Date().toISOString() },
      loginAt: Date.now(),
    }));
  },

  logout() {
    this.update('auth', () => ({ user: null, loginAt: null }));
  },

  isPurchased(courseId) {
    return state.purchases.includes(courseId);
  },

  addPurchase(courseId) {
    if (state.purchases.includes(courseId)) return;
    this.update('purchases', list => [...list, courseId]);
  },

  isFavorite(courseId) {
    return state.favorites.includes(courseId);
  },

  toggleFavorite(courseId) {
    this.update('favorites', list =>
      list.includes(courseId)
        ? list.filter(id => id !== courseId)
        : [...list, courseId]
    );
  },

  getProgress(courseId) {
    return state.progress[courseId] || null;
  },

  setProgress(courseId, { chapterId, percent }) {
    this.update('progress', all => ({
      ...all,
      [courseId]: { chapterId, percent, updatedAt: Date.now() },
    }));
  },

  pushRecent(courseId) {
    this.update('recent', list => {
      const filtered = list.filter(id => id !== courseId);
      return [courseId, ...filtered].slice(0, 12);
    });
  },

  setCart(courseId, qty = 1) {
    this.update('cart', () => ({ courseId, qty }));
  },

  clearCart() {
    this.update('cart', () => null);
  },
};
