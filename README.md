<div align="center">
  <a href="https://github.com/webpack/webpack">
    <img width="200" height="200"
      src="https://webpack.js.org/assets/icon-square-big.svg">
  </a>
  <h1>Lazy Compile Webpack Plugin</h1>
  <p>Plugin that saves a tremendous amount of time.</p>
</div>

## Why

Starting the development server is taking you a long time when the codebase is large. You have tried dynamic imports, it only does a load-on-demand, the whole project was still been compiled. We don't want to wait a couple of minutes for a simple modification. People don't waste time for the things they have never used!

## Install

```bash
  npm i --save-dev lazy-compile-webpack-plugin
```

```bash
  yarn add --dev lazy-compile-webpack-plugin
```

## Usage

```js
const LazyCompilePlugin = require('lazy-compile-webpack-plugin');

module.exports = {
  entry: 'index.js',
  output: {
    path: __dirname + '/dist',
    filename: 'bundle.js',
  },
  plugins: [new LazyCompilePlugin()],
};
```

## Options

|                    Name                     |            Type             | Default | Description                                        |
| :-----------------------------------------: | :-------------------------: | :-----: | :------------------------------------------------- |
|              **[`refreshAfterCompile`](#refreshAfterCompile)**              |    `boolean`    | `false`  | Enable/Disable *page refresh* when compilation is finish                    |


### `refreshAfterCompile`

Type: `boolean`
Default: `false`

Set `false` for a seamless dev experience.
