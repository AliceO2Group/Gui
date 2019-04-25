const puppeteer = require('puppeteer');
const assert = require('assert');
const config = require('./test-config.js');
const {spawn} = require('child_process');

// APIs:
// https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md
// https://mochajs.org/

// Tips:
// Network and rendering can have delays this can leads to random failures
// if they are tested just after their initialization.

describe('InfoLogger', function() {
  let browser;
  let page;
  let subprocess; // web-server runs into a subprocess
  let subprocessOutput = '';
  this.timeout(5000);
  this.slow(1000);
  const baseUrl = 'http://' + config.http.hostname + ':' + config.http.port + '/';

  before(async () => {
    // Start web-server in background
    subprocess = spawn('node', ['index.js', 'test/test-config.js'], {stdio: 'pipe'});
    subprocess.stdout.on('data', (chunk) => {
      subprocessOutput += chunk.toString();
    });
    subprocess.stderr.on('data', (chunk) => {
      subprocessOutput += chunk.toString();
    });

    // Start infologgerserver simulator
    require('./live-simulator/infoLoggerServer.js');

    // Start browser to test UI
    browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
    page = await browser.newPage();
  });

  it('should load first page "/"', async () => {
    // try many times until backend server is ready
    for (let i = 0; i < 10; i++) {
      try {
        await page.goto(baseUrl, {waitUntil: 'networkidle0'});
        break; // connection ok, this test passed
      } catch (e) {
        if (e.message.includes('net::ERR_CONNECTION_REFUSED')) {
          await new Promise((done) => setTimeout(done, 500));
          continue; // try again
        }
        throw e;
      }
    }
  });

  it('should have redirected to default page "/?q={"severity":{"in":"I W E F"},"level":{"max":1}}"', async function() {
    await page.goto(baseUrl, {waitUntil: 'networkidle0'});
    const location = await page.evaluate(() => window.location);
    const search = decodeURIComponent(location.search);

    assert.strictEqual(search, '?q={"severity":{"in":"I W E F"},"level":{"max":1}}');
  });

  describe('LogFilter', async () => {
    it('should update URI with new encoded criteria', async () => {
      /* eslint-disable max-len */
      const decodedParams = '?q={"hostname":{"match":"%alda%qdip01%"},"severity":{"in":"I W E F"},"level":{"max":1}}';
      const expectedParams = '?q={%22hostname%22:{%22match%22:%22%25alda%25qdip01%25%22},%22severity%22:{%22in%22:%22I%20W%20E%20F%22},%22level%22:{%22max%22:1}}';
      /* eslint-enable max-len */
      const searchParams = await page.evaluate(() => {
        window.model.log.filter.setCriteria('hostname', 'match', '%alda%qdip01%');
        window.model.updateRouteOnModelChange();
        return window.location.search;
      });

      assert.strictEqual(searchParams, expectedParams);
      assert.strictEqual(decodeURI(searchParams), decodedParams);
    });

    it('should parse dates in format DD/MM/YY', async () => {
      // default Geneva time
      const $since = await page.evaluate(() => {
        window.model.log.filter.setCriteria('timestamp', 'since', '01/02/04');
        return window.model.log.filter.criterias.timestamp.$since.toISOString();
      });

      assert.strictEqual($since, '2004-01-31T23:00:00.000Z');
    });

    it('should parse dates in format DD/MM/YYTHH:MM', async () => {
      // default Geneva time
      const $since = await page.evaluate(() => {
        window.model.log.filter.setCriteria('timestamp', 'since', '01/02/04T00:00');
        return window.model.log.filter.criterias.timestamp.$since.toISOString();
      });

      assert.strictEqual($since, '2004-01-31T23:00:00.000Z');
    });

    it('should parse numbers to integers', async () => {
      const level = await page.evaluate(() => {
        window.model.log.filter.setCriteria('level', 'max', 12);
        return window.model.log.filter.criterias.level;
      });

      assert.strictEqual(level.$max, 12);
      assert.strictEqual(level.max, 12);
    });

    it('should parse empty keyword to null', async () => {
      const $match = await page.evaluate(() => {
        window.model.log.filter.setCriteria('pid', 'match', '');
        return window.model.log.filter.criterias.pid.$match;
      });

      assert.strictEqual($match, null);
    });

    it('should parse keyword', async () => {
      const $match = await page.evaluate(() => {
        window.model.log.filter.setCriteria('pid', 'match', '1234');
        return window.model.log.filter.criterias.pid.$match;
      });

      assert.strictEqual($match, '1234');
    });

    it('should parse no keywords to null', async () => {
      const $in = await page.evaluate(() => {
        window.model.log.filter.setCriteria('pid', 'in', '');
        return window.model.log.filter.criterias.pid.$in;
      });

      assert.strictEqual($in, null);
    });

    it('should parse keywords to array', async () => {
      const $in = await page.evaluate(() => {
        window.model.log.filter.setCriteria('pid', 'in', '123 456');
        return window.model.log.filter.criterias.pid.$in;
      });

      assert.strictEqual($in.length, 2);
      assert.strictEqual($in ['123', '456']);
    });

    it('should reset filters and set them again', async () => {
      const criterias = await page.evaluate(() => {
        window.model.log.filter.resetCriterias();
        window.model.log.filter.setCriteria('level', 'max', 21);
        return window.model.log.filter.criterias;
      });

      assert.strictEqual(criterias.pid.match, '');
      assert.strictEqual(criterias.pid.$match, null);
      assert.strictEqual(criterias.level.max, 21);
      assert.strictEqual(criterias.level.$max, 21);
      assert.strictEqual(criterias.timestamp.since, '');
      assert.strictEqual(criterias.timestamp.$since, null);
      assert.strictEqual(criterias.severity.in, 'I W E F');
      assert.deepStrictEqual(criterias.severity.$in, ['W', 'I', 'E', 'F']);
    });
  });

  describe('Live mode', () => {
    it('can be activated because it is configured and simulator is started', async () => {
      const liveEnabled = await page.evaluate(() => {
        window.model.log.liveStart();
        return window.model.log.liveEnabled;
      });

      assert.strictEqual(liveEnabled, true);
    });

    it('cannot be activated twice', async () => {
      const thrown = await page.evaluate(() => {
        try {
          window.model.log.liveStart();
          return false;
        } catch (e) {
          return true;
        }
      });

      assert.strictEqual(thrown, true);
    });

    it('should have filled some logs via WS with the level "debug"', async () => {
      // check level is still 21 after LogFilter tests
      const criterias = await page.evaluate(() => {
        window.model.log.filter.resetCriterias();
        window.model.log.filter.setCriteria('level', 'max', 21);
        return window.model.log.filter.criterias;
      });

      assert.strictEqual(criterias.level.max, 21);
      assert.strictEqual(criterias.level.$max, 21);

      // Wait for logs and count them (2-3 maybe, it's random)
      await page.waitFor(1500); // simulator is set to ~500ms per log
      const list = await page.evaluate(() => {
        return window.model.log.list;
      });

      assert.strictEqual(!!list.length, true);
    });

    after(async () => {
      const liveEnabled = await page.evaluate(() => {
        try {
          window.model.log.liveStop();
          return window.model.log.liveEnabled;
        } catch (e) {
          return true;
        }
      });
      assert.strictEqual(liveEnabled, false);
    });
  });


  describe('Query mode', () => {
    it('should fail because it is not configured', async () => {
      try {
        await page.evaluate(async () => {
          return await window.model.log.query();
        });
        assert.fail();
      } catch (e) {
        // code failed, so it is a successful test
      }
    });
  });

  describe('utils.js', async () => {
    it('can be injected', async () => {
      const watchDogInjection = page.waitForFunction('window.utils');
      await page.evaluate(() => {
        const script = document.createElement('script');
        script.type = 'module';
        const content = document.createTextNode('import * as utils from "/common/utils.js"; window.utils = utils;');
        script.appendChild(content);
        document.getElementsByTagName('head')[0].appendChild(script);
      });
      await watchDogInjection;
    });

    it('has a callRateLimiter to limit function calls per window', async () => {
      let counter = await page.evaluate(() => {
        window.testCounter = 0;
        window.testFunction = window.utils.callRateLimiter(() => window.testCounter++, 100);
        window.testFunction();
        window.testFunction();
        window.testFunction(); // 3 calls but counter will increase by 2 only at the end
        return window.testCounter;
      });
      assert.strictEqual(counter, 1);

      await page.waitFor(200);
      counter = await page.evaluate(() => {
        return window.testCounter;
      });
      assert.strictEqual(counter, 2);
    });
  });

  after(async () => {
    await browser.close();
    console.log('---------------------------------------------');
    console.log('Output of server logs for the previous tests:');
    console.log('---------------------------------------------');
    console.log(subprocessOutput);
    console.log('---------------------------------------------');
    subprocess.kill();
  });
});

