const path = require('path');
const webpack = require('webpack');
const MemoryFS = require('memory-fs');
const superagent = require('superagent');
const LazyCompilePlugin = require('../');

function setCompilerFs(compiler, fs) {
  compiler.inputFileSystem = fs;
  compiler.outputFileSystem = fs;
  compiler.resolvers.normal.fileSystem = fs;
  compiler.resolvers.context.fileSystem = fs;
}

// function escapeStringRegExp(str) {
//   return str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
// }

function createDonePlugin(doneCallback) {
  return function() {
    const hasHooks = Boolean(this.hooks);
    if (hasHooks) {
      this.hooks.done.tap('MyTestPlugin', doneCallback);
    } else {
      this.plugin('done', doneCallback);
    }
  };
}

function createCompiler(webpackConfig, fs) {
  const configs = Array.isArray(webpackConfig)
    ? webpackConfig
    : [webpackConfig];
  configs.forEach(config => {
    if (!config.mode) {
      config.mode = 'development';
    }
    // if (!config.plugins) config.plugins = [];
  });
  const compiler = webpack(webpackConfig);
  const compilers = compiler.compilers || [compiler];
  compilers.forEach(c => setCompilerFs(c, fs));
  return compiler;
}

function runCompiler(webpackConfig, fs) {
  const compiler = createCompiler(webpackConfig, fs);

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) {
        reject(err);
      } else if (stats.hasErrors()) {
        reject(stats.compilation.errors[0]);
      } else {
        resolve(stats);
      }
    });
  });
}

function watchCompiler(webpackConfig, fs) {
  const compiler = createCompiler(webpackConfig, fs);
  return new Promise((resolve, reject) => {
    compiler.watch(
      {
        // Example watchOptions
        aggregateTimeout: 300,
        poll: undefined,
      },
      (err, stats) => {
        if (err) {
          const cStats = stats.stats
            ? stats.stats.find(s => s.compilation.errors.length)
            : stats;
          return reject(cStats.compilation.errors[0]);
        }

        resolve();
      }
    );
  });
}

describe('plugin', () => {
  const fs = new MemoryFS();
  const dummyLoaderPath = require.resolve('./helper/dummy-loader.js');
  const dummyLoader = require(dummyLoaderPath);

  // make webpack pass the loader resolve
  fs.mkdirpSync(path.dirname(dummyLoaderPath));
  fs.writeFileSync(
    dummyLoaderPath,
    `module.exports = function dummyLoader(source) {
      return 'sss';
    };`,
    'utf-8'
  );

  const baseConfig = {
    entry: '/src/index',
    output: {
      filename: 'bundle.js',
      path: '/out',
      chunkFilename: '[name].chunk.js',
    },
  };

  beforeEach(() => {
    dummyLoader.loader = jest.fn(x => x);
    fs.mkdirSync('/src');
    fs.writeFileSync('/src/a.js', `console.log("a.js")`, 'utf-8');
    fs.writeFileSync('/src/b.js', `console.log("b.js")`, 'utf-8');
  });
  afterEach(() => {
    fs.rmdirSync('/src');
    fs.rmdirSync('/out');
  });

  it('should generate magic code for async module', async () => {
    fs.writeFileSync(
      '/src/index.js',
      `import(/* webpackChunkName: 'a' */ "./a")`,
      'utf-8'
    );
    const plugin = new LazyCompilePlugin();
    const lazyStats = await runCompiler(
      {
        ...baseConfig,
        plugins: [plugin],
      },
      fs
    );
    expect(lazyStats.compilation.assets['a.chunk.js']).toBeDefined();
    expect(lazyStats.compilation.assets['a.chunk.js'].source()).toEqual(
      expect.stringContaining(
        `@activationUrl ${plugin.server.createActivationUrl('/src/a.js')}`
      )
    );
  });

  it('should should not run loader for async module', async () => {
    fs.writeFileSync(
      '/src/index.js',
      `import(/* webpackChunkName: 'a' */ "./a")`,
      'utf-8'
    );
    await runCompiler(
      {
        ...baseConfig,
        module: {
          rules: [{ test: '/src/a.js', use: dummyLoaderPath }],
        },
        plugins: [new LazyCompilePlugin()],
      },
      fs
    );
    expect(dummyLoader.loader).not.toHaveBeenCalled();
    await runCompiler(
      {
        ...baseConfig,
        module: {
          rules: [{ test: '/src/a.js', use: dummyLoaderPath }],
        },
      },
      fs
    );
    expect(dummyLoader.loader).toHaveBeenCalled();
  });

  it('should trigger recompile when module is actived', async () => {
    fs.writeFileSync(
      '/src/index.js',
      `import(/* webpackChunkName: 'a' */ "./a")`,
      'utf-8'
    );
    const plugin = new LazyCompilePlugin();
    const spy = jest
      .spyOn(plugin, '_recompile')
      .mockImplementationOnce(() => Promise.resolve());
    await runCompiler(
      {
        ...baseConfig,
        plugins: [plugin],
      },
      fs
    );
    const resp = await superagent.get(
      plugin.server.createActivationUrl('/src/a.js')
    );
    expect(resp.status).toBe(200);
    expect(spy.mock.calls[0][0]).toEqual('/src/a.js');
  });
});
