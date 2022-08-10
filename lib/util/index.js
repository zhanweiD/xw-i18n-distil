const chalk = require('./chalk');

const invert = function (obj) {
  var result = {};
  var keys = Object.keys(obj);
  for (var i = 0, length = keys.length; i < length; i++) {
    result[obj[keys[i]]] = keys[i];
  }
  return result;
};

const replace = function (str) {
  str = str.replace(/[\r\n]/g, '')
  str = str.replace(/\\'/g, '\'').replace(/\'/g, '\\\'')
  str = str.replace(/\\"/g, '\"').replace(/\"/g, '\\"')
  return str;
};

module.exports = {
  invert,
  replace
}