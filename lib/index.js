const parseArgv = require("./options");
const collectAndWrite = require('./collectAndWrite')
const excelPack = require('./excel-pack')
const genLang = require('./gen-lang')

const option = parseArgv(process.argv);
console.log('option:', option)

let queue
if (option.gen) {
  queue = [{
    type: 'genLang',
    params: ['langSource', 'output'],
    do: () => genLang(option)
  }]
} else {
  queue = [{
    type: 'collectAndWrite',
    params: ['entry', 'output'],
    do: () => collectAndWrite(option).start()
  }, {
    type: 'excelPack',
    params: ['pack'],
    do: () => excelPack(option).start()
  }]
}

queue.forEach(everLine => {
  const isDoIt = everLine.params.every(param => option[param]);
  if (isDoIt) everLine.do();
})