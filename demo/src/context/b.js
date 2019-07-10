console.log('context b');

document.body.addEventListener('click', async () => {
  const r = await import(/* webpackChunkName: 'b'*/ '../a');
  console.log('async module b', r);
});
