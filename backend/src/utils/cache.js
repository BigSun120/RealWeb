const NodeCache = require('node-cache');
// Global singleton cache with default TTL 60s; callers can override per get/set
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });
module.exports = cache;

