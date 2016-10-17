var Express      = require('express');          // Express framework
var Path         = require('path');             // Path library
var BodyParser   = require('body-parser');      // Lib for parsing body of request
var Config       = require('./config');         // Access to config file
var MessageModel = require('./message_model');  // Mongoose message model

// Create app
var app = Express();


// Attach body parse to app
app.use(BodyParser());


// Static file server
app.use(Express.static(Path.join(__dirname, "../htdocs")));


// Request messages list
app.get('/api/messages', function (req, res) {
	// Select message without body
	return MessageModel
		.find()
		.select({
			_id          : true,
			header       : true,
			author       : true,
			time_created : true,
		})
		.exec(function (err, messages) {
			if (!err) {
				return res.send(messages);
			}

			res.statusCode = 500;

			console.error('Internal error(%d): %s', res.statusCode, err.message);

			return res.send({ error: 'Server error' });
		});
});


// Publish new message
app.post('/api/messages', function (req, res) {
	var message = new MessageModel({
		header: req.body.header,
		author: req.body.author,
		body: req.body.body,
		avatar: req.body.avatar
	});

	message.save(function (err) {
		if (!err) {
			console.info('Created new message');
			message.body = null;
			return res.send(message);
		}

		console.error(err);

		if (err.name === 'ValidationError') {
			res.statusCode = 400;
			res.send({ error: 'Validation error' });
		} else {
			res.statusCode = 500;
			res.send({ error: 'Server error' });
		}
	});
});


// Get full info about message
app.get('/api/messages/:id', function(req, res) {
	return MessageModel.findById(req.params.id, function (err, message) {
		if(!message) {
			res.statusCode = 404;
			return res.send({ error: 'Not found' });
		}

		if (!err) {
			return res.send(message);
		}

		res.statusCode = 500;
		console.error('Internal error(%d): %s', res.statusCode, err.message);
		return res.send({ error: 'Server error' });
	});
});


// Edit message
app.put('/api/messages/:id', function (req, res){
	return MessageModel.findById(req.params.id, function (err, message) {
		if(!message) {
			res.statusCode = 404;
			return res.send({ error: 'Not found' });
		}

		if (req.body.header) {
			message.header = req.body.header;
		}
		if (req.body.author) {
			message.author = req.body.author;
		}
		if (req.body.body) {
			message.body = req.body.body;
		}

		message.time_updated = new Date();

		return message.save(function (err) {
			if (!err) {
				console.info("message updated");
				return res.send(message);
			}

			console.log(err);

			if (err.name == 'ValidationError') {
				res.statusCode = 400;
				res.send({ error: 'Validation error' });
			} else {
				res.statusCode = 500;
				res.send({ error: 'Server error' });
			}

			console.error('Internal error(%d): %s', res.statusCode, err.message);
		});
	});
});


// Delete message
app.delete('/api/messages/:id', function (req, res){
	return MessageModel.findById(req.params.id, function (err, message) {
		if(!message) {
			res.statusCode = 404;
			return res.send({ error: 'Not found' });
		}

		return message.remove(function (err) {
			if (!err) {
				console.info("message removed");
				return res.send({ status: 'OK' });
			}

			res.statusCode = 500;
			console.error('Internal error(%d): %s', res.statusCode, err.message);
			return res.send({ error: 'Server error' });
		});
	});
});


// Handle unknown route
app.use(function (req, res, next) {
	res.status(404);

	console.info('The url can not be found: %s', req.url);

	res.send('Requested resource can not be found');
});


// Handle internal error
app.use(function (err, req, res, next) {
	res.status(err.status || 500);

	console.error('Internal error(%d): %s', res.statusCode, err.message);

	res.send({ error: err.message });
});


// Start server
app.listen(Config.get('port'), function () {
	console.info('Express server listening on port 1337');
});