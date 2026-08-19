// ============================================================
// event-bus.js — 跨组件通信
// ============================================================

const channels = new Map();

export const eventBus = {
  on(event, handler) {
    if (!channels.has(event)) channels.set(event, new Set());
    channels.get(event).add(handler);
    return () => this.off(event, handler);
  },

  off(event, handler) {
    const set = channels.get(event);
    if (set) set.delete(handler);
  },

  emit(event, payload) {
    const set = channels.get(event);
    if (!set) return;
    set.forEach(fn => {
      try { fn(payload); } catch (err) { console.error('[eventBus] handler error', event, err); }
    });
  },

  clear() {
    channels.clear();
  },
};

// 全局事件常量
export const EVENTS = {
  CART_CHANGED: 'cart:changed',
  PURCHASE_SUCCESS: 'purchase:success',
  FAVORITE_TOGGLED: 'favorite:toggled',
  PROGRESS_SAVED: 'progress:saved',
  AUTH_CHANGED: 'auth:changed',
  BOOKSHELF_UPDATED: 'bookshelf:updated',
  ROUTE_CHANGED: 'route:changed',
  TOAST: 'toast:show',
  CURSOR_ENTER: 'cursor:enter',
  CURSOR_LEAVE: 'cursor:leave',
};
