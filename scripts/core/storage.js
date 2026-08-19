// ============================================================
// storage.js — LocalStorage 安全读写 + schema 版本迁移
// ============================================================

const PREFIX = 'newpage';

export const storage = {
  /**
   * 读取并解析 JSON，失败返回 fallback
   */
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(`${PREFIX}:${key}`);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      console.warn('[storage] read failed', key, err);
      return fallback;
    }
  },

  /**
   * 写入 JSON，失败静默处理（隐私模式/超限）
   */
  set(key, value) {
    try {
      localStorage.setItem(`${PREFIX}:${key}`, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn('[storage] write failed', key, err);
      return false;
    }
  },

  /**
   * 移除指定 key
   */
  remove(key) {
    try {
      localStorage.removeItem(`${PREFIX}:${key}`);
    } catch (err) {
      console.warn('[storage] remove failed', key, err);
    }
  },

  /**
   * 清空 newpage: 前缀的全部数据
   */
  clear() {
    try {
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(`${PREFIX}:`)) toRemove.push(k);
      }
      toRemove.forEach(k => localStorage.removeItem(k));
    } catch (err) {
      console.warn('[storage] clear failed', err);
    }
  },
};

/**
 * schema 版本迁移
 * 将来数据结构变化时，在此追加 migrate 函数
 */
export function migrate(state, fromSchema) {
  let s = state;
  if (fromSchema < 2) {
    // 示例：v1→v2 时，把 progress 从 { courseId: percent } 改为 { courseId: { chapterId, percent, updatedAt } }
    // if (s.progress) { ... }
  }
  return s;
}
