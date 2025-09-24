const path = require('path');

let cachedStaticTools = null;

function loadStaticTools() {
  if (!cachedStaticTools) {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const staticTools = require(path.resolve(__dirname, '../../../shared/static-tools.json'));
    cachedStaticTools = Array.isArray(staticTools) ? staticTools : [];
  }
  return cachedStaticTools;
}

function getStaticTools() {
  return loadStaticTools().map(tool => ({ ...tool }));
}

module.exports = {
  getStaticTools
};
