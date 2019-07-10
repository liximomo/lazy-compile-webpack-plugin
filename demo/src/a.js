async function foo() {
  console.log('aa.js');
}

(async () => {
  await foo();
})();
