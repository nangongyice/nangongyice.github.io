// ============================================================
// Component.js — 组件基类
// 统一生命周期：template → render → mount → bindEvents → unmount
// 订阅 store 由基类自动退订
// ============================================================

import { store } from '../core/store.js';
import { fromHTML, delegate } from '../core/dom.js';

export class Component {
  constructor(props = {}) {
    this.props = props;
    this.state = {};
    this.el = null;
    this._unsubs = [];
    this._unbindings = [];
    this._destroyed = false;
  }

  /** 子类重写：返回 HTML 字符串 */
  template() { return ''; }

  /** 创建 DOM */
  render() {
    const html = this.template();
    this.el = typeof html === 'string' ? fromHTML(html) : html;
    if (this.el && this.props.dataset) {
      for (const [k, v] of Object.entries(this.props.dataset)) this.el.dataset[k] = v;
    }
    this.bindEvents?.();
    this.afterRender?.();
    return this.el;
  }

  /** 挂载到父节点 */
  mount(parent) {
    if (!this.el) this.render();
    if (parent && this.el) parent.appendChild(this.el);
    this.onMount?.();
    return this;
  }

  /** 卸载并清理所有订阅 */
  unmount() {
    this.onUnmount?.();
    this._unsubs.forEach(fn => { try { fn(); } catch {} });
    this._unbindings.forEach(fn => { try { fn(); } catch {} });
    this._unsubs = [];
    this._unbindings = [];
    this.el?.remove();
    this.el = null;
    this._destroyed = true;
  }

  /** 状态更新触发重渲染（子类可重写为局部 patch） */
  setState(partial) {
    Object.assign(this.state, partial);
    if (this.el && !this._destroyed) this.update();
  }

  /** 默认全量重渲染（替换 DOM 节点） */
  update() {
    if (!this.el) return;
    const newEl = this.render();
    if (newEl && this.el.parentNode) {
      this.el.parentNode.replaceChild(newEl, this.el);
      this.el = newEl;
    }
  }

  /** 事件委托：自动清理 */
  delegate(eventType, selector, handler) {
    if (!this.el) return;
    const unbind = delegate(this.el, eventType, selector, (e, matched) => handler(e, matched));
    this._unbindings.push(unbind);
    return unbind;
  }

  /** 订阅 store，自动 unmount 退订 */
  subscribeStore(selector, cb) {
    const unsub = store.subscribe(state => {
      const slice = typeof selector === 'function' ? selector(state) : state[selector];
      cb(slice);
    });
    this._unsubs.push(unsub);
    return unsub;
  }

  /** 监听事件 */
  on(target, event, handler) {
    target.addEventListener(event, handler);
    const unbind = () => target.removeEventListener(event, handler);
    this._unbindings.push(unbind);
    return unbind;
  }
}

export default Component;
