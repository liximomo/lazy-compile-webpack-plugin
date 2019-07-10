const loaderUtils = require('loader-utils');

module.exports = function() {
  const { remote, resource, dep } = loaderUtils.getOptions(this) || {};
  this.addDependency(dep);

  return `
    module.exports = {
      then() {
        var img = new Image();
        img.src = "${remote}?resource=${encodeURIComponent(resource)}";
        // Never resolved, since app might crash if they get unexpected export.
        // The page will automatically fresh when the compile has done.
      }
    }
  `;
};
