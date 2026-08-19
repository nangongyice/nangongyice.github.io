// ============================================================
// Footer.js — 全站页脚
// 含：品牌 slogan / 4 列导航 / 重置 DEMO 入口 / 版权
// ============================================================

import { Component } from './Component.js';
import { store } from '../core/store.js';

export class Footer extends Component {
  constructor() { super(); }

  template() {
    const year = new Date().getFullYear();
    return `
      <div class="footer">
        <div class="footer__inner container">
          <div class="footer__brand">
            <div class="footer__logo">
              <span class="footer__logo-mark" aria-hidden="true">
                <svg viewBox="0 0 32 32" fill="none" width="32" height="32">
                  <path d="M4 6 L16 4 L28 6 L28 26 L16 28 L4 26 Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" fill="none"/>
                  <path d="M16 4 L16 28" stroke="currentColor" stroke-width="1.6"/>
                </svg>
              </span>
              <span class="footer__logo-text">
                <span class="footer__logo-en">NEW PAGE</span>
                <span class="footer__logo-cn">新页</span>
              </span>
            </div>
            <p class="footer__slogan">每一次学习，<br/>都是打开人生的新一页。</p>
          </div>

          <div class="footer__cols">
            <div class="footer__col">
              <h4 class="footer__col-title">探索</h4>
              <ul>
                <li><a href="/discover" data-link>发现</a></li>
                <li><a href="/discover?focus=courses" data-link>课程商城</a></li>
                <li><a href="/discover?focus=creators" data-link>创作者</a></li>
              </ul>
            </div>
            <div class="footer__col">
              <h4 class="footer__col-title">学习</h4>
              <ul>
                <li><a href="/bookshelf" data-link>我的书架</a></li>
                <li><a href="/discover?focus=happening" data-link>正在发生</a></li>
              </ul>
            </div>
            <div class="footer__col">
              <h4 class="footer__col-title">账户</h4>
              <ul>
                <li><a href="/login" data-link>登录 / 注册</a></li>
                <li><button type="button" data-role="reset-demo" class="footer__reset">重置 DEMO 数据</button></li>
              </ul>
            </div>
          </div>
        </div>

        <div class="footer__bottom container">
          <p class="footer__copy">© ${year} NEW PAGE 新页 · 知识内容消费与学习平台 DEMO</p>
          <p class="footer__note">本站为 V1.0 演示版本，所有数据为 Mock，购买与学习记录保存在本地。</p>
        </div>
      </div>`;
  }

  bindEvents() {
    this.delegate('click', '[data-role="reset-demo"]', () => {
      if (window.confirm('确定重置 DEMO 数据？这将清空你的登录、书架、收藏与学习进度。')) {
        store.reset();
        location.reload();
      }
    });
  }
}
