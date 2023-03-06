import { newArrayProto } from "./array";
import Dep from "./dep";

class Observe {
  constructor(data) {

    // 给每个对象都增加收集功能
    this.dep = new Dep(); // 所有对象都要增加 dep

    // 这个data 可能数组或者对象

    // Object.defineProperty 只能劫持已经存在的属性（vue里面会为此单独写一些 api $set $delete）

    Object.defineProperty(data, '__ob__', {
      value: this,
      enumerable: false, // 将__ob__变成不可枚举 （循环的时候无法获取到）
    })

    // data.__ob__ = this; // 给数据加了个标识 如果数据上有 __ob__ 就说明这个数据被观测过
    if (Array.isArray(data)) {
      // 这里我们可以重写数组中的方法 7个变异方法 是可以修改数组本身的
      // 覆盖自身原型方法，优先找自身原型方法，然后去 数组原型找
      data.__proto__ = newArrayProto // 需要保留数组原有的特效，并且可以重写部分方法
      this.ObserveArray(data); // 如果数组中放的是对象，可以监控到对象的变化
    } else {
      this.walk(data);
    }
  }

  walk(data) { // 循环对象 对属性依次劫持
    // 重新定义属性
    Object.keys(data).forEach(key => defineReactive(data, key, data[key]));
  } 
  ObserveArray(data) {
    data.forEach(item => observe(item))
  }
}

// 深层次嵌套要递归，递归多了性能差，不存在的属性监控不到，存在的属性要重写方法
function dependArray(value) {
  for (let i = 0; i < value.length; i++) {
    let current = value[i]
    current.__ob__ && current.__ob__.dep.depend();
    if (Array.isArray(current)) {
      dependArray(current);
    }
  }
}

export function defineReactive(target, key, value) { // 闭包 属性劫持
  let childOb = observe(value); // 对所有的对象都进行属性劫持 childOb.dep 用来收集依赖
  let dep = new Dep(); // 每一个属性都有一个 dep
  Object.defineProperty(target, key, {
    get() { // 取值的时候 会执行 get
      if (Dep.target) {
        dep.depend(); // 让这个属性的收集器记住当前的 watcher
        if (childOb) {
          childOb.dep.depend(); // 让数组和对象本身也实现依赖收集

          if (Array.isArray(value)) {
            dependArray(value);
          }
        }
      }
      return value
    },

    set(newValue) { // 修改的时候 会执行 set
      if (newValue === value) return;
      observe(newValue)
      value = newValue;
      dep.notify(); // 通知更新
    }
  })

}

export function observe(data) {
  // 对这个对象进行劫持

  if (typeof data !== 'object' || data == null) {
    return; // 只对对象进行劫持
  }

  if (data.__ob__ instanceof Observe) { // 说明这个对象被代理过
    return data.__ob__;
  }

  // 如果一个对象被劫持过了，那就不需要再被劫持了（要判断一个对象是否被劫持过，可以增添一个实例，用实例来判断是否被劫持过）

  return new Observe(data);
}