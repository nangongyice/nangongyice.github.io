// ============================================================
// format.js — 价格/人数/时长格式化
// ============================================================

/**
 * 价格：299 → ¥299
 */
export function formatPrice(n) {
  return `¥${n}`;
}

/**
 * 价格带分：299.00 → ¥299.00
 */
export function formatPriceExact(n) {
  return `¥${Number(n).toFixed(2)}`;
}

/**
 * 学习人数：3421 → 3,421；48200 → 4.8万
 */
export function formatLearnerCount(n) {
  if (n < 10000) return n.toLocaleString('en-US');
  return `${(n / 10000).toFixed(1)}万`;
}

/**
 * 时长（秒）：5400 → 1小时30分钟
 */
export function formatDuration(seconds) {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}分钟`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}小时${rem}分钟` : `${h}小时`;
}

/**
 * 时长（秒）→ mm:ss 或 h:mm:ss
 */
export function formatTimecode(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/**
 * 百分比：0.42 → 42%
 */
export function formatPercent(n) {
  return `${Math.round(n * 100)}%`;
}

/**
 * 日期：'2026-08-12' → '2026 年 8 月 12 日'
 */
export function formatDateCN(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

/**
 * 相对时间：'2026-08-08' → '10 天前'
 */
export function formatRelative(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const day = 24 * 60 * 60 * 1000;
  const days = Math.floor(diff / day);
  if (days <= 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 30) return `${days} 天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} 个月前`;
  return `${Math.floor(months / 12)} 年前`;
}
