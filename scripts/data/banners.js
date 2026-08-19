// ============================================================
// banners.js — 5 张 Hero 轮播 + 品牌区/登录页背景 prompt
// ============================================================

export const banners = [
  {
    id: 'b01',
    eyebrow: 'NEW PAGE · 第一页',
    title: '每一次学习',
    titleAccent: '都是打开人生的新一页',
    subtitle: '在这里，发现属于你的下一章。知识不再是商品，而是被翻开的世界。',
    ctaText: '开始探索',
    ctaLink: '/discover',
    imagePrompt: 'abstract minimal scene of an open book turning into a horizon at dawn, soft cream and amber tones, cinematic, editorial, lots of negative space',
    accent: 'brand',
  },
  {
    id: 'b02',
    eyebrow: 'EDITORIAL · 创作者特辑',
    title: '从一页开始',
    titleAccent: '写完整个世界',
    subtitle: '与 8 位创作者同行，走进他们的工作流与思考路径。',
    ctaText: '认识创作者',
    ctaLink: '/discover?filter=creators',
    imagePrompt: 'warm light pouring through a tall window onto an open notebook on a wooden desk, ink and paper texture, calm, editorial, cream and amber palette',
    accent: 'ink',
  },
  {
    id: 'b03',
    eyebrow: 'FEATURED · 正在发生',
    title: '把今天',
    titleAccent: '读成新的一页',
    subtitle: '正在发生的知识现场，每天更新一个值得收藏的视角。',
    ctaText: '看看今天',
    ctaLink: '/discover?filter=happening',
    imagePrompt: 'lone figure walking toward a vast open page floating in mid air, surreal, soft gradient, cream and amber tones, dreamlike',
    accent: 'brand',
  },
  {
    id: 'b04',
    eyebrow: 'COURSE · 热门课程',
    title: '不必通读所有书',
    titleAccent: '但该读对的那一本',
    subtitle: '精选 14 门由领域创作者亲述的课程，每一门都是一次完整翻开。',
    ctaText: '浏览课程',
    ctaLink: '/discover?filter=courses',
    imagePrompt: 'stack of books with one glowing page rising upward, warm amber accent, deep cream background, soft focus, premium editorial',
    accent: 'ink',
  },
  {
    id: 'b05',
    eyebrow: 'PHILOSOPHY · 关于「页」',
    title: '页，是单位',
    titleAccent: '也是阶段',
    subtitle: '我们以页为名，因为相信学习不该是一次性购买，而是一段被持续翻开的旅程。',
    ctaText: '了解新页',
    ctaLink: '/about',
    imagePrompt: 'person reading under a single beam of warm light, dust particles in air, deep cream tones, cinematic, contemplative mood',
    accent: 'brand',
  },
];

// 品牌区与登录页背景 prompt（由 image.js 单独消费）
export const scenePrompts = {
  brandBackground: 'abstract open book pages floating in slow motion, cream and amber tones, dreamlike, very minimal, lots of negative space for text overlay',
  loginTextureA: 'slow-moving giant typography texture, cream paper, faint ink numbers and letters, atmospheric, very low contrast, minimal',
  loginTextureB: 'close-up of cream paper with subtle grain and one amber brushstroke, ink lightly bleeding, editorial, atmospheric, very low contrast',
  emptyBookshelf: 'minimal illustration of an empty open book with a small amber bookmark, cream background, friendly, soft, flat editorial style',
  emptySearch: 'minimal illustration of a magnifier resting over an open page, no results, soft cream tones, flat editorial style',
};
