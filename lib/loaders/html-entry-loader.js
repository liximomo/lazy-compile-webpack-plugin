const path = require('path');
const loaderUtils = require('loader-utils');

module.exports = function() {
  const { activationUrl, ips } = loaderUtils.getOptions(this) || {};

  // function img(endpoint) {
  //   return `<img src="${activationUrl.replace('{host}', endpoint)}`;
  // }

  const html = `
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Layz Compile Webpack Plugin</title>
  <script>
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
    
    compile(${JSON.stringify(ips)}, '${activationUrl}');

    setTimeout(function () {
      window.location.reload()
    }, 0)
  </script>
</head>
<body>
</body>
</html>
`.trim();

  return `
module.exports = function () {
  return '${html}'
}
`.trim();
};
