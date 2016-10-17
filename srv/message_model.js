var Mongoose = require('mongoose');
var Config   = require('./config');

// Connect to Mongo by credentials from config
Mongoose.connect(Config.get('db:uri') + Config.get('db:schema'));

Mongoose.connection.on('error', function (err) {
	console.error('connection error', err);
});

Mongoose.connection.once('open', function callback () {
	console.info("Connected to DB!");
});

// Message model
var messageSchema = new Mongoose.Schema({
	header: { type: String, required: true },
	author: { type: String, required: true },
	body: { type: String, required: true },
	time_created: { type: Date, default: Date.now },
	time_updated: { type: Date, default: Date.now }
});

module.exports = Mongoose.model('Message', messageSchema);