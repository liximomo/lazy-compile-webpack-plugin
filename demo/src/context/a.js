console.log('context a');

document.body.addEventListener('click', async () => {
  const r = await import(/* webpackChunkName: 'a'*/ '../a');
  console.log('async module a', r);
});
