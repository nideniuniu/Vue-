import Dep from "./dep";

let id = 0;

// 1）当我们创建渲染 watcher 的时候我们会把当前的渲染的 watcher 放到 dep.target 上
// 2）调用 _render() 会取值 走到get上

// 每个属性有一个 dep（属性计算被观察者），watcher 就是观察者（属性变化了会通知观察着更新）-> 观察者模式

class Watcher { // 不同组件有不同的 watcher  目前只有一个 渲染根实例的
  constructor(vm, fn, options) {
    this.id = id++;
    this.renderWatcher = options; // 是一个渲染 watcher
    this.getter = fn; // getter 意味着调用这个函数可以发生取值操作
    this.deps = []; // 后续我们实现计算属性，和一些清理工作需要用到
    this.depsId = new Set()
    this.get();
  }
  get() {
    Dep.target = this; // 静态属性就是只有一份
    this.getter(); // 会去 vm 取值
    Dep.target = null; // 渲染完成后就清空
  }
  addDep(dep) { // 一个组件对应着多个属性，重复的属性也不用记录
    let id = dep.id;
    if (!this.depsId.has(id)) {
      this.deps.push(dep);
      this.depsId.add(id);
      dep.addSub(this); // watcher 已经记住了dep 而且去重了，此时让 dep 也记住 watcher
    }
  }
  update() {
    this.get(); // 重新渲染
  }
}

// 需要给每个属性增加一个 dep，目的就是收集 watcher

// 一个组件中 n 个属性，对应一个视图，n 个 dep 对应一个 watcher
// 一个属性对应着多个组件，一个dep对应多个watcher
// 多对多

export default Watcher;