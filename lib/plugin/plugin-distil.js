const t = require('@babel/types');

const isContainHtmlTag = function (htmlStr) {
  var reg = /<[^>]+>.*<\/[^>]+>/g;
  return reg.test(htmlStr);
}

const replaceLineBreak = function (value) {
  if (typeof value !== 'string') return value
  return value.replace(/\n/g, ' ')
}

const baseType = function (v) {
  return Object.prototype.toString.call(v)
}

const judgeChinese = function (text) {
  return /[\u4e00-\u9fa5]/.test(text);
}

const getName = function (node) {
  let str = ''
  if (node.type === "MemberExpression" && node.object) {
    str = getName(node.object)
    if (node.property.type === "Identifier" && node.property.name) {
      str += (str ? '.' : '') + node.property.name
      str = str.replace(/\.+/g, '.')
    } else if (node.property.type === "NumericLiteral") {
      str = `${str}[${node.property.value}]`
    } else if (node.property.type === "StringLiteral") {
      str = `${str}["${node.property.value}"]`
    }
  } else if (node.type === 'ThisExpression') {
    str += `this.${str}`
  } else if (node.type === 'LogicalExpression') {
    let left = getName(node.left)
    let right = getName(node.right)
    str += `(${left}${node.operator}${right})`
  } else if (node.type === "ObjectExpression") {
    str += '{}'
  } else if (node.type === "ArrayExpression") {
    str += '[]'
  } else if (node.type === "StringLiteral") {
    str += `'${node.value}'`
  } else if (node.type === "NumericLiteral") {
    str += `${node.value}`
  } else if (node.type === "Identifier" && node.name) {
    str += (str ? '.' : '') + node.name
    str = str.replace(/\.+/g, '.')
  }
  return str;
}

function reactPlugin(allTranslateWord, keysStr, arg) {

  function makeReplace({
    value,
    variableObj
  }) {
    arg.translateWordsNum++;
    value = value.replace(/[\r\n]/g, '')
    value = value.replace(/\\'/g, '\'').replace(/\'/g, '\\\'')
    value = value.replace(/\\"/g, '\"').replace(/\"/g, '\\"')

    let key = keysStr();
    const val = value;
    if (allTranslateWord[val]) {
      key = allTranslateWord[val];
    } else {
      allTranslateWord[val] = key
    }

    // 用于防止中文转码为 unicode
    const v = Object.assign(t.StringLiteral(value), {
      extra: {
        raw: `\'${value}\'`,
        rawValue: value,
      }
    })

    return t.CallExpression(
      t.MemberExpression(
        t.CallExpression(
          t.MemberExpression(
            t.Identifier("intl"),
            isContainHtmlTag(value) ? t.Identifier("getHTML") : t.Identifier("get")
          ),
          setObjectExpression(variableObj) ? [t.StringLiteral(key), setObjectExpression(variableObj)] : [t.StringLiteral(key)]
        ),
        t.Identifier("d"),
      ),
      [v]
    );
  }

  function setObjectExpression(obj) {
    if (baseType(obj) === '[object Object]' && Object.keys(obj).length > 0) {
      const ObjectPropertyArr = [];
      for (const o in obj) {
        ObjectPropertyArr.push(
          t.ObjectProperty(t.Identifier(o), t.Identifier(obj[o]))
        )
      }
      return t.ObjectExpression(ObjectPropertyArr)
    }
    return null;
  }

  const plugin = function ({
    types: t
  }) {
    const visitor = {
      ImportDeclaration(path) {
        const {
          node
        } = path;
        if (node.source.value === 'react-intl-universal') {
          arg.hasImportModule = true;
        }
        path.skip();
      },
      ClassDeclaration(path) {
        if (path.parentPath.node.type === 'ExportDefaultDeclaration' && path.node.decorators) {
          path.parentPath.replaceWith(path.node)
          path.parentPath.insertAfter(t.exportDefaultDeclaration(
            t.identifier(path.node.id.name)
          ));
        }
      },
      JSXText(path) {
        const {
          node
        } = path;
        if (judgeChinese(node.value)) {
          path.replaceWith(
            t.JSXExpressionContainer(makeReplace({
              value: node.value.trim().replace(/\n\s+/g, "\n")
            }))
          );
        }
        path.skip();
      },
      CallExpression(path) {
        if (path.node.callee.type === "MemberExpression") {
          if (path.node.callee.property.name === "d" || path.node.callee.property.name === "get" || path.node.callee.property.name === "getHTML") {
            path.skip()
            return;
          }
        }
      },
      StringLiteral(path) {
        const {
          node
        } = path;
        const {
          value
        } = node;
        if (judgeChinese(value)) {
          if (path.parent.type === 'JSXAttribute') {
            path.replaceWith(t.JSXExpressionContainer(makeReplace({
              value: value.trim()
            })));
          } else if (path.parent.type === 'ObjectProperty' || path.parent.type === 'JSXExpressionContainer') {
            path.replaceWith(makeReplace({
              value: value.trim()
            }));
          } else if (path.parent.type === 'CallExpression' || path.parent.type === 'AssignmentExpression') {
            path.replaceWith(makeReplace({
              value: value.trim()
            }));
          } else if (path.parent.type === 'VariableDeclarator' || path.parent.type === 'BinaryExpression' || path.parent.type === 'ConditionalExpression') {
            path.replaceWith(makeReplace({
              value: value.trim()
            }));
          } else {
            path.replaceWith(makeReplace({
              value: value.trim()
            }));
          }
          path.skip();
        }
      },
      TemplateLiteral(path) {
        if (!path.node.quasis.every(word => !judgeChinese(word))) {
          path.skip();
          return
        }
        const tempArr = [].concat(path.node.quasis, path.node.expressions).sort(function (a, b) {
          return a.start - b.start;
        })
        let isreplace = false;
        let v = '';
        const variable = {}
        tempArr.forEach(function (t) {
          if (t.type === 'TemplateElement') {
            v += `${replaceLineBreak(t.value.cooked)}`;
            if (judgeChinese(t.value.cooked)) {
              isreplace = true;
            }
          } else if (t.type === 'Identifier') {
            variable[t.name] = t.name;
            v += `{${t.name}}`
          } else if (t.type === "MemberExpression") {
            let name = getName(t)
            variable[`'${name}'`] = name;
            v += `{${name}}`
          } else if (t.type === "LogicalExpression") {
            let name = getName(t.left)
            let right = getName(t.right)
            variable[`'${name}'`] = name;
            v += `{${name}${t.operator}${right}}`
          } else if (t.type === 'CallExpression') {
            // TODO
            isreplace = false;
          } else {
            isreplace = false;
          }
        })
        if (!isreplace) {
          path.skip();
          return
        }
        if (v.trim() === '') {
          path.skip();
          return
        }
        path.replaceWith(makeReplace({
          value: v,
          variableObj: variable,
        }));
        path.skip();
      },
    }

    if (arg.isPlugin) {
      return {
        visitor
      }
    } else {
      return visitor
    }
  }

  return plugin
}

module.exports = reactPlugin