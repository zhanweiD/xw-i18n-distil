const fs = require('fs');
const prettier = require("prettier");
const babel = require("@babel/core");
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generator = require('@babel/generator').default;

const middleKeysStr = (function(keysStr, ...argu) {
  return () => keysStr(...argu)
})

function translate ({filePath, allTranslateWords, keysStr, programOption}) {
  const parserOpts = {
    sourceType: "module",
    plugins: [
      "jsx",
      "typescript",
      ["decorators", {
        decoratorsBeforeExport: true
      }],
      "classProperties",
      "dynamicImport",
      "doExpressions",
      "asyncGenerators",
      "objectRestSpread",
      "exportDefaultFrom",
      "exportNamespaceFrom",
      "optionalCatchBinding",
      "functionBind",
      "functionSent",
      "logicalAssignment",
      "throwExpressions",
    ]
  }
  const arg = {
    translateWordsNum: 0,
    hasImportModule: false,
    isPlugin: true
  }
  const plugin = require('./plugin/plugin-distil')(allTranslateWords, middleKeysStr(keysStr, filePath, programOption), arg);
  let transformAst

  if (arg.isPlugin) {
    const transformOptions = {
      sourceType: "module",
      code: false,
      ast: true,
      babelrc: false,
      configFile: false,
      parserOpts,
      plugins: [plugin],
    }
    const bableObj = babel.transformFileSync(filePath, transformOptions)
    transformAst = bableObj.ast;
  } else {
    let sourceCode = fs.readFileSync(filePath, 'utf8').toString();
    transformAst = parser.parse(sourceCode, parserOpts)
    traverse(transformAst, plugin(babel));
  }

  let isRewriting = arg.translateWordsNum !== 0
  if (isRewriting) {
    let transformCode = generator(transformAst, {
      retainLines: true,
    }).code
    if (!arg.hasImportModule) {
      transformCode = 'import intl from \'react-intl-universal\';\n' + transformCode;
    }

    let extenName = filePath.split('.').pop().toLowerCase()
    let isTSX = extenName == 'ts' || extenName == 'tsx'
    return {
      isRewriting,
      code: prettier.format(transformCode, {
        parser: isTSX ? 'typescript' : 'babel',
        singleQuote: true,
        semi: false,
        trailingComma: "es5"
      })
    }
  } else {
    return false
  }
}

module.exports = translate;