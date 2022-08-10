module.exports = {
  entry: '',
  output: '',
  locales: 'zh-CN,en-US',
  exclude: '',
  prefix: '',
  pack: false,
  gen: false,
  langSource: '',
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