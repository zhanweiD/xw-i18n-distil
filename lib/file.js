const glob = require('glob');
const fs = require('fs');

module.exports = {
  getFiles({
    entryPath,
    exclude
  }) {
    let rstPath = []
    if (typeof entryPath === 'string') {
      entryPath = entryPath.split(',')
    }
    if (typeof exclude === 'string') {
      exclude = exclude.split(',')
    }

    entryPath.map((pth) => {
      if (fs.existsSync(pth)) {
        if (fs.statSync(pth).isDirectory()) {
          let files = glob.sync(`${pth}/**/*.{js,jsx,ts,tsx}`, {
            ignore: exclude
          })
          rstPath = rstPath.concat(files)
        } else {
          rstPath.push(pth)
        }
      }
    })
    return rstPath
  },

  getALayerFiles({
    outputPath,
    exclude
  }) {
    if (fs.existsSync(outputPath)) {
      if (fs.statSync(outputPath).isDirectory()) {
        return glob.sync(`${outputPath}/*.js`, {
          ignore: (exclude || []).map(e => `${outputPath}/${e}`)
        })
      } else {
        return [outputPath]
      }
    } else {
      return []
    }
  }
}