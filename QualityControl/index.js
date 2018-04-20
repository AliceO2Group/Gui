const HttpServer = require('@aliceo2/web-ui').HttpServer;
const log = require('@aliceo2/web-ui').Log;
const fs = require('fs');
const path = require('path');
const api = require('./lib/api.js');

// Reading config file
let configFile = './config.js';
if (process.argv.length >= 3) {
  configFile = process.argv[2];
}

try {
  configFile = fs.realpathSync(configFile);
} catch (err) {
  log.error(`Unable to read config file: ${err.message}`);
  process.exit(1);
}

log.info(`Reading config file "${configFile}"`);
const config = require(configFile);

// Quick check config at start
log.info(`HTTP full link: http://${config.http.hostname}:${config.http.port}`);
log.info(`HTTPS full link: https://${config.http.hostname}:${config.http.portSecure}`);
log.info(`Using demo data: ${config.app.demoData}`);
log.info(`TObject2JSON URL: ${config.tobject2json.host}`);

// Start servers
const http = new HttpServer(config.http, config.jwt, config.oAuth);
http.addStaticPath('public');
http.addStaticPath(path.join(require.resolve('jsroot'), '../..'), 'jsroot');
api.setup(config, http);
