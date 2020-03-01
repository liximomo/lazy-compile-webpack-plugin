const path = require('path');
const loaderUtils = require('loader-utils');
const apiPath = path.join(__dirname, 'api.js').split(path.sep).join('/');

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
