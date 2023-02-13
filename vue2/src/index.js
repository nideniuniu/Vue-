import { initMixin } from './init'

// 将所有的方法都耦合在一起
function Vue(options) { // options 就是用户的选项
  this._init(options); // 默认就调用了 init
}

initMixin(Vue); // 扩展了 init 方法

export default Vue;