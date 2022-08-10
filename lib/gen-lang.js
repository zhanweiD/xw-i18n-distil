const excelToJson = require('convert-excel-to-json')
const childProcess = require('child_process');
const glob = require('glob');
const path = require('path')
const mkdirp = require("mkdirp");
const fs = require('fs');
const util = require('./util');
const cwdPath = process.cwd();
const {
  chalkErrorAndExit
} = require('./util/chalk');


// 获取 lang-source 文件路径
const getLangSourcePath = (options, reg) => {
  let arrLangSource = options.langSource.split(',')
  let langSourceXlsx = arrLangSource.filter(item => (reg).test(item))
  if (langSourceXlsx.length <= 0) {
    chalkErrorAndExit(`请检查"--lang-source"参数是否正确\n`);
  }
  return langSourceXlsx[0].trim()
}

// 获取 lang-source 文件夹路径
const getLangSourceDir = (options, reg) => {
  const langSourceXlsxPath = getLangSourcePath(options, reg)
  let arrLangSourceXlsxPath = langSourceXlsxPath.split('/')
  arrLangSourceXlsxPath.pop()
  let langSourceXlsxDir = arrLangSourceXlsxPath.join('/')
  return langSourceXlsxDir
}

// 初始化 excelToJson
const excel2json = (options) => {
  const langSourceXlsxPath = getLangSourcePath(options, /\.xls[x]?/gi)
  return excelToJson({
    sourceFile: path.resolve(cwdPath, langSourceXlsxPath),
    sheets: [{
      name: 'Sheet1',
      header: {
        rows: 1
      },
      columnToKey: {
        B: 'zh',
        C: 'en'
      }
    }]
  })
}

// 去重
const removeDuplicate = (data) => {
  let obj = {};
  return data.reduce((item, next) => {
    // obj[next.zh] ? console.log(next.zh) : null
    obj[next.zh] ? null : obj[next.zh] = true && item.push(next);
    return item;
  }, []);
}

const reorganize = (obj) => {
  let outputString = 'module.exports = {\n';
  Object.keys(obj).forEach(k => {
    outputString += `  "${k}": "${obj[k]}",\n`
  })
  outputString += '}\n'
  return outputString
}

// 根据译文 excel 生成中英文对照 json
const transZhEn = (options, data) => {
  let con = 'module.exports = {\n';
  for (let i = 0; i < data.length; i++) {
    let item = data[i]
    let zh = util.replace(item.zh)
    con += `  "${zh}": "${item.en||''}",\n`
  }
  con += '}\n'

  const langSourceXlsxDir = getLangSourceDir(options, /\.xls[x]?/gi)
  const translateZhEnPath = path.resolve(cwdPath, langSourceXlsxDir, 'trans.js')
  fs.writeFileSync(translateZhEnPath, con, {
    encoding: "utf-8"
  })
  return translateZhEnPath
}

// 处理符号的匹配，提高准确率
const findValue = (arr, v) => {
  const symbol = [':', '：', '?', '？', '!', '！', '。']
  let vlu = ''
  for (let item of symbol) {
    let str = v.replace(item, '')
    if (arr[str] !== undefined) {
      vlu = str
      break;
    } else {
      str = v + item
      if (arr[str] !== undefined) {
        vlu = str
        break;
      }
    }
  }
  return vlu
}

// 
const startDo = (options, data) => {
  const translateZhEnPath = transZhEn(options, data)
  const translation = require(translateZhEnPath)
  const langSourceJsPath = getLangSourcePath(options, /\.js/gi)
  const keyValue = require(path.resolve(cwdPath, langSourceJsPath))
  // const valueKey = util.invert(keyValue)
  let langZH = {}
  let langEN = {}
  let langErr = {}
  let total = data.length
  let succNum = 0
  let failNum = 0
  let _trans = {
    ...translation
  }

  // 将提取的语言包与词条译文 excel 文件整合，重写英文语言包
  Object.keys(keyValue).forEach(k => {
    let v = keyValue[k]
    v = util.replace(v)
    langZH[k] = v
    if (translation[v] !== undefined) {
      langEN[k] = translation[v] || v
      if (_trans[v] !== undefined) {
        delete _trans[v]
        succNum++
      }
    } else {
      // langEN[k] = v
      let vlu = findValue(translation, v)
      if (vlu) {
        langEN[k] = translation[vlu] || v
        if (_trans[vlu] !== undefined) {
          delete _trans[vlu]
          succNum++
        }
      } else {
        langEN[k] = v
      }
    }
  })

  Object.keys(_trans).forEach(k => {
    k = util.replace(k)
    langErr[k] = _trans[k]
    failNum++
  })

  const langOutputPath = path.resolve(cwdPath, options.output)
  const bakOutputPath = path.resolve(langOutputPath, 'bak')
  if (!fs.existsSync(langOutputPath)) {
    mkdirp(langOutputPath)
  }
  if (!fs.existsSync(bakOutputPath)) {
    mkdirp(bakOutputPath)
    let files = glob.sync(`${langOutputPath}/*.{js,xlsx}`)
    files.forEach(element => {
      let fileName = element.split('/').pop()
      const spawnObj = childProcess.spawnSync('cp', [fileName, 'bak'], {
        cwd: langOutputPath
      })
      // console.log(spawnObj.stdout.toString())
    });
    // 删除文件
    files.forEach(element => {
      fs.unlinkSync(element)
    });
  }

  // 将自动提取到的语言包与译文excel整合，生成中文语言包
  const langZhContent = reorganize(langZH);
  fs.writeFileSync(`${langOutputPath}/zh-CN.js`, langZhContent, {
    encoding: "utf-8"
  })

  // 将自动提取到的语言包与译文excel整合，生成英文语言包
  const langEnContent = reorganize(langEN);
  fs.writeFileSync(`${langOutputPath}/en-US.js`, langEnContent, {
    encoding: "utf-8"
  })

  const langErrContent = reorganize(langErr);
  fs.writeFileSync(`${langOutputPath}/error.js`, langErrContent, {
    encoding: "utf-8"
  })

  console.log('成功转化', succNum, '条')
  console.log('转化失败', failNum, '条')
  console.log('转化率', Math.floor(succNum / total * 10000) / 100 + '%')
}

module.exports = (options) => {
  const data = excel2json(options)['Sheet1']
  if (data.length) {
    console.log('总数据', data.length, '条')
    let removeDuplicateData = removeDuplicate(data)
    console.log('去重后', removeDuplicateData.length, '条')
    startDo(options, removeDuplicateData)
  } else {
    console.log('无数据')
  }
}