const path = require('path');
const loaderUtils = require('loader-utils');
var apiPath = path.join(__dirname, 'api.js')
if(/win32/gi.test(process.platform)){
  apiPath = apiPath.replace(/\\/g,'\\\\')
}
module.exports = function() {
  const { activationUrl, ips } = loaderUtils.getOptions(this) || {};

  return `
// @activationUrl ${activationUrl}

var api = require('!!${apiPath}');
api.compile(${JSON.stringify(ips)}, '${activationUrl}');

if (api.isBrowser) {
  setTimeout(function () {
    window.location.reload()
  }, 0)
}
`.trim();
};
