var Nconf = require('nconf');

Nconf.argv()
	.env()
	.file({ file: __dirname  + '/config.json' });

module.exports = Nconf;