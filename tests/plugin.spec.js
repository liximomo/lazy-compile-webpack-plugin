const path = require('path');
const webpack = require('webpack');
const MemoryFS = require('memory-fs');
const superagent = require('superagent');
const LazyCompilePlugin = require('../');

function getPath(...subpaths) {
  return path.join(__dirname, 'fixtures', ...subpaths);
}

function setCompilerFs(compiler, fs) {
  compiler.outputFileSystem = fs;
}

// function escapeStringRegExp(str) {
//   return str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
// }

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

function waitForCompile(compiler, initialCb) {
  const queue = initialCb ? [initialCb] : [];
  let stats;

  function shift() {
    const job = queue.shift();
    if (queue.length) {
      let hasError = false;
      try {
        job(stats);
      } catch (e) {
        hasError = true;
        finish(e);
      }
    }

    if (queue.length === 1) {
      finish();
    }
  }

  function finish(err) {
    const done = queue[queue.length - 1];
    compiler.watching.close(() => {
      if (done) {
        if (err) {
          done.fail(err);
        } else {
          done();
        }
      } else {
        new Error('waitForCompile chain is missing .then(done)');
      }
    });
  }

  const chainer = {
    then: nextCb => {
      queue.push(nextCb);
      return chainer;
    },
  };

  compiler.hooks.done.tap('waitForCompile', _stats => {
    stats = _stats;
    shift();
  });

  return chainer;
}

function watchCompiler(webpackConfig, fs) {
  const compiler = createCompiler(webpackConfig, fs);
  compiler.watching = compiler.watch(
    {
      aggregateTimeout: 500,
      poll: false,
    },
    () => {
      // do nohting
    }
  );
  return compiler;
}

describe('plugin', () => {
  const fs = new MemoryFS();
  const dummyLoaderPath = require.resolve(
    './fixtures/__shared__/dummy-loader.js'
  );
  const dummyLoader = require(dummyLoaderPath);
  const baseConfig = {
    entry: getPath('simple'),
    output: {
      filename: 'bundle.js',
      path: '/out',
      chunkFilename: '[name].chunk.js',
    },
  };
  let lazyPlugin;

  function activeChunk(file) {
    superagent
      .get(
        lazyPlugin.server
          .createActivationUrl(getPath('simple', file))
          .replace('{host}', 'localhost')
      )
      // request won't be sent if we don't call then
      .then(() => {});
  }

  beforeEach(() => {
    lazyPlugin = new LazyCompilePlugin();
    dummyLoader.loader = jest.fn(x => x);
  });
  afterEach(() => {
    lazyPlugin.dispose();
    fs.rmdirSync('/out');
  });

  it('should generate magic code for async module', async () => {
    const lazyStats = await runCompiler(
      {
        ...baseConfig,
        plugins: [lazyPlugin],
      },
      fs
    );
    expect(lazyStats.compilation.assets['bundle.js']).toBeDefined();
    expect(lazyStats.compilation.assets['bundle.js'].source()).toEqual(
      expect.stringContaining(
        `@activationUrl ${lazyPlugin.server.createActivationUrl(
          getPath('simple', 'index.js')
        )}`
      )
    );
  });

  it('should should not run loader for async module', async () => {
    await runCompiler(
      {
        ...baseConfig,
        module: {
          rules: [{ test: /a\.js$/, use: dummyLoaderPath }],
        },
        plugins: [lazyPlugin],
      },
      fs
    );
    expect(dummyLoader.loader).not.toHaveBeenCalled();
    await runCompiler(
      {
        ...baseConfig,
        module: {
          rules: [{ test: /a\.js$/, use: dummyLoaderPath }],
        },
      },
      fs
    );
    expect(dummyLoader.loader).toHaveBeenCalled();
  });

  it('should trigger recompile for the real moudle when module is actived', done => {
    // const spy = jest.spyOn(lazyPlugin, '_recompile');
    const compiler = watchCompiler(
      {
        ...baseConfig,
        plugins: [lazyPlugin],
        module: {
          rules: [{ test: /a\.js$/, use: dummyLoaderPath }],
        },
      },
      fs
    );

    waitForCompile(compiler, () => {
      activeChunk('index.js');
    })
      .then(stats => {
        expect(dummyLoader.loader).not.toHaveBeenCalled();
        expect(stats.compilation.assets['a.chunk.js'].source()).toEqual(
          expect.stringContaining(
            `@activationUrl ${lazyPlugin.server.createActivationUrl(
              getPath('simple', 'a.js')
            )}`
          )
        );
        activeChunk('a.js');
      })
      .then(stats => {
        expect(dummyLoader.loader).toHaveBeenCalled();
        expect(stats.compilation.assets['a.chunk.js'].source()).toEqual(
          expect.not.stringContaining(
            `@activationUrl ${lazyPlugin.server.createActivationUrl(
              getPath('simple', 'a.js')
            )}`
          )
        );
      })
      .then(done);
  });
});
