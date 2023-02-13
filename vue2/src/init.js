import { initState } from './state';

export function initMixin(Vue) { // 就是给 Vue 增加 init 方法
  Vue.prototype._init = function (options) {
    // vue $options 就是获取用户的配置

    // 我们使用的 vue 的时候 以 $ 开头为 vue 的属性
    const vm = this;
    vm.$options = options; // 将用户的选项挂载到实例上

    // 初始化状态
    initState(vm)
  }
}
