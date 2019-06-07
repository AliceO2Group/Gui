const config = require('./configProvider.js');
const ConsulConnector = require('./ConsulConnector.js');
const TObject2JsonClient = require('./TObject2JsonClient.js');
const CCDBConnector = require('./CCDBConnector.js');
const MySQLConnector = require('./MySQLConnector.js');
const AMOREConnector = require('./AMOREConnector.js');
const JsonFileConnector = require('./JsonFileConnector.js');

const log = new (require('@aliceo2/web-ui').Log)('QualityControlModel');

// --------------------------------------------------------
// Initialization of model according to config file

const jsonDb = new JsonFileConnector(config.dbFile || __dirname + '/../db.json');

if (config.consul) {
  const consulService = new ConsulConnector(config.consul);
  consulService.isConsulUpAndRunning();
  module.exports.listOnlineObjects = consulService.listOnlineObjects.bind(consulService);
  module.exports.isOnlineModeConnectionAlive = consulService.isConsulUpAndRunning.bind(consulService);
} else {
  log.error('Consul Service: No Configuration Found');
}

if (config.listingConnector === 'ccdb') {
  log.info('Object listing: CCDB');
  if (!config.ccdb) {
    throw new Error('CCDB config is mandatory');
  }
  const ccdb = new CCDBConnector(config.ccdb);
  module.exports.listObjects = ccdb.listObjects.bind(ccdb);

  const tObject2JsonClient = new TObject2JsonClient('ccdb', config.ccdb);
  module.exports.readObjectData = tObject2JsonClient.retrieve.bind(tObject2JsonClient);
} else if (config.listingConnector === 'amore') {
  log.info('Object listing: AMORE');
  if (!config.amore) {
    throw new Error('AMORE config is mandatory');
  }
  const amore = new AMOREConnector(config.amore);
  module.exports.listObjects = amore.listObjects.bind(amore);
} else {
  const mysql = new MySQLConnector(config.mysql);
  log.info('Object listing: MySQL');
  module.exports.listObjects = mysql.listObjects.bind(mysql);

  const tObject2JsonClient = new TObject2JsonClient('mysql', config.mysql);
  module.exports.readObjectData = tObject2JsonClient.retrieve.bind(tObject2JsonClient);
}

// --------------------------------------------------------

module.exports.readLayout = jsonDb.readLayout.bind(jsonDb);
module.exports.updateLayout = jsonDb.updateLayout.bind(jsonDb);
module.exports.listLayouts = jsonDb.listLayouts.bind(jsonDb);
module.exports.createLayout = jsonDb.createLayout.bind(jsonDb);
module.exports.deleteLayout = jsonDb.deleteLayout.bind(jsonDb);
