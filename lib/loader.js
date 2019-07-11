const loaderUtils = require('loader-utils');

module.exports = function() {
  const { remote, resource } = loaderUtils.getOptions(this) || {};

  return `
    if (typeof window !== 'undefined') {
      var originTitle = document.title;
      // modified from https://matthewrayfield.com/articles/animating-urls-with-javascript-and-emojis
      var f = ['🕐','🕑','🕒','🕓','🕔','🕕','🕖','🕗','🕘','🕙','🕚','🕛'];
      function loop() {
        document.title = 'compiling ' + f[Math.floor((Date.now() / 100) % f.length)];
        setTimeout(loop, 50);
      }
      loop();

      window.onbeforeunload = function() {
        document.title = originTitle;
      }
    }

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
