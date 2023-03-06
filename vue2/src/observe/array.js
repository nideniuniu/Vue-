// 我们希望重写数组中的部分方法

let oldArrayProto = Array.prototype; // 获取数组的原型

// newArrayProto.__proto__ = oldArrayProto;
export let newArrayProto = Object.create(oldArrayProto);

let methods = [ // 找到所有的变异方法
  'push',
  'pop',
  'shift',
  'unshift',
  'revese',
  'sort',
  'splice'
] // concat slice 都不会改变原数组

methods.forEach(method => {
  newArrayProto[method] = function (...args) { // 这里重写了数组的方法
    const result = oldArrayProto[method].call(this, ...args); // this 指向调用者 内部调用原来的方法，函数的劫持 切片编程

    // 我们需要对新增的数据再次进行劫持
    let inserted;
    let ob = this.__ob__;
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args;
        break;
      case 'splice':
        inserted = args.slice(2);
        break
      default:
        break;
    }
    if(inserted) {
      // 对新增的内容再次进行观测
      ob.ObserveArray(inserted);
    }

    // 走到这里
    ob.dep.notify(); // 数组变化 通知对应的 watcher 更新组件
    return result;
  }
})