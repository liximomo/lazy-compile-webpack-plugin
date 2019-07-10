console.log('bb.js');

setTimeout(() => {
  import(/* webpackChunkName: 'c'*/ './c');
}, 2 * 1000);
