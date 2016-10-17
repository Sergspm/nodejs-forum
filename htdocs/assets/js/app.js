// Using requirejs to load dependencies
requirejs.config({
	baseUrl: 'assets/',
	deps: [],
	paths: {
		jquery: 'libs/jquery/dist/jquery.min',
		uikit: 'libs/uikit/js/uikit.min',
		uikit_notify: 'libs/uikit/js/components/notify.min',
		underscore: 'libs/underscore/underscore-min',
		backbone: 'libs/backbone/backbone-min',
		backbone_validation: 'libs/backbone-validation/dist/backbone-validation-min'
	},
	shim: {
		uikit: { deps: [ 'jquery' ] },
		uikit_notify: { deps: [ 'uikit' ] },
		backbone: { deps: [ 'underscore' ] },
		backbone_validation: { deps: [ 'backbone' ] }
	}
});


require([ 'backbone_validation', 'uikit_notify' ], function () {
	// Notification wraper
	var notify = function (message, type) {
		UIkit.notify({
			message : message,
			status  : type,
			timeout : 2000,
			pos     : 'top-right'
		});
	};

	// Extend base template engine to apply results of validation
	_.extend(Backbone.Validation.callbacks, {
		valid: function (view, attr, selector) {
			view.$el.find('[name="' + attr + '"]')
				.removeClass('uk-form-danger')
				.siblings('.uk-form-help-inline')
				.hide()
				.html('');
		},
		invalid: function (view, attr, error, selector) {
			view.$el.find('[name="' + attr + '"]')
				.addClass('uk-form-danger')
				.siblings('.uk-form-help-inline')
				.show()
				.html(error);
		}
	});

	// Base message model
	var MessageModel = Backbone.Model.extend({
		url: function () {
			return '/api/messages/' + (this.id ? this.id : '');
		},

		showBody: false,

		idAttribute: '_id',

		validation: {
			header: {
				required: true,
				msg: 'Header can not be empty'
			},
			author: {
				required: true,
				msg: 'Author can not be empty'
			},
			body: {
				required: true,
				msg: 'Body can not be empty'
			}
		},

		defaults: {
			_id    : null,
			avatar : 'assets/img/placeholder_avatar.svg',
			body   : null
		}
	});

	// Collection with messages
	var MessagesCollection = Backbone.Collection.extend({
		model: MessageModel,
		url: '/api/messages'
	});

	// The view of single message
	var MessageView = Backbone.View.extend({
		tagName: 'li',
		template: _.template($('#message-item-template').html()),

		events: {
			'click .uk-close' : 'remove',
			'click .more'     : 'showBody',
			'click .edit'     : 'edit'
		},

		render: function () {
			this.$el
				.html(this.template($.extend(this.model.attributes, { showBody: this.model.showBody })))
				.attr('data-id', this.model.id);
			return this;
		},

		remove: function () {
			this.model.destroy();
		},

		showBody: function () {
			this.model.showBody = !this.model.showBody;
			if (!this.model.attributes.body) {
				this.model.fetch();
			} else {
				this.model.collection.trigger('sync');
			}
		},

		edit: function () {
			this.model.collection.trigger('edit', this.model);
		}
	});

	// The view of form with methods to create and edit messages
	var FormView = Backbone.View.extend({
		events: {
			'click #send-message'   : 'sendMessage',
			'click #apply-message'  : 'applyEdit',
			'click #cancel-message' : 'cancelEdit'
		},

		initialize: function () {
			this.model = new MessageModel();

			this.buttonSend   = this.$el.find('#send-message');
			this.buttonApply  = this.$el.find('#apply-message');
			this.buttonCancel = this.$el.find('#cancel-message');

			Backbone.Validation.bind(this);
		},

		sendMessage: function () {
			var data = {};
			$.each(this.$el.serializeArray(), function (index, elem) {
				data[elem.name] = elem.value;
			});

			this.model.set(data);

			if (!this.model.isValid(true)) {
				notify('Form incorrect', 'danger');
			} else {
				this.appView.model.create(data);
				this.clearForm();
				notify('Message successfully added', 'success');
			}
		},

		clearForm: function () {
			this.$el.find('input, textarea').val('');
		},

		startEdit: function (model) {
			var self = this;
			$.each([ 'header', 'author', 'body' ], function (index, name) {
				self.$el.find('[name="' + name + '"]').val(model.get(name));
			});
			this.buttonSend.addClass('uk-hidden');
			this.buttonApply.add(this.buttonCancel).removeClass('uk-hidden');
			this.modelEdit = model;
			this.$el.find('.uk-form-danger').removeClass('uk-form-danger');
			this.$el.find('.uk-form-help-inline').html('');
		},

		applyEdit: function () {
			var data = {};
			$.each(this.$el.serializeArray(), function (index, elem) {
				data[elem.name] = elem.value;
			});

			this.model.set(data);

			if (!this.model.isValid(true)) {
				notify('Form incorrect', 'danger');
			} else {
				this.modelEdit.set(data).save();
				this.cancelEdit();
				notify('Message successfully saved', 'success');
			}
		},

		cancelEdit: function () {
			this.clearForm();
			this.modelEdit = null;
			this.buttonSend.removeClass('uk-hidden');
			this.buttonApply.add(this.buttonCancel).addClass('uk-hidden');
		}
	});

	// Main app view
	var AppView = Backbone.View.extend({
		el: $('#app-outer'),

		initialize: function () {
			this.model = new MessagesCollection();

			this.messagesOuter = this.$el.find('#messages-outer');

			this.form = new FormView({
				el: this.$el.find('form')
			});
			this.form.appView = this;

			this.listenTo(this.model, 'add', this.addOne);
			this.listenTo(this.model, 'reset', this.addAll);
			this.listenTo(this.model, 'destroy', function (message) {
				this.getById(message.id).remove();
			});
			this.listenTo(this.model, 'sync', this.addAll);
			this.listenTo(this.model, 'edit', this.edit);

			this.model.fetch();
		},

		addOne: function(message) {
			if (message.id) {
				this.getById(message.id).remove();
				var view = new MessageView({ model: message });
				this.messagesOuter.append(view.render().el);
			}
		},

		addAll: function() {
			this.model.each(this.addOne, this);
		},

		edit: function (model) {
			if (model.attributes.body) {
				this.startEdit(model);
			} else {
				model.fetch();
				this.listenToOnce(model, 'sync', function () {
					this.startEdit(model);
				});
			}
		},

		startEdit: function (model) {
			$('html, body').animate({ scrollTop: this.form.$el.offset().top }, 300);
			this.form.startEdit(model);
		},

		getById: function (id, exists) {
			return this.messagesOuter.find('[data-id="' + id + '"]');
		}
	});

	var app = new AppView();

});