const fs = require('fs');
const Winston = require('./winston.js');
const InfoLoggerSender = require('./InfoLoggerSender.js');

let winston = null;
let infologger = null;

/**
 * Handles loging, prints out in console, saves to file or sends to cerntral InfoLogger instance
 * @author Adam Wegrzynek <adam.wegrzynek@cern.ch>
 */
class Log {
  /**
   * Sets the label and constructs default winston instance
   * @constructor
   * @param {string} label
   */
  constructor(label = null) {
    this.label = label;
    if (!winston) {
      winston = new Winston();
      winston.instance.warn('Created default instance of logger');
    }
  }

  /**
   * Configures Winston and InfoLogger instances
   * @param {object} config
   */
  static configure(config) {
    if (config && config.winston) {
      winston = new Winston(config.winston);
    }
    if (!infologger && config && config.infologger && fs.existsSync(config.infologger.execPath)) {
      infologger = new InfoLoggerSender(winston, config.infologger.execPath);
    }
  }

  /**
   * Debug severity log
   * @param {string} log
   */
  debug(log) {
    const message = (this.label == null) ? log : {message: log, label: this.label};
    winston.instance.debug(message);

    if (infologger) {
      const logObj = {severity: 'D', message: log, rolename: this.label};
      infologger.send(logObj);
    }
  }

  /**
   * Information severity log
   * @param {string} log
   */
  info(log) {
    const message = (this.label == null) ? log : {message: log, label: this.label};
    winston.instance.info(message);

    if (infologger) {
      const logObj = {severity: 'D', message: log, rolename: this.label};
      infologger.send(logObj);
    }
  }

  /**
   * Warning severity log
   * @param {string} log
   */
  warn(log) {
    const message = (this.label == null) ? log : {message: log, label: this.label};
    winston.instance.warn(message);

    if (infologger) {
      const logObj = {severity: 'W', message: log, rolename: this.label};
      infologger.send(logObj);
    }
  }

  /**
   * Error severity log
   * @param {string} log
   */
  error(log) {
    const message = (this.label == null) ? log : {message: log, label: this.label};
    winston.instance.error(message);

    if (infologger) {
      const logObj = {severity: 'E', message: log, rolename: this.label};
      infologger.send(logObj);
    }
  }

  /**
   * Prints more details, for debugging purposes
   * @param {object} err
   */
  static trace(err) {
    // eslint-disable-next-line
    console.trace(err);
  }
}

module.exports = Log;
