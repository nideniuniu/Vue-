
// h() _c()
export function createElementVNode(vm, tag, props = {}, ...children) {
  return { 
    vm,
    tag,
    props,
    children,
  }
}

export function createTextVNode() {

}