import { mountComponent } from './lifecycle';
import { compileToFunction } from './compiler';
import { initState } from './state';

export function initMixin(Vue) { // 就是给 Vue 增加 init 方法
  Vue.prototype._init = function (options) {
    // vue $options 就是获取用户的配置

    // 我们使用的 vue 的时候 以 $ 开头为 vue 的属性
    const vm = this;
    vm.$options = options; // 将用户的选项挂载到实例上

    // 初始化状态
    initState(vm)

    if (options.el) {
      vm.$mount(options.el); // 实现数据的挂载
    }
  }
  Vue.prototype.$mount = function (el) {
    const vm = this;
    el = document.querySelector(el);
    let ops = vm.$options;
    if (!ops.render) { // 先进行查找有没有 render
      let template; // 没有render看一下是否写了template，没写 template 采用外部的 template
      if (!ops.template && el) { // 没有写模板 但是写了 el
        template = el.outerHTML;
      } else {
        if (el) {
          template = ops.template; // 如果有 el 则采用模板的内容
        }
      }
      if (template) {
        // 这里需要对模板进行编译
        const render = compileToFunction(template);
        ops.render = render; // jsx 最终会被编译成（'xxx'）
      }
    }

    mountComponent(vm, el); // 组件的挂载
    // 最终就可以获取 render 方法
    // script 标签引用的 vue.global.js 这个编译过程是在浏览器运行的
    // runtime 是不包含模板编译的，整个编译是打包的时候通过 loader 来转义，vue文件的，用runtime的时候不能使用template
  }
}
