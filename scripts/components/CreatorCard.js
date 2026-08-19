// ============================================================
// CreatorCard.js — 创作者卡片
// 头像 + 姓名 + 职业 + 简介 + 课程/粉丝数据
// ============================================================

import { Component } from './Component.js';
import { Avatar } from './Avatar.js';
import { formatLearnerCount } from '../core/format.js';

export class CreatorCard extends Component {
  constructor({ creator, index = 0 } = {}) {
    super({ creator, index });
    this.avatar = new Avatar({
      prompt: creator.avatarPrompt,
      name: creator.name,
      alt: creator.name,
      size: 'lg',
    });
  }

  template() {
    const { creator, index } = this.props;
    return `
      <article class="creator-card" data-creator-id="${creator.id}" data-cursor="open" data-reveal data-reveal-delay="${index * 100}">
        <div class="creator-card__inner">
          <div class="creator-card__avatar-slot" data-role="avatar"></div>
          <div class="creator-card__body">
            <h3 class="creator-card__name">${creator.name}</h3>
            <p class="creator-card__profession">${creator.profession}</p>
            <p class="creator-card__bio">${creator.bio}</p>
            <div class="creator-card__stats">
              <div class="creator-card__stat">
                <span class="creator-card__stat-num">${creator.courseCount}</span>
                <span class="creator-card__stat-label">门课程</span>
              </div>
              <div class="creator-card__stat">
                <span class="creator-card__stat-num">${formatLearnerCount(creator.followerCount)}</span>
                <span class="creator-card__stat-label">关注者</span>
              </div>
            </div>
            <div class="creator-card__specialty">
              ${creator.specialty.map(s => `<span class="tag tag--outline">${s}</span>`).join('')}
            </div>
          </div>
        </div>
      </article>`;
  }

  afterRender() {
    const slot = this.el?.querySelector('[data-role="avatar"]');
    if (slot && this.avatar) this.avatar.mount(slot);
  }

  onUnmount() {
    this.avatar?.unmount();
  }
}

export function creatorCardInlineHTML(creator, index = 0) {
  return `
    <article class="creator-card" data-creator-id="${creator.id}" data-cursor="open" data-reveal data-reveal-delay="${index * 100}">
      <div class="creator-card__inner">
        <div class="creator-card__avatar-slot">
          <span class="avatar avatar--lg" data-category="default">
            <span class="avatar__fallback">${creator.name.slice(0, 1)}</span>
            <img class="avatar__img" data-src="" alt="${creator.name}" />
          </span>
        </div>
        <div class="creator-card__body">
          <h3 class="creator-card__name">${creator.name}</h3>
          <p class="creator-card__profession">${creator.profession}</p>
          <p class="creator-card__bio">${creator.bio}</p>
          <div class="creator-card__stats">
            <div class="creator-card__stat">
              <span class="creator-card__stat-num">${creator.courseCount}</span>
              <span class="creator-card__stat-label">门课程</span>
            </div>
            <div class="creator-card__stat">
              <span class="creator-card__stat-num">${formatLearnerCount(creator.followerCount)}</span>
              <span class="creator-card__stat-label">关注者</span>
            </div>
          </div>
          <div class="creator-card__specialty">
            ${creator.specialty.map(s => `<span class="tag tag--outline">${s}</span>`).join('')}
          </div>
        </div>
      </div>
    </article>`;
}
