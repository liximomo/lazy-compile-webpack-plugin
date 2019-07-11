const promisify = require('util.promisify');
const path = require('path');
const fs = require('fs');
const Server = require('./server');
const openFile = promisify(fs.open);
const futimes = promisify(fs.futimes);

const DEFAULT_PORT = 8060;

function isImportDep(dep) {
  return dep.type.startsWith('import()');
}

class LazyCompilePlugin {
  constructor() {
    this.resourceMap = new Map();
    this._collectDynamicImports = this._collectDynamicImports.bind(this);
  }

  async _runServer() {
    const res = await new Server(this).start(DEFAULT_PORT);
    this.remote = res.remote;
  }

  async _recompile(filename) {
    const fd = await openFile(filename, 'a');
    const now = new Date();
    return futimes(fd, now, now);
  }

  async activateResource(resource) {
    const moduleCtx = this.resourceMap.get(resource);
    if (moduleCtx) {
      moduleCtx.actived = true;
      return this._recompile(moduleCtx.filename);
    }
  }

  _collectDynamicImports(wpModule) {
    const { dependencies, resource } = wpModule;
    if (
      dependencies.length &&
      dependencies.some(isImportDep) &&
      !this.resourceMap.has(resource)
    ) {
      this.resourceMap.set(resource, {
        actived: false,
        dirty: false,
      });
    }
  }

  apply(compiler) {
    this.compiler = compiler;
    const serverPromise = this._runServer();

    compiler.hooks.beforeCompile.tapAsync(
      'LazyCompilePlugin',
      ({ normalModuleFactory }, callback) => {
        normalModuleFactory.hooks.afterResolve.tap(
          'LazyCompilePlugin',
          this._collectDynamicImports
        );

        if (this.remote) {
          callback();
        } else {
          serverPromise.then(() => callback(), err => callback(err));
        }
      }
    );

    compiler.hooks.compilation.tap('LazyCompilePlugin', compilation => {
      compilation.hooks.buildModule.tap('LazyCompilePlugin', wpModule => {
        if (!this.resourceMap.has(wpModule.resource)) {
          return;
        }

        const resource = wpModule.resource;
        const moduleCtx = this.resourceMap.get(resource);

        // overwrite module loader
        if (!moduleCtx.dirty) {
          const stripQuery = resource.replace(/\?.*$/, '');
          moduleCtx.dirty = true;
          moduleCtx.filename = stripQuery;
          moduleCtx.loaders = wpModule.loaders;
          wpModule.loaders = [
            {
              loader: require.resolve('./loader.js'),
              options: {
                remote: this.remote,
                resource: resource,
              },
            },
          ];
          return;
        }

        // resotre loader
        if (moduleCtx.actived) {
          wpModule.loaders = moduleCtx.loaders;
          this.resourceMap.delete(resource);
          return;
        }
      });
    });
  }
}

module.exports = LazyCompilePlugin;
