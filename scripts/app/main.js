// ============================================================
// main.js — 应用入口
// 启动顺序：ThemeService → Header → Footer → Cursor → Toast → 注册路由 → 启动路由
// ============================================================

import { initTheme, onThemeChange, getThemeState } from '../core/theme.js';
import { Header } from '../components/Header.js';
import { Footer } from '../components/Footer.js';
import { Cursor } from '../components/Cursor.js';
import { Toast } from '../components/Toast.js';
import { Intro } from '../components/Intro.js';
import { registerAll, startRouter } from './router.js';

// 注册页面视图
import HomeView from '../pages/home.js';
import DiscoverView from '../pages/discover.js';
import CourseDetailView from '../pages/course-detail.js';
import CheckoutView from '../pages/checkout.js';
import BookshelfView from '../pages/bookshelf.js';
import LearningView from '../pages/learning.js';
import LoginView from '../pages/login.js';

// —— 1. 初始化主题服务（已在 <head> 里提前设了 data 属性做防闪烁，这里再统一初始化 + 订阅系统亮暗） ——
initTheme();
onThemeChange(() => {
  // 同步 theme-color 到浏览器顶栏（按应用后的实际 theme）
  try {
    const t = getThemeState();
    const applied = t.appliedTheme;
    const brandBg = applied === 'dark' ? '#16130F' : '#FAF7F1';
    const tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.setAttribute('content', brandBg);
  } catch {}
});

registerAll([
  HomeView,
  DiscoverView,
  CourseDetailView,
  CheckoutView,
  BookshelfView,
  LearningView,
  LoginView,
]);

// —— 挂载 Header / Footer ——
const headerSlot = document.getElementById('site-header');
const footerSlot = document.getElementById('site-footer');

const header = new Header();
const footer = new Footer();
header.mount(headerSlot);
footer.mount(footerSlot);

// —— 初始化 Toast（自动监听 eventBus） ——
Toast; // 触发构造

// —— 初始化定制光标（桌面端） ——
Cursor.init();

// —— 启动首屏 intro 动画（S2，仅首次会话播放一次） ——
document.body.classList.add('app-ready');
(async () => {
  await Intro.play();
  document.body.classList.add('is-intro-done');
})();

// —— 启动路由 ——
startRouter();

// —— 暴露调试入口 ——
window.__NEWPAGE__ = { Toast, Cursor, store: (await import('../core/store.js')).store, api: (await import('../core/api.js')).api };
