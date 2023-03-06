import Watcher from "./observe/watcher";
import { createElementVNode, createTextVNode } from "./vdom";

function createElm(vnode) {
  let { tag, data, children, text } = vnode;
  if (typeof tag === 'string') { // 标签
    vnode.el = document.createElement(tag); // 这里将真实节点和虚拟节点对应起来，后续如果修改属性了

    patchProps(vnode.el, data);

    children.forEach(child => {
      vnode.el.appendChild(createElm(child));
    })
  } else {
    vnode.el = document.createTextNode(text);
  }
  return vnode.el;
}

function patchProps(el, props) {
  for (let key in props) {
    if (key === 'style') {
      for (let styleName in props.style) {
        el.style[styleName] = props.style[styleName];
      }
    } else {
      el.setAttribute(key, props[key])
    }
  }
}

function patch(oldVNode, vnode) {
  // 写的是初渲染流程

  const isRealElement = oldVNode.nodeType;
  if (isRealElement) {
    const elm = oldVNode; // 获取真实元素
    const parentElm = elm.parentNode; // 拿到父元素
    let newElm = createElm(vnode)
    parentElm.insertBefore(newElm, elm.nextSibling)
    parentElm.removeChild(elm); // 删除老节点

    return newElm;
  } else {
    // diff 算法
  }
}

export function initLifeCycle(Vue) {
  Vue.prototype._update = function (vnode) { // 将vnode转换为真实DOM
    const vm = this;
    const el = vm.$el;
    // patch 既有初始化的功能 又有更新的逻辑
    vm.$el = patch(el, vnode);
  }

  // _c('div', {}, children)
  Vue.prototype._c = function () {
    return createElementVNode(this, ...arguments);
  }
  // _v(text)
  Vue.prototype._v = function () {
    return createTextVNode(this, ...arguments)
  }
  // _s(name) === {{name}}
  Vue.prototype._s = function (value) {
    if (typeof value !== 'object') return value;
    return JSON.stringify(value);
  }
  Vue.prototype._render = function () {
    const vm = this;
    // 让 with 中的 this 指向 vm
    // 当渲染的时候会去实例中取值，我们就可以将属性和视图绑定在一起
    return vm.$options.render.call(vm); // 通过 ast 语法转义后生成的 render 方法
  }
}


export function mountComponent(vm, el) { // 这里的 el 是通过 querySelector 处理过的
  vm.$el = el;

  // 1. 调用 render 方法产生虚拟节点 虚拟 DOM

  const updateComponent = () => {
    vm._update(vm._render()); // vm.$options.render() 虚拟节点
  }

  new Watcher(vm, updateComponent, true) // true 用于标识是一个渲染过程

  // 2. 根据虚拟DOM产生真实DOM

  // 3. 插入到el元素中
}

// vue 核心流程 1） 创造了响应式数据 2）模板转换成ast语法树
// 3）将ast语法树转换成 render 函数
// 4）后续每次数据更新可以只执行render函数 （无需再次执行ast转化的过程）
// render函数会去产生虚拟节点（使用响应式数据）
// 根据生成的虚拟节点创造真实DOM

export function callHook(vm, hook) { // 调用钩子函数
  const handlers = vm.$options[hook]
  if (handlers) {
    handlers.forEach(handler => handler.call(vm))
  }
}