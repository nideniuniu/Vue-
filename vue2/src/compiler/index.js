import { parseHTML } from "./parse";

function genProps(attrs) {
  let str = ''; // {name,value}
  for (let i = 0; i < attrs.length; i++) {
    let attr = attrs[i];
    if (attr.name === 'style') {
      let obj = {};
      attr.value.split(';').forEach(item => {
        let [key, value] = item.split(':')
        obj[key] = value;
      })
      attr.obj = obj;
    }
    str += `${attr.name}:${JSON.stringify(attr.value)},`
  }
  return `{${str.slice(0, -1)}}`
}

const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g

function gen(node) {
  if (node.type === 1) {
    return codegen(node);
  } else {
    // 文本
    let text = node.text;
    if (!defaultTagRE.test(text)) {
      return `_v(${JSON.stringify(text)})`
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
        tokens.push(`_s(${match[1].trim()})`)

        lastIndex = index + match[0].length;
      }
      if (lastIndex < text.length) {
        tokens.push(JSON.stringify(text.slice(lastIndex)))
      }
      return `_v(${tokens.join('+')})`
    }
  }
}

function genChildren(children) {
  return children.map(child => gen(child))
}

function codegen(ast) {
  let children = genChildren(ast.children);
  let code = `_c('${ast.tag}',${ast.attrs.length > 0 ? genProps(ast.attrs) : 'null'}${ast.children.length ? `, ${children}` : ''
    })`
  return code;
}


// 对模板进行编译
export function compileToFunction(template) {

  // 1. 就是将 template 转化成 ast 语法树
  let ast = parseHTML(template);
  // 2. 生成 render 方法（render方法执行后的返回值的结果就是虚拟 dom）

  // 模板引擎的实现原理 就是 with + new Function


  let code = codegen(ast)
  code = `with(this){return ${code}}`
  let render = new Function(code); // 根据代码生成 render 函数

  return render;
}