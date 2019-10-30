const isBrowser = typeof window !== 'undefined';

const GLOBAL_ANIMATION_KEY = '__lazyCompileWebpackPlugin';

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
var originTitle = document.title;

function startAnimation() {
  if (!isBrowser) return noop;
  if (window[GLOBAL_ANIMATION_KEY]) return noop;

  window[GLOBAL_ANIMATION_KEY] = true;

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
  startAnimation: startAnimation,
  compile: compile,
};
