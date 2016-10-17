var should   = require('should');
var assert   = require('assert');
var request  = require('supertest');
var mongoose = require('mongoose');
var winston  = require('winston');
var config   = require('../srv/config');
var expect   = require('chai').expect;


describe('Routing', function() {
	var host = config.get('host') + ':' + config.get('port');
	var url  = '/api/messages/';

	// Connect to database first
	before(function(done) {
		mongoose.connect(config.get('db:uri') + config.get('db:schema'));
		done();
	});

	describe('Message', function () {
		var testMessage = {
			header : 'Mocha test message',
			author : 'Mocha test author',
			body   : 'Mocha test body'
		};

		var newBody = 'Mocha test body changed';

		var postedMessage;

		it('should post new message', function (done) {
			request(host)
				.post(url)
				.send(testMessage)
				.end(function (err, res) {
					if (err) {
						throw err;
					}

					res.status.should.be.equal(200);

					expect(res.body).to.be.an('object');

					res.body.should.have.property('_id');
					res.body.should.have.property('time_created');
					res.body.should.have.property('time_updated');

					expect(res.body.header).to.equal(testMessage.header);
					expect(res.body.author).to.equal(testMessage.author);
					expect(res.body.body).to.equal(null);

					postedMessage = res.body;

					done();
				});
		});

		it('should load list of messages', function (done) {
			request(host)
				.get(url)
				.end(function (err, res) {
					if (err) {
						throw err;
					}
					res.status.should.be.equal(200);

					expect(res.body).to.be.an('array');

					expect(res.body).to.deep.include({
						_id          : postedMessage._id,
						author       : postedMessage.author,
						header       : postedMessage.header,
						time_created : postedMessage.time_created,
					});

					done();
				});
		});

		it('should load message body', function (done) {
			request(host)
				.get(url + postedMessage._id)
				.end(function (err, res) {
					if (err) {
						throw err;
					}

					res.status.should.be.equal(200);

					expect(res.body).to.be.an('object');

					expect(res.body.header).to.equal(testMessage.header);
					expect(res.body.author).to.equal(testMessage.author);
					expect(res.body.body).to.equal(testMessage.body);
					expect(res.body._id).to.equal(postedMessage._id);
					expect(res.body.time_created).to.equal(postedMessage.time_created);
					expect(res.body.time_updated).to.equal(postedMessage.time_updated);

					done();
				});
		});

		it('should edit message', function (done) {
			request(host)
				.put(url + postedMessage._id)
				.send({ body: newBody })
				.end(function (err, res) {
					if (err) {
						throw err;
					}

					res.status.should.be.equal(200);

					expect(res.body).to.be.an('object');

					expect(res.body.header).to.equal(testMessage.header);
					expect(res.body.author).to.equal(testMessage.author);
					expect(res.body.body).to.equal(newBody);
					expect(res.body._id).to.equal(postedMessage._id);
					expect(res.body.time_created).to.equal(postedMessage.time_created);

					done();
				});
		});

		it('should delete posted message', function (done) {
			request(host)
				.delete(url + postedMessage._id)
				.end(function (err, res) {
					if (err) {
						throw err;
					}

					res.status.should.be.equal(200);

					expect(res.body).to.be.an('object');

					expect(res.body.status).to.equal('OK');

					done();
				});
		});
	});
});