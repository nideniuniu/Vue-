let id = 0;

class Dep {
  constructor() {
    this.id = id++; // 属性的 dep 要收集 watcher
    this.subs = []; // 这里存放着当前属性对应的watcher有哪些
  }
  depend() {
    // 这里我们不希望放置重复的 watcher 而且刚才只是一个单向的关系 dep -> watcher
    // watcher 记录 dep
    // this.subs.push(Dep.target);

    Dep.target.addDep(this); // 让 watcher 记住 dep

    // dep 和 watcher 是一个多对多的关系（一个属性可以在多个组件中使用 dep -> 多个 watcher）
    // 一个组件中由多个属性组成（一个watcher 对应多个dep）
  }
  addSub(watcher) {
    this.subs.push(watcher);
  }
  notify() {
    this.subs.forEach(watcher => watcher.update()); // 告诉 watcher 更新
  }
}
Dep.target = null;

export default Dep;