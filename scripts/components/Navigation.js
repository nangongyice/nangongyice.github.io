// ============================================================
// Navigation.js — 主导航
// 4 项：发现 / 课程 / 创作者 / 书架（书架入口由 Header 单独管理）
// 这里只渲染前 3 项 + 当前路径高亮
// ============================================================

import { Component } from './Component.js';
import { eventBus, EVENTS } from '../app/event-bus.js';

const NAV_ITEMS = [
  { label: '发现', sub: 'Discover', href: '/discover', match: '/discover' },
  { label: '课程', sub: 'Courses', href: '/discover?focus=courses', match: '/discover' },
  { label: '创作者', sub: 'Creators', href: '/discover?focus=creators', match: '/discover' },
];

export class Navigation extends Component {
  constructor() { super(); this.state = { currentPath: location.pathname }; }

  template() {
    const { currentPath } = this.state;
    return `
      <ul class="nav">
        ${NAV_ITEMS.map(item => {
          const active = currentPath === item.match || currentPath.startsWith(item.match + '/');
          return `
            <li class="nav__item${active ? ' is-active' : ''}">
              <a href="${item.href}" class="nav__link" data-link>
                <span class="nav__label">${item.label}</span>
                <span class="nav__sub">${item.sub}</span>
              </a>
            </li>`;
        }).join('')}
      </ul>`;
  }

  onMount() {
    this._unsubRoute = eventBus.on(EVENTS.ROUTE_CHANGED, ({ path }) => {
      this.setState({ currentPath: path.split('?')[0] });
    });
  }

  onUnmount() {
    this._unsubRoute?.();
  }
}
