'use strict';

const { printDigestJSON } = require('../lib/v2ray-handle');

printDigestJSON().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
