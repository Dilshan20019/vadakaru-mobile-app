const dns = require('dns');

// Atlas Cluster Shard Hosts -> Resolved IP Map
const ATLAS_HOSTS = {
  'ac-74qw9fx-shard-00-00.1uzp4lf.mongodb.net': '159.41.242.250',
  'ac-74qw9fx-shard-00-01.1uzp4lf.mongodb.net': '159.41.243.23',
  'ac-74qw9fx-shard-00-02.1uzp4lf.mongodb.net': '159.41.243.4',
};

// Fallback resolver for local ISP DNS timeouts on MongoDB Atlas subdomains
function setupDnsFallback() {
  const originalLookup = dns.lookup;
  dns.lookup = (hostname, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (ATLAS_HOSTS[hostname]) {
      const ip = ATLAS_HOSTS[hostname];
      if (options && options.all) {
        return callback(null, [{ address: ip, family: 4 }]);
      }
      return callback(null, ip, 4);
    }

    return originalLookup(hostname, options, callback);
  };
}

module.exports = { setupDnsFallback };
