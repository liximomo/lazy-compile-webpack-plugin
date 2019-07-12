const detect = require('detect-port-alt');
const http = require('http');
const url = require('url');

class Server {
  constructor(plugin, port) {
    this.plugin = plugin;
    this._listenAddr = '0.0.0.0';
    this._listenPort = port;
  }

  async start() {
    try {
      this._listenPort = await detect(this._listenPort, this._listenAddr);
    } catch (err) {
      throw new Error(
        `Could not find an open port.` +
          '\n' +
          ('Network error message: ' + err.message || err) +
          '\n'
      );
    }

    // Create an HTTP server
    const server = http.createServer((req, res) => {
      const resource = url.parse(req.url, true).query.resource;
      this.plugin.activateResource(resource).then(() => {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end('okay');
      });
    });
    return new Promise((resove, reject) => {
      server.listen(this._listenPort, this._listenAddr, err => {
        if (err) {
          return reject(
            new Error(
              `Could not start the backend.` +
                '\n' +
                ('Network error message: ' + err.message || err) +
                '\n'
            )
          );
        }

        resove();
      });
    });
  }

  createActivationUrl(resource) {
    return `http://${this._listenAddr}:${
      this._listenPort
    }?resource=${encodeURIComponent(resource)}`;
  }
}

module.exports = Server;
