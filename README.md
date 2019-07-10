<div align="center">
  <a href="https://github.com/webpack/webpack">
    <img width="200" height="200"
      src="https://webpack.js.org/assets/icon-square-big.svg">
  </a>
  <h1>Lazy Compile Webpack Plugin</h1>
  <p>Plugin that saves a tremendous amount of time.</p>
</div>

## Install
```bash
  npm i --save-dev lazy-compile-webpack-plugin
```

```bash
  yarn add --dev lazy-compile-webpack-plugin
```

## Usage
```js
const LazyCompilePlugin = require('lazy-compile-webpack-plugin')

module.exports = {
  entry: 'index.js',
  output: {
    path: __dirname + '/dist',
    filename: 'bundle.js'
  },
  plugins: [
    new LazyCompilePlugin()
  ]
}
```
