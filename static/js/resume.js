var CSRF = $("input[name='_csrf']").val();
$.ajaxSetup({
  beforeSend: function(xhr, settings) {
    if (settings.crossDomain)
      return;
    if (settings.type == "GET")
      return;
    xhr.setRequestHeader('X-CSRF-Token', CSRF)
  }
});

if(!nunjucks.env) {
  nunjucks.env = new nunjucks.Environment(new nunjucks.HttpLoader('/views'));
}

nunjucks.env.addFilter('formatdate', function (rawDate) {
  if (parseInt(rawDate, 10) == rawDate) {
    var date = new Date(rawDate * 1000);
    return date.toString();
  }
  return rawDate;
});

!!function init(){

  var global = {
    dragging: false
  };

  var Badge = {};
  var Category = {};
  var Details = {};
  var Resume = {};

  var template = function template(name, data) {
    return $(nunjucks.env.render(name, $.extend(data, nunjucks.env.globals)));
  };

  var errHandler = function(model, xhr) {
    new Message.View().render({
      type: 'error',
      message:'There was a problem syncing your changes. Please refresh the page before making any new changes.'
    });
  };

  // Model Definitions
  // ----------------------
  Badge.Model = Backbone.Model.extend({
    urlRoot: '/badge'
  });

  Category.Model = Backbone.Model.extend({
    urlRoot: '/category',
    defaults: {
      name: 'New Category',
      classes: [ { name: 'newcategory' }]
    }
  });

  Resume.Model = Backbone.Model.extend({
    urlRoot: '/resumeInfo'
  });

  // Collection definitions
  // ----------------------
  Badge.Collection = Backbone.Collection.extend({
    model: Badge.Model,
    belongsTo: null
  });

  Category.Collection = Backbone.Collection.extend({
    model: Category.Model
  });

  Badge.Collection.saveParentCategory = function (badgeModel, badgeCollection) {
    if (!badgeCollection.belongsTo) return;
    badgeCollection.belongsTo.save(null, { error: errHandler });
  };

  Badge.Collection.prototype.on('add', Badge.Collection.saveParentCategory);

  Badge.Collection.prototype.on('remove', Badge.Collection.saveParentCategory);

  // View Definitions
  // ----------------------
  Resume.View = Backbone.View.extend({
    parent: $('#resumeInfo'),
    tagName: 'div',
    className: 'yui-gc',
    events: {
      'keyup input': 'checkDone',
      'focus input': 'storeCurrent',
      'blur input': 'saveResume'
    },

    storeCurrent: function(event) {
      var $el = $(event.currentTarget);
      $el.data('previously', $el.val());
    },

    checkDone: function(event) {
      var $el = $(event.currentTarget);

      switch (event.keyCode) {
        // enter key, user wants to save
        case 13:
          $el.trigger('blur');
          break;

        // escape key, user wants to revert changes
        case 27:
          $el.val($el.data('previously'));
          $el.trigger('blur');
          break;
      }
    },

    saveResume: function(event) {
      var $el = $(event.currentTarget);
      var newVal = $el.val();
      var oldVal = $el.data('previously');

      // Bail early if the name didn't change.
      if (newVal === oldVal) return;

      switch ($el.attr('class')) {
        case 'resumeFullName':
          this.model.set({ fullName: newVal });
          break;
        case 'resumeTitle':
          this.model.set({ title: newVal });
          break;
        case 'resumeEmail':
          this.model.set({ email: newVal });
          break;
        case 'resumePhone':
          this.model.set({ phone: newVal });
          break;
        default:
          return;
      }

      this.model.save(null, { error: errHandler });
    }

  });

  Category.View = Backbone.View.extend({
    parent: $('#categories'),
    tagName: "div",
    className: "yui-gf",
    events: {
      'keyup input': 'checkDone',
      'focus input': 'storeCurrent',
      'blur input': 'saveName',
      'dragover': 'nothing',
      'dragenter': 'nothing',
      'drop': 'badgeDrop'
    },

    nothing: function (event) {
      event.preventDefault();
    },

    initialize: function() {
      Category.View.all[this.model.id] = this;
    },

    storeCurrent: function(event) {
      var $el = $(event.currentTarget);
      $el.data('previously', $el.val());
    },

    checkDone: function(event) {
      var $el = $(event.currentTarget);

      switch (event.keyCode) {
        // enter key, user wants to save
        case 13:
          $el.trigger('blur');
          break;

        // escape key, user wants to revert changes
        case 27:
          $el.val($el.data('previously'));
          $el.trigger('blur');
          break;
      }
    },

    saveName: function(event) {
      var $el = $(event.currentTarget);
      var newName = $el.val();
      var oldName = $el.data('previously');

      // Bail early if the name didn't change.
      if (newName === oldName) return;

      this.model.set({ name: newName });
      this.model.save(null, { error: errHandler });
    },

    badgeDrop: function(event) {
      var view = global.dragging;
      var badge = view.model;
      var collection = this.model.get('badges');

      // prevent bug in firefox: https://bugzilla.mozilla.org/show_bug.cgi?id=727844
      event.preventDefault();
      event.stopPropagation();

      if (collection.get(badge)) {
        return;
      }

      return this.moveExisting(event, badge);
    },

    moveExisting: function(event, badge) {
      var badgeView = global.dragging;
      var oldCollectionId = badge.collection.belongsTo.id;
      badge.collection.remove(badge);
      this.model.get('badges').add(badge);
      badgeView.addToCategory(this.model.get('id'));
      this.render();
      Category.View.all[oldCollectionId].render();

    },

    render: function() {
      console.log('Rendering ' + this.model.attributes.name);
      var newEl = template('category-template.html', {
        attributes: this.model.attributes
      });

      this.$el.html(newEl.html());

      var badgeElements = this.$el.find('.badge');
      _.map(badgeElements, function(badgeElement) {
        var badgeId = $(badgeElement).data('id');
        Badge.View.all[badgeId].setElement(badgeElement);
      });

      return this;
    }
  });

  Badge.View = Backbone.View.extend({
    tagName: "a",
    className: "badge",
    detailsView: null,
    events: {
      'click' : 'showDetails',
      'dragstart' : 'start'
    },

    initialize: function () {
      Badge.View.all[this.model.id] = this;
    },

    showDetails: function (event) {
      this.detailsView.show();
    },

    start : function (event) {
      global.dragging = this;
      console.log('Dragging ' + this.model.attributes.assertion.badge.name);
      event.stopPropagation();
    },

    /**
     * Render this sucker.
     */
    render: function () {
      this.el = template('badges_partial.html', this.model.attributes);
      this.$el.data('view', this);
      this.setElement($(this.el));
      this.attachToExisting($(this.el));
      return this;
    },

    attachToExisting: function (el) {
      this.detailsView = new Details.View({ model: this.model });
      this.detailsView.render();
      this.setElement($(el));
      return this;
    },

    remove: function () {
      Backbone.View.prototype.remove.call(this);
    },

    addToCategory: function (categoryId) {
      this.model.set({ categoryId: categoryId });
      this.model.save(null, { error: errHandler });
    }
  });

  Badge.View.all = [];
  Category.View.all = [];

  Details.View = Backbone.View.extend({
    badgeView: null,
    events: {
      'click .close': 'hide',
      'click .background': 'hide',
      'mousedown .close': 'nothing'
    },

    nothing: function (event) {
      event.preventDefault();
      event.stopPropagation();
    },

    hide: function() {
      this.$el
        .stop()
        .fadeOut('fast', function () {
          $(this).detach()
        });
      return false;
    },

    show: function () {
      this.$el
        .hide()
        .appendTo($('body'))
        .fadeIn('fast');
    },

    render: function () {
      this.el = template('badge-details.html', {
        badge: {
          attributes: this.model.attributes
        },
        disownable: true
      });
      this.setElement(this.el);
      return this;
    }
  });

  var allCategories = new Category.Collection();
  var resumeModel;

  Resume.fromElement = function(element) {
    var $el = $(element);

    resumeModel = new Resume.Model({
      id: $el.data('id'),
      fullName: $el.find('.resumeFullName').val(),
      title: $el.find('.resumeTitle').val(),
      email: $el.find('.resumeEmail').val(),
      phone: $el.find('.resumePhone').val()
    });

    new Resume.View({ model: resumeModel }).setElement($el);
  };

  Category.fromElement = function(element) {
    var $el = $(element);

    var badgeElements = $el.find('.badge');
    var categoryBadges = new Badge.Collection(_.map(badgeElements, Badge.fromElement));

    var model = new Category.Model({
      id: $el.data('id'),
      name: $el.find('.categoryName').val(),
      badges: categoryBadges
    });
    categoryBadges.belongsTo = model;
    allCategories.add(model);
    new Category.View({ model: model }).setElement($el);
  };

  Badge.fromElement = function(element) {
    var $el = $(element);
    var model = new Badge.Model(window.badgeData[$el.data('id')]);
    new Badge.View({ model: model }).attachToExisting($el);
    return model;
  };

// creating models from html on the page
  var existingCategories = $('#categories').find('.category');
//  var existingBadges = $('#categories').find('.badge');
  var existingResume = $('#resumeInfo');
  _.each(existingCategories, Category.fromElement);
//  _.each(existingBadges, Badge.fromElement);
  Resume.fromElement(existingResume[0]);

  window.Category = Category;
}();