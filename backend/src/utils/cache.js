const NodeCache = require('node-cache');
// Global singleton cache with default TTL 15s; callers can override per get/set
const cache = new NodeCache({ stdTTL: 15, checkperiod: 30 });
module.exports = cache;

