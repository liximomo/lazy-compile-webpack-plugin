var isBrowser = typeof window !== 'undefined';

var GLOBAL_ANIMATION_KEY = '__lazyCompileWebpackPlugin';

function noop() {}

// modified from https://matthewrayfield.com/articles/animating-urls-with-javascript-and-emojis
var figures = [
  '🕐',
  '🕑',
  '🕒',
  '🕓',
  '🕔',
  '🕕',
  '🕖',
  '🕗',
  '🕘',
  '🕙',
  '🕚',
  '🕛',
];

function startAnimation() {
  if (!isBrowser) return noop;
  if (window[GLOBAL_ANIMATION_KEY]) return noop;

  window[GLOBAL_ANIMATION_KEY] = true;

  var originTitle = document.title;
  function animatioLoop() {
    loopHandle = setTimeout(animatioLoop, 50);
    document.title =
      'Compiling ' + figures[Math.floor((Date.now() / 100) % figures.length)];
  }
  animatioLoop();

  return () => {
    window[GLOBAL_ANIMATION_KEY] = false;
    clearTimeout(loopHandle);
    document.title = originTitle;
  };
}

function compile(endpoints, activationUrl) {
  var ready;
  var prom = new Promise(resolve => {
    ready = resolve;
    endpoints.forEach(function(endpoint) {
      var img = new Image();
      img.src = activationUrl.replace('{host}', endpoint);
    });
  });
  prom.ready = ready;

  return prom;
}

module.exports = {
  isBrowser,
  startAnimation: startAnimation,
  compile: compile,
};
