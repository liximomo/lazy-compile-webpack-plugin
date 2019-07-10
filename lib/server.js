const detect = require('detect-port-alt');
const http = require('http');
const url = require('url');

class Server {
  constructor(plugin) {
    this.plugin = plugin;
  }

  async start(defaultPort) {
    let port;
    try {
      port = await detect(defaultPort);
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
      server.listen(port, '127.0.0.1', err => {
        if (err) {
          return reject(
            new Error(
              `Could not create server.` +
                '\n' +
                ('Network error message: ' + err.message || err) +
                '\n'
            )
          );
        }

        resove({
          remote: `http://127.0.0.1:${port}`,
        });
      });
    });
  }
}

module.exports = Server;
