(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Vue = factory());
})(this, (function () { 'use strict';

  class Observe {
    constructor(data) {
      // Object.defineProperty 只能劫持已经存在的属性（vue里面会为此单独写一些 api $set $delete）

      this.walk(data);
    }
    walk(data) {
      // 循环对象 对属性依次劫持
      // 重新定义属性
      Object.keys(data).forEach(key => defineReactive(data, key, data[key]));
    }
  }
  function defineReactive(target, key, value) {
    // 闭包 属性劫持
    observe(value); // 对所有的对象都进行属性劫持
    Object.defineProperty(target, key, {
      get() {
        // 取值的时候 会执行 get
        return value;
      },
      set(newValue) {
        // 修改的时候 会执行 set
        if (newValue === value) return;
        value = newValue;
      }
    });
  }
  function observe(data) {
    // 对这个对象进行劫持

    if (typeof data !== 'object' || data == null) {
      return; // 只对执行进行劫持
    }

    // 如果一个对象被劫持过了，那就不需要再被劫持了（要判断一个对象是否被劫持过，可以增添一个实例，用实例来判断是否被劫持过）

    return new Observe(data);
  }

  function initState(vm) {
    const opts = vm.$options; // 获取所有的选项
    if (opts.data) {
      initData(vm);
    }
  }
  function proxy(vm, target, key) {
    Object.defineProperty(vm, key, {
      get() {
        return vm[target][key]; // vm._data.name
      },

      set(newValue) {
        vm[target][key] = newValue;
      }
    });
  }
  function initData(vm) {
    let data = vm.$options.data; // data 可能是函数和对象
    data = typeof data === 'function' ? data.call(vm) : data;
    vm._data = data;
    // 对数据进行劫持 vue2 里采用了一个api defineProperty
    observe(data);

    // 将 vm._data 用 vm 来代理就可以了
    for (let key in data) {
      proxy(vm, '_data', key);
    }
  }

  function initMixin(Vue) {
    // 就是给 Vue 增加 init 方法
    Vue.prototype._init = function (options) {
      // vue $options 就是获取用户的配置

      // 我们使用的 vue 的时候 以 $ 开头为 vue 的属性
      const vm = this;
      vm.$options = options; // 将用户的选项挂载到实例上

      // 初始化状态
      initState(vm);
    };
  }

  // 将所有的方法都耦合在一起
  function Vue(options) {
    // options 就是用户的选项
    this._init(options); // 默认就调用了 init
  }

  initMixin(Vue); // 扩展了 init 方法

  return Vue;

}));
//# sourceMappingURL=vue.js.map
