# oner-tools-distil

oner-tools-distil 是一个协助项目国际化实施，将中文字符从代码中批量提取生成语言包并同时改造源代码的自动化工具，支持 js[x] 和 ts[x] 。




## Install

内网环境，全局安装:

```sh
npm install -g @dtwave/oner-tools-distil --registry http://r.dtwave-inc.com
```



## Usage

该工具主要有两个用途：

- 提取中文并生成语言包，改造代码。

- 提取的语言包与词条译文 excel 文件整合，将译文整合到英文语言包。



### 提取中文并生成语言包

指定工作目录、输出目录、生成的语言包名等，该工具将会把工作目录下的文件中的中文字符提取出来，生成语言包，同时把工作目录下的 js[x] 文件代码改造成预期的格式。

执行  `distil`  命令有两种方式：

- 命令行执行
- 创建配置文件

#### 第一种方式，命令行执行

命令格式：

```sh
distil -e [path] -o [path] -l [fileNames] -f [string] -p
```
`-e`  提取中文的工作目录或文件路径，多个目录或文件请用","分割

`-o`  提取的语言包文件的输出目录

`-l`  输出的语言包文件名，多个请用","分割，例如 "zh-CN,en-US"

`-f`  语言包 key 的前缀，多个请用","分割

`-p`  将中文语言包输出为 excel 文件

示例：

```sh
distil -e src -o lang -l zh-CN,en-US -f ide -p
```
示例说明：

执行后，工作目录中 `src` 目录下的  js[x]  文件中的中文字符被提取出来，并创建 `lang` 目录及 `zh-CN.js`，`en-US.js`，`collect.xlsx` 三个文件，其中`zh-CN.js` 为中文语言包，`en-US.js` 为英文语言包，`collect.xlsx` 为中文语言包导出的 excel 文件。

同时 `src` 目录下的  js[x]  文件代码中的中文字符也已被替换。


##### options

| 选项 | 必填 | 说明  |
| ------------ | ------------ | ------------ |
| -e, --entry | 是 | 提取中文的工作目录或文件路径，多个目录或文件请用","分割 |
|  -o, --output | 是 | 提取的语言包文件的输出目录 |
|  -l, --locales | 是 | 输出的语言包文件名，请将中文文件名放在第一个，如有多个请用","分割，例如 "zh-CN,en-US" |
|  -x, --exclude | 否 | 需要排除的文件，多个请用","分割，可用正则，如："src/test/*"，排除 src/test 下的所有文件 |
|  -p, --pack | 否 | 将中文语言包输出为 excel，默认名称为 collect.xlsx ，需要配置"-o"参数 |
|  -f, --prefix | 否 | 语言包 key 的前缀，多个请用","分割 |
|  -s, --lang-source | 否 | 中文语言包与译文excel文件路径，请用","分割 |
|  -c, --config | 否 | 配置文件的路径，默认根目录下 distil.config.js |
|  --gen | 否 | 将提取的中文语言包与译文excel整合，生成新的语言包，需要配置"-s"、"-o"参数 |

#### 第二种方式，创建配置文件

除了上面的命令行形式，还可以在工作根目录下创建配置文件 `distil.config.js`，并用 `-c` 指定。

```sh
distil -c distil.config.js
```

配置文件示例，执行效果与上面的命令行执行效果相同。
```js
module.exports = {
  entry: 'src',
  output: 'lang',
  locales: 'zh-CN,en-US',
  prefix: 'ide',
  pack: true,
  exclude: ''
}
```


##### 自定义语言包 key

语言包 key 的生成规则也可以在配置文件中自定义，配置 `keysFunc` 字段，Function 类型，`filePath`，` options` 为入参。

配置示例：

```js
module.exports = {
  ...,
  keysFunc: (filePath, options = {}) => {
    let rdm = Math.random().toString(36).substr(2)
    let pathArr = filePath.replace(/\.js[x]?|\./g, '').split('/').filter(p => p && p != '.')
    let path = pathArr.map(item => {
      if (item.indexOf('component') > -1) {
        let arr = item.split('-')
        return arr.length > 1 ? `${arr[0]}-${arr[1]}` : arr[0]
      }
      return item
    }).join('.')
    if (options.prefix) {
      path = `${options.prefix.split(',').join('.')}.${path}`
    }
    return `${path}.${rdm}`
  }
}
```



### 将提取的语言包与词条译文 excel 文件整合

将提取的语言包与翻译好的词条译文 excel 文件进行整合，excel 中的英文会被写到英文语言包中，生成预期的英文语言包。

命令格式：
```sh
distil --gen -s "中文语言包路径,译文excel文件路径" -o "提取的语言包的输出目录"
```
`-s`  有两个参数，用","分割，一个是生成的 `zh-CN.js` 语言包路径，一个是译文 excel 文件路径。

`-o`  提取的语言包文件的输出目录

示例：
```sh
distil --gen -s "lang/zh-CN.js,../trans/国际化文案收集-离线开发.xlsx" -o lang
```
示例说明：

执行后，在 `lang` 目录下会创建 `bak` 目录和 `zh-CN.js`，`en-US.js`，`error.js` 三个文件

`bak`  是之前生成的 `zh-CN.js`，`en-US.js`，`collect.xlsx` 的备份

`zh-CN.js`  整合后的中文语言包

`en-US.js`  整合后的英文语言包

`error.js`  整合失败的词条信息

`excel`  文件默认第一个sheet名称为 `Sheet1`，确保 `B` 列为中文，`C` 列为英文


#### 该命令也可配置文件中配置

配置文件 `distil.config.js` 中增加 `gen`，`langSource`，`output` 字段
```js
module.exports = {
  ...,
  output: 'lang',
  gen: true,
  langSource: './lang/zh-CN.js,./trans/国际化文案收集-离线开发.xlsx'
}
```


