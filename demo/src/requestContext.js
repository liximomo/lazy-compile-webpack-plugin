const requireContext = require.context('./context', false, /\/.*\.js$/);

requireContext.keys().forEach(fileName => {
  requireContext(fileName);
});
