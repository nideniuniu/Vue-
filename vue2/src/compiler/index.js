const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z]*`;
const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
const startTagOpen = new RegExp(`^<${qnameCapture}`); // 他匹配到的分组是一个 标签名  <xxx 匹配到的是开始 标签的名字
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`);  // 匹配的是</xxxx>  最终匹配到的分组就是结束标签的名字
const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;  // 匹配属性
// 第一个分组就是属性的key value 就是 分组3/分组4/分组五
const startTagClose = /^\s*(\/?)>/;  // <div> <br/>
const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g


// vue3 采用的不是使用正则
// 对模板进行编译处理
function parseHTML(html) { // html 最开始肯定是一个 <
  function start(tag, attrs) { }
  function chars(text) { }
  function end(tag) { }
  function advance(n) {
    html = html.substring(n);
  }
  function parseStartTag() {
    const start = html.match(startTagOpen);
    if (start) {
      const match = {
        tagName: start[1], // 标签名
        attrs: []
      }
      advance(start[0].length)
      // 如果不是开始标签的结束 就一直匹配下去
      let attr, end;
      while (!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
        advance(attr[0].length);
        match.attrs.push({
          name: attr[1],
          value: attr[3] || attr[4] || attr[5] || true
        })
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
        start(startTagMatch.tagName, startTagMatch.attrs)
        continue;
      }

      let endTagMatch = html.match(endTag);
      if (endTagMatch) {
        advance(endTagMatch[0].length);
        end(endTagMatch[1])
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
}

// 对模板进行编译
export function compileToFunction(template) {

  // 1. 就是将 template 转化成 ast 语法树
  let ast = parseHTML(template);
  // 2. 生成 render 方法（render方法执行后的返回值的结果就是虚拟 dom）

}