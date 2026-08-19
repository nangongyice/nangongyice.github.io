// ============================================================
// image.js — trae-api 图片 URL 拼接 + 懒加载 + 渐变兜底
// ============================================================

const API_BASE = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image';

// 按 category hash 出不同色调兜底
const fallbackGradients = {
  design:   ['#FBE4D8', '#FAF7F1'],
  tech:     ['#E6E1D5', '#F2EEE5'],
  product:  ['#FBE4D8', '#F2EEE5'],
  business: ['#E6DFD3', '#FAF7F1'],
  writing:  ['#F4E5C8', '#FAF7F1'],
  art:      ['#F8D9B5', '#F2EEE5'],
  mind:     ['#E8E1D9', '#FAF7F1'],
  growth:   ['#FBE4D8', '#F4E5C8'],
  default:  ['#F2EEE5', '#FAF7F1'],
};

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * 构建 trae-api 图片 URL
 * @param {string} prompt - 已完整描述的 prompt
 * @param {string} size - square_hd|square|portrait_4_3|portrait_16_9|landscape_4_3|landscape_16_9
 */
export function imageUrl(prompt, size = 'landscape_4_3') {
  if (!prompt) return '';
  const encoded = encodeURIComponent(prompt);
  return `${API_BASE}?prompt=${encoded}&image_size=${size}`;
}

/**
 * 根据 category 生成兜底渐变（CSS background 值）
 */
export function fallbackGradient(categoryId = 'default') {
  const colors = fallbackGradients[categoryId] || fallbackGradients.default;
  return `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`;
}

/**
 * 设置图片元素：先占位渐变，进入视口后再加载真实 URL
 * @param {HTMLImageElement} img - 目标 <img>
 * @param {Object} opts
 * @param {string} opts.src - 真实 URL
 * @param {string} [opts.alt] - alt
 * @param {string} [opts.category] - 用于兜底色调
 * @param {string} [opts.sizes] - srcset sizes 提示
 */
export function setImageLazy(img, { src, alt = '', category = 'default' }) {
  if (!img) return;
  img.alt = alt;
  img.dataset.category = category;
  img.style.background = fallbackGradient(category);

  if (!src) {
    img.classList.add('img-fallback');
    return;
  }

  img.dataset.src = src;

  // 不支持 IntersectionObserver 时直接加载
  if (!('IntersectionObserver' in window)) {
    img.src = src;
    return;
  }

  if (!setImageLazy._observer) {
    setImageLazy._observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const realSrc = el.dataset.src;
        if (!realSrc) return;
        const preload = new Image();
        preload.onload = () => { el.src = realSrc; el.classList.add('img-loaded'); };
        preload.onerror = () => { el.classList.add('img-fallback'); };
        preload.src = realSrc;
        setImageLazy._observer.unobserve(el);
      });
    }, { rootMargin: '200px 0px' });
  }
  setImageLazy._observer.observe(img);
}

/**
 * 同步加载（首屏 Hero 等关键图，不懒加载）
 */
export function setImageSync(img, { src, alt = '', category = 'default' }) {
  if (!img) return;
  img.alt = alt;
  img.style.background = fallbackGradient(category);
  if (!src) { img.classList.add('img-fallback'); return; }
  const preload = new Image();
  preload.onload = () => { img.src = src; img.classList.add('img-loaded'); };
  preload.onerror = () => { img.classList.add('img-fallback'); };
  preload.src = src;
}
