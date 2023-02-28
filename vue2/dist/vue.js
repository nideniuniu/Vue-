(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Vue = factory());
})(this, (function () { 'use strict';

  let id$1 = 0;
  class Dep {
    constructor() {
      this.id = id$1++; // 属性的 dep 要收集 watcher
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

  let id = 0;

  // 1）当我们创建渲染 watcher 的时候我们会把当前的渲染的 watcher 放到 dep.target 上
  // 2）调用 _render() 会取值 走到get上

  // 每个属性有一个 dep（属性计算被观察者），watcher 就是观察者（属性变化了会通知观察着更新）-> 观察者模式

  class Watcher {
    // 不同组件有不同的 watcher  目前只有一个 渲染根实例的
    constructor(vm, fn, options) {
      this.id = id++;
      this.renderWatcher = options; // 是一个渲染 watcher
      this.getter = fn; // getter 意味着调用这个函数可以发生取值操作
      this.deps = []; // 后续我们实现计算属性，和一些清理工作需要用到
      this.depsId = new Set();
      this.get();
    }
    get() {
      Dep.target = this; // 静态属性就是只有一份
      this.getter(); // 会去 vm 取值
      Dep.target = null; // 渲染完成后就清空
    }

    addDep(dep) {
      // 一个组件对应着多个属性，重复的属性也不用记录
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

  // h() _c()
  function createElementVNode(vm, tag, data, ...children) {
    if (data == null) {
      data = {};
    }
    let key = data.key;
    if (key) delete data.key;
    return vnode(vm, tag, key, data, children);
  }
  function createTextVNode(vm, text) {
    return vnode(vm, undefined, undefined, undefined, undefined, text);
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
    };
  }

  function createElm(vnode) {
    let {
      tag,
      data,
      children,
      text
    } = vnode;
    if (typeof tag === 'string') {
      // 标签
      vnode.el = document.createElement(tag); // 这里将真实节点和虚拟节点对应起来，后续如果修改属性了

      patchProps(vnode.el, data);
      children.forEach(child => {
        vnode.el.appendChild(createElm(child));
      });
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
        el.setAttribute(key, props[key]);
      }
    }
  }
  function patch(oldVNode, vnode) {
    // 写的是初渲染流程

    const isRealElement = oldVNode.nodeType;
    if (isRealElement) {
      const elm = oldVNode; // 获取真实元素
      const parentElm = elm.parentNode; // 拿到父元素
      let newElm = createElm(vnode);
      parentElm.insertBefore(newElm, elm.nextSibling);
      parentElm.removeChild(elm); // 删除老节点

      return newElm;
    }
  }
  function initLifeCycle(Vue) {
    Vue.prototype._update = function (vnode) {
      // 将vnode转换为真实DOM
      const vm = this;
      const el = vm.$el;
      // patch 既有初始化的功能 又有更新的逻辑
      vm.$el = patch(el, vnode);
    };

    // _c('div', {}, children)
    Vue.prototype._c = function () {
      return createElementVNode(this, ...arguments);
    };
    // _v(text)
    Vue.prototype._v = function () {
      return createTextVNode(this, ...arguments);
    };
    Vue.prototype._s = function (value) {
      if (typeof value !== 'object') return value;
      return JSON.stringify(value);
    };
    Vue.prototype._render = function () {
      const vm = this;
      // 让 with 中的 this 指向 vm
      // 当渲染的时候会去实例中取值，我们就可以将属性和视图绑定在一起
      return vm.$options.render.call(vm); // 通过 ast 语法转义后生成的 render 方法
    };
  }

  function mountComponent(vm, el) {
    // 这里的 el 是通过 querySelector 处理过的
    vm.$el = el;

    // 1. 调用 render 方法产生虚拟节点 虚拟 DOM

    const updateComponent = () => {
      vm._update(vm._render()); // vm.$options.render() 虚拟节点
    };

    new Watcher(vm, updateComponent, true); // true 用于标识是一个渲染过程

    // 2. 根据虚拟DOM产生真实DOM

    // 3. 插入到el元素中
  }

  // vue 核心流程 1） 创造了响应式数据 2）模板转换成ast语法树
  // 3）将ast语法树转换成 render 函数
  // 4）后续每次数据更新可以只执行render函数 （无需再次执行ast转化的过程）
  // render函数会去产生虚拟节点（使用响应式数据）
  // 根据生成的虚拟节点创造真实DOM

  const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z]*`;
  const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
  const startTagOpen = new RegExp(`^<${qnameCapture}`); // 他匹配到的分组是一个 标签名  <xxx 匹配到的是开始 标签的名字
  const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`); // 匹配的是</xxxx>  最终匹配到的分组就是结束标签的名字
  const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/; // 匹配属性
  // 第一个分组就是属性的key value 就是 分组3/分组4/分组五
  const startTagClose = /^\s*(\/?)>/; // <div> <br/>

  // vue3 采用的不是使用正则
  // 对模板进行编译处理
  function parseHTML(html) {
    // html 最开始肯定是一个 <div></div>
    const ELEMENT_TYPE = 1;
    const TEXT_TYPE = 3;
    const stack = []; // 用于存放元素的
    let currentParent; // 指向的是栈中的最后一个
    let root;
    // 最终需要转化成一颗抽象语法树

    function createASTElement(tag, attrs) {
      return {
        tag: tag,
        type: ELEMENT_TYPE,
        children: [],
        attrs,
        parent: null
      };
    }

    // 利用栈型结构 来构造一棵树
    function start(tag, attrs) {
      let node = createASTElement(tag, attrs); // 创造一个 ast 节点
      if (!root) root = node; // 如果为空就当成树的根节点

      if (currentParent) {
        node.parent = currentParent; // 只赋予了 parent 属性
        currentParent.children.push(node); // 还要让父亲记住自己
      }

      stack.push(node);
      currentParent = node; // currentParent 为栈中的最后一个
    }

    function chars(text) {
      // 文本直接放到当前指向的节点
      text = text.replace(/\s/g, ''); // 如果空格超过 2 个就删除2个以上的
      text && currentParent.children.push({
        type: TEXT_TYPE,
        text,
        parent: currentParent
      });
    }
    function end(tag) {
      stack.pop(); // 弹出最后一个，校验标签是否合法
      currentParent = stack[stack.length - 1];
    }
    function advance(n) {
      html = html.substring(n);
    }
    function parseStartTag() {
      const start = html.match(startTagOpen);
      if (start) {
        const match = {
          tagName: start[1],
          // 标签名
          attrs: []
        };
        advance(start[0].length);
        // 如果不是开始标签的结束 就一直匹配下去
        let attr, end;
        while (!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
          advance(attr[0].length);
          match.attrs.push({
            name: attr[1],
            value: attr[3] || attr[4] || attr[5] || true
          });
        }
        if (end) {
          advance(end[0].length);
        }
        return match;
      }
      return false; // 不是开始标签
    }

    while (html) {
      // 如果 textEnd 为0 说明是一个开始标签或者结束标签
      // 如果textEnd > 0 说明就是个文本的结束位置
      let textEnd = html.indexOf('<'); // 如果 indexOf 中的索引是 0 则说明是个标签

      if (textEnd == 0) {
        const startTagMatch = parseStartTag();
        if (startTagMatch) {
          start(startTagMatch.tagName, startTagMatch.attrs);
          continue;
        }
        let endTagMatch = html.match(endTag);
        if (endTagMatch) {
          advance(endTagMatch[0].length);
          end(endTagMatch[1]);
          continue;
        }
      }
      if (textEnd > 0) {
        let text = html.substring(0, textEnd); // 文本内容

        if (text) {
          chars(text);
          advance(text.length); // 解析到的文本
        }
      }
    }

    return root;
  }

  function genProps(attrs) {
    let str = ''; // {name,value}
    for (let i = 0; i < attrs.length; i++) {
      let attr = attrs[i];
      if (attr.name === 'style') {
        let obj = {};
        attr.value.split(';').forEach(item => {
          let [key, value] = item.split(':');
          obj[key] = value;
        });
        attr.value = obj;
      }
      str += `${attr.name}:${JSON.stringify(attr.value)},`;
    }
    return `{${str.slice(0, -1)}}`;
  }
  const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g;
  function gen(node) {
    if (node.type === 1) {
      return codegen(node);
    } else {
      // 文本
      let text = node.text;
      if (!defaultTagRE.test(text)) {
        return `_v(${JSON.stringify(text)})`;
      } else {
        let tokens = [];
        let match;
        defaultTagRE.lastIndex = 0;
        let lastIndex = 0;
        while (match = defaultTagRE.exec(text)) {
          let index = match.index; // 匹配的位置
          if (index > lastIndex) {
            tokens.push(JSON.stringify(text.slice(lastIndex, index)));
          }
          tokens.push(`_s(${match[1].trim()})`);
          lastIndex = index + match[0].length;
        }
        if (lastIndex < text.length) {
          tokens.push(JSON.stringify(text.slice(lastIndex)));
        }
        return `_v(${tokens.join('+')})`;
      }
    }
  }
  function genChildren(children) {
    return children.map(child => gen(child));
  }
  function codegen(ast) {
    let children = genChildren(ast.children);
    let code = `_c('${ast.tag}',${ast.attrs.length > 0 ? genProps(ast.attrs) : 'null'}${ast.children.length ? `, ${children}` : ''})`;
    return code;
  }

  // 对模板进行编译
  function compileToFunction(template) {
    // 1. 就是将 template 转化成 ast 语法树
    let ast = parseHTML(template);
    // 2. 生成 render 方法（render方法执行后的返回值的结果就是虚拟 dom）

    // 模板引擎的实现原理 就是 with + new Function

    let code = codegen(ast);
    code = `with(this){return ${code}}`;
    let render = new Function(code); // 根据代码生成 render 函数
    return render;
  }

  // 我们希望重写数组中的部分方法

  let oldArrayProto = Array.prototype; // 获取数组的原型

  // newArrayProto.__proto__ = oldArrayProto;
  let newArrayProto = Object.create(oldArrayProto);
  let methods = [
  // 找到所有的变异方法
  'push', 'pop', 'shift', 'unshift', 'revese', 'sort', 'splice']; // concat slice 都不会改变原数组

  methods.forEach(method => {
    newArrayProto[method] = function (...args) {
      // 这里重写了数组的方法
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
          break;
      }
      if (inserted) {
        // 对新增的内容再次进行观测
        ob.ObserveArray(inserted);
      }
      return result;
    };
  });

  class Observe {
    constructor(data) {
      // Object.defineProperty 只能劫持已经存在的属性（vue里面会为此单独写一些 api $set $delete）

      Object.defineProperty(data, '__ob__', {
        value: this,
        enumerable: false // 将__ob__变成不可枚举 （循环的时候无法获取到）
      });

      // data.__ob__ = this; // 给数据加了个标识 如果数据上有 __ob__ 就说明这个数据被观测过
      if (Array.isArray(data)) {
        // 这里我们可以重写数组中的方法 7个变异方法 是可以修改数组本身的
        // 覆盖自身原型方法，优先找自身原型方法，然后去 数组原型找
        data.__proto__ = newArrayProto; // 需要保留数组原有的特效，并且可以重写部分方法
        this.ObserveArray(data); // 如果数组中放的是对象，可以监控到对象的变化
      } else {
        this.walk(data);
      }
    }
    walk(data) {
      // 循环对象 对属性依次劫持
      // 重新定义属性
      Object.keys(data).forEach(key => defineReactive(data, key, data[key]));
    }
    ObserveArray(data) {
      data.forEach(item => observe(item));
    }
  }
  function defineReactive(target, key, value) {
    // 闭包 属性劫持
    observe(value); // 对所有的对象都进行属性劫持
    let dep = new Dep(); // 每一个属性都有一个 dep
    Object.defineProperty(target, key, {
      get() {
        // 取值的时候 会执行 get
        if (Dep.target) {
          dep.depend(); // 让这个属性的收集器记住当前的 watcher
        }

        return value;
      },
      set(newValue) {
        // 修改的时候 会执行 set
        if (newValue === value) return;
        observe(newValue);
        value = newValue;
        dep.notify(); // 通知更新
      }
    });
  }

  function observe(data) {
    // 对这个对象进行劫持

    if (typeof data !== 'object' || data == null) {
      return; // 只对对象进行劫持
    }

    if (data.__ob__ instanceof Observe) {
      // 说明这个对象被代理过
      return data.__ob__;
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
      if (options.el) {
        vm.$mount(options.el); // 实现数据的挂载
      }
    };

    Vue.prototype.$mount = function (el) {
      const vm = this;
      el = document.querySelector(el);
      let ops = vm.$options;
      if (!ops.render) {
        // 先进行查找有没有 render
        let template; // 没有render看一下是否写了template，没写 template 采用外部的 template
        if (!ops.template && el) {
          // 没有写模板 但是写了 el
          template = el.outerHTML;
        } else {
          if (el) {
            template = ops.template; // 如果有 el 则采用模板的内容
          }
        }

        if (template) {
          // 这里需要对模板进行编译
          const render = compileToFunction(template);
          ops.render = render; // jsx 最终会被编译成（'xxx'）
        }
      }

      mountComponent(vm, el); // 组件的挂载
      // 最终就可以获取 render 方法
      // script 标签引用的 vue.global.js 这个编译过程是在浏览器运行的
      // runtime 是不包含模板编译的，整个编译是打包的时候通过 loader 来转义，vue文件的，用runtime的时候不能使用template
    };
  }

  // 将所有的方法都耦合在一起
  function Vue(options) {
    // options 就是用户的选项
    this._init(options); // 默认就调用了 init
  }

  initMixin(Vue); // 扩展了 init 方法
  initLifeCycle(Vue);

  return Vue;

}));
//# sourceMappingURL=vue.js.map
