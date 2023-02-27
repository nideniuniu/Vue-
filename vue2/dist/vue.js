(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Vue = factory());
})(this, (function () { 'use strict';

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
        attr.obj = obj;
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

    console.log(codegen(ast));
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
    Object.defineProperty(target, key, {
      get() {
        // 取值的时候 会执行 get
        return value;
      },
      set(newValue) {
        // 修改的时候 会执行 set
        if (newValue === value) return;
        observe(newValue);
        value = newValue;
      }
    });
  }
  function observe(data) {
    // 对这个对象进行劫持

    if (typeof data !== 'object' || data == null) {
      return; // 只对执行进行劫持
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

      ops.render; // 最终就可以获取 render 方法

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

  return Vue;

}));
//# sourceMappingURL=vue.js.map
