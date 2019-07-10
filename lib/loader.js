const loaderUtils = require('loader-utils');

module.exports = function() {
  const { remote, resource } = loaderUtils.getOptions(this) || {};

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
