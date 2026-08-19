// ============================================================
// categories.js — 8 个课程分类
// ============================================================

export const categories = [
  { id: 'design',      name: '设计',     nameEn: 'Design',         iconHint: 'palette'    },
  { id: 'tech',        name: '技术',     nameEn: 'Technology',     iconHint: 'code'       },
  { id: 'product',     name: '产品',     nameEn: 'Product',        iconHint: 'layers'     },
  { id: 'business',    name: '商业',     nameEn: 'Business',       iconHint: 'briefcase'  },
  { id: 'writing',     name: '写作',     nameEn: 'Writing',        iconHint: 'pen'        },
  { id: 'art',         name: '艺术',     nameEn: 'Art',            iconHint: 'aperture'   },
  { id: 'mind',        name: '心智',     nameEn: 'Mind',           iconHint: 'sparkles'    },
  { id: 'growth',      name: '成长',     nameEn: 'Growth',         iconHint: 'arrow-up'   },
];

export const categoryMap = Object.fromEntries(categories.map(c => [c.id, c]));
