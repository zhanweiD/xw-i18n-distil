const fs = require('fs');
const mkdirp = require("mkdirp");
const file = require('./file');
const translate = require('./translate');
const chalk = require('./util/chalk')
const util = require('./util');

module.exports = function (option) {
  const collectAndWrite = {
    num: 0,
    option: option,
    _keysStr: () => {
      let rdm = Math.random().toString(36).substr(2)
      if (this.option.prefix) {
        return `${this.option.prefix.split(',').join('.')}.${rdm}`
      }
      return `${rdm}`
    },

    _existsSync: (path) => fs.existsSync(path),

    _getTranslateFiles: function () {
      return file.getFiles({
        entryPath: this.option.entry,
        exclude: this.option.exclude
      })
    },

    getExistWords: function (existWordsPath) {
      let defaultWords = {}
      let requireWords = {};
      try {
        requireWords = require(`${process.cwd()}/${existWordsPath}`);
        defaultWords = util.invert(requireWords)
      } catch (e) {
        // chalk.error(`${output}/zh-CN.js is not a module`)
      }
      return {
        valueKey: defaultWords,
        keyValue: requireWords
      };
    },

    collect: function (allTranslateWords, filePath) {
      const {
        isRewriting,
        code
      } = translate({
        filePath,
        allTranslateWords,
        keysStr: this.option.keysFunc || this._keysStr,
        programOption: this.option
      })
      if (isRewriting) {
        this.write(`${filePath}`, code, {
          encoding: "utf-8"
        })
        chalk.success(`${++this.num} ${filePath} is success`)
      }
    },

    reorganize: function (allTranslateWords) {
      let outputString = 'module.exports = {\n';

      Object.keys(allTranslateWords).forEach(word => {
        outputString += `  "${allTranslateWords[word]}": "${word}",\n`
      })

      outputString += '}\n'
      return outputString
    },

    write: function (path, content, option) {
      fs.writeFileSync(path, content, option)
    },

    start: function () {
      let allTranslateWords = {};
      const outputMainLocalPath = (localName) => `${this.option.output}/${localName}.js`

      if (!this._existsSync(this.option.output)) {
        mkdirp(this.option.output)
      }

      if (this._existsSync(outputMainLocalPath(this.option.mainLocal))) {
        Object.assign(allTranslateWords, this.getExistWords(outputMainLocalPath(this.option.mainLocal)).valueKey);
      }

      const translateFiles = this._getTranslateFiles()
      if (translateFiles.length == 0) {
        console.log('未找到目标文件，请检查文件路径')
        return
      }

      translateFiles.forEach(filePath => {
        this.collect(allTranslateWords, filePath);
      })

      const reorganizeContent = this.reorganize(allTranslateWords);

      if (this.option.otherLocales) {
        this.option.otherLocales.forEach((localName) => {
          const path = outputMainLocalPath(localName);
          const allWords = util.invert(JSON.parse(JSON.stringify(allTranslateWords)))
          const existWords = this.getExistWords(path).keyValue;
          Object.assign(allWords, existWords);

          const content = this.reorganize(util.invert(allWords));
          this.write(path, content, {
            encoding: "utf-8"
          });
        })
      }
      this.write(outputMainLocalPath(this.option.mainLocal), reorganizeContent, {
        encoding: "utf-8"
      });
    }
  }
  return collectAndWrite
}