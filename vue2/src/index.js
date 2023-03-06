import { initLifeCycle } from './lifecycle';
import { initMixin } from './init'
import { nextTick } from './observe/watcher';
import { initGlobalAPI } from './gloablAPI';

// 将所有的方法都耦合在一起
function Vue(options) { // options 就是用户的选项
  this._init(options); // 默认就调用了 init
}

Vue.prototype.$nextTick = nextTick;
 

initMixin(Vue); // 扩展了 init 方法
initLifeCycle(Vue);
initGlobalAPI(Vue)


export default Vue;