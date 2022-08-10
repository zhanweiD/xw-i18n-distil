#! /usr/bin/env node

const path = require('path')
const program = require('commander');
const fs = require('fs');
const {
  chalkErrorAndExit
} = require('../util/chalk');
const cwdPath = process.cwd();
const rootPath = path.resolve(__dirname, '../../')
const package = require(`${rootPath}/package.json`);

program.version(package.version)
// 命令行及配置文件都可配置的
program.option('-c, --config [path]', '配置文件的路径，默认根目录下 distil.config.js')
program.option('-e, --entry <path>', '提取中文的工作目录或文件路径，多个目录或文件请用","分割')
program.option('-o, --output <path>', '提取的语言包文件的输出目录')
program.option('-l, --locales <fileNames>', '输出的语言包文件名，请将中文文件名放在第一个，如有多个请用","分割，例如 "zh-CN,en-US"')
program.option('-p, --pack', '将中文语言包输出为 excel，默认名称为 collect.xlsx ，需要配置"-o"参数')
program.option('-x, --exclude [path]', '需要排除的文件，多个请用","分割，可用正则，如："src/test/*"，排除 src/test 下的所有文件')
program.option('-f, --prefix [string]', '语言包 key 的前缀，多个请用","分割')
program.option('-s, --lang-source [path]', '中文语言包与译文excel文件路径，请用","分割')
program.option('--gen', '将提取的中文语言包与译文excel整合，生成新的语言包，需要配置"-s"、"-o"参数', false)

module.exports = function parseArgv(args) {
  program.parse(args);
  const programOption = program.opts();
  let configurationFileOptions = {};

  // 读取配置文件中设置的参数，然后并入 options 
  const configPath = programOption.config ? path.resolve(cwdPath, programOption.config) : `${rootPath}/distil.config.js`
  if (fs.existsSync(configPath)) {
    try {
      configurationFileOptions = require(configPath)
    } catch (err) {
      chalkErrorAndExit(`请检查 ${configPath} 配置文件是否正确\n`);
    }
  } else {
    chalkErrorAndExit(`${configPath} 预期配置文件不存在\n`);
  }

  const options = require('./collectOptions.js')(configurationFileOptions, programOption)

  // 检测 options 是否符合预期
  require('./detection.js')(options)

  return options
}