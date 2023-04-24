'use strict';

const { fetchAndVerifyRelease } = require('../lib/v2ray-handle');
const { getLogger } = require('../lib/logger');

const logger = getLogger();

fetchAndVerifyRelease().then(() => {
  logger.info('done');
  process.exit(0);
}).catch((err) => {
  logger.error(err.stack);
  process.exit(1);
});
