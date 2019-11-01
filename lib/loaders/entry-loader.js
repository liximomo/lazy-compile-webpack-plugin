const path = require('path');
const loaderUtils = require('loader-utils');
const apiPath = path.join(__dirname, 'api.js');

module.exports = function() {
  const { activationUrl, ips } = loaderUtils.getOptions(this) || {};

  return `
// @activationUrl ${activationUrl}

var api = require('!!${apiPath}');
var compilation = api.compile(${JSON.stringify(ips)}, '${activationUrl}');

setTimeout(function () {
  window.location.reload()
}, 0)
`.trim();
};
