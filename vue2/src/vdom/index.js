
// h() _c()
export function createElementVNode(vm, tag, data, ...children) {
  if(data == null) {
    data = {}
  }
  let key = data.key;
  if (key) delete data.key
  return vnode(vm, tag, key, data, children)
}

export function createTextVNode(vm, text) {
  return vnode(vm, undefined, undefined, undefined, undefined, text)
}

// ast 做的是语法层面的转换，描述的是语法本身（描述js，css，html）
// 虚拟DOM描述的是dom元素，可以增加一下自定义属性（描述DOM）
function vnode(vm, tag, key, data, children, text) {
  return {
    vm,
    tag,
    key,
    data,
    children,
    text
  }
}