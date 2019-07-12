const fs = require('fs');
const Server = require('./server');
const loaders = require('./loaders');

const DEFAULT_PORT = 8060;

function isImportDep(dep) {
  return dep.type.startsWith('import()');
}

class LazyCompilePlugin {
  constructor(options) {
    const opts = Object.assign(
      {
        refreshAfterCompile: false,
      },
      options || {}
    );
    this.server = new Server(this, DEFAULT_PORT);
    this._loader = opts.refreshAfterCompile
      ? loaders.refreshLoader
      : loaders.loader;
    this._resourceMap = new Map();
    this._collectDynamicImports = this._collectDynamicImports.bind(this);
  }

  async _startServer() {
    await this.server.start();
  }

  async _recompile(filename) {
    return new Promise((resolve, reject) => {
      const now = new Date();

      // trigger watcher to recompile
      fs.utimes(filename, now, now, err => {
        if (err) {
          return reject(err);
        }

        resolve();
      });
    });
  }

  async activateResource(resource) {
    const moduleCtx = this._resourceMap.get(resource);
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
      !this._resourceMap.has(resource)
    ) {
      this._resourceMap.set(resource, {
        actived: false,
        dirty: false,
      });
    }
  }

  apply(compiler) {
    let serverLunched = false;
    const serverPromise = this._startServer();

    compiler.hooks.beforeCompile.tapAsync(
      'LazyCompilePlugin',
      ({ normalModuleFactory }, callback) => {
        normalModuleFactory.hooks.afterResolve.tap(
          'LazyCompilePlugin',
          this._collectDynamicImports
        );

        if (serverLunched) {
          callback();
        } else {
          serverPromise.then(
            () => {
              serverLunched = true;
              callback();
            },
            err => callback(err)
          );
        }
      }
    );

    compiler.hooks.compilation.tap('LazyCompilePlugin', compilation => {
      compilation.hooks.buildModule.tap('LazyCompilePlugin', wpModule => {
        if (!this._resourceMap.has(wpModule.resource)) {
          return;
        }

        const resource = wpModule.resource;
        const moduleCtx = this._resourceMap.get(resource);

        // overwrite module loader
        if (!moduleCtx.dirty) {
          const stripQuery = resource.replace(/\?.*$/, '');
          moduleCtx.dirty = true;
          moduleCtx.filename = stripQuery;
          moduleCtx.loaders = wpModule.loaders;
          wpModule.loaders = [
            {
              loader: this._loader,
              options: {
                activationUrl: this.server.createActivationUrl(resource),
              },
            },
          ];
          return;
        }

        // resotre loader
        if (moduleCtx.actived) {
          wpModule.loaders = moduleCtx.loaders;
          this._resourceMap.delete(resource);
          return;
        }
      });
    });
  }
}

module.exports = LazyCompilePlugin;
