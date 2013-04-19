var userID = 33953;
var numColumns = 4;
var backpackSite = 'beta.openbadges.org'
var userUrl = 'http://' + backpackSite + '/displayer/' + userID + '/groups.json';

var CSRF = $("input[name='_csrf']").val();
$.ajaxSetup({
  beforeSend: function (xhr, settings) {
    if (settings.crossDomain)
      return;
    if (settings.type == "GET")
      return;
    xhr.setRequestHeader('X-CSRF-Token', CSRF)
  }
})

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

  var Badge = {};
  var Category = {};
  var Details = {};

  var template = function template(name, data) {
    return $(nunjucks.env.render(name, $.extend(data, nunjucks.env.globals)));
  };

  var errHandler = function (model, xhr) {
    new Message.View().render({
      type: 'error',
      message:'There was a problem syncing your changes. Please refresh the page before making any new changes.'
    });
  };

  // Model Definitions
  // ----------------------
  Badge.Model = Backbone.Model.extend({
    urlRoot: '/badge',
  });

  Category.Model = Backbone.Model.extend({
    urlRoot: '/category',
    defaults: {
      name: 'New Category',
      classes: [ { name: 'newcategory' }]
    }
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

  // View Definitions
  // ----------------------
  Category.View = Backbone.View.extend({
    parent: $('#categories'),
    tagName: "div",
    className: "yui-gf",
    events: {
      'keyup input': 'checkDone',
      'focus input': 'storeCurrent',
      'blur input': 'saveName',
    },



    storeCurrent: function (event) {
      var $el = $(event.currentTarget);
      $el.data('previously', $el.val());
    },

    checkDone: function (event) {
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

    saveName: function (event) {
      var $el = $(event.currentTarget)
      var newName = $el.val()
      var oldName = $el.data('previously')

      // Bail early if the name didn't change.
      if (newName === oldName) return;

      this.model.set({ name: newName });
      this.model.save(null, { error: errHandler });
    },

    render: function () {
      this.el = template('group-template.html', this.model.attributes);
      this.setElement($(this.el));
      this.$el
        .hide()
        .appendTo(this.parent)
        .fadeIn();
      return this;
    }
  });

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
      this.$el.data('view', this);
      return this;
    }
  });

  Badge.View = Backbone.View.extend({
    tagName: "a",
    className: "badge",
    detailsView: null,
    events: {
      'click' : 'showDetails'
    },

    initialize: function () {
      Badge.View.all.push(this);
    },

    showDetails: function (event) {
      this.detailsView.show();
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
//      $(el).popover({
//        animation:false,
//        trigger: 'hover',
//        html: true
//      });
      return this;
    },

    remove: function () {
//      this.$el.popover('hide');
      Backbone.View.prototype.remove.call(this);
    }
  });

  Badge.View.all = [];

  var AllCategories = new Category.Collection();
  var AllBadges = new Badge.Collection();

  Category.fromElement = function (element) {
    var $el = $(element);

    var model = new Category.Model({
      id: $el.data('id'),
      name: $el.find('.categoryName').text()
    });

    AllCategories.add(model);
    new Category.View({ model: model }).setElement($el);
  };

  Badge.fromElement = function (element) {
    var $el = $(element);
    var model = new Badge.Model(window.badgeData[$el.data('id')]);
    new Badge.View({ model: model }).attachToExisting($el);
    if (!AllBadges.get(model.id)) AllBadges.add(model);
    return model;
  };

// creating models from html on the page
  var existingCategories = $('#categories').find('.category');
  var existingBadges = $('#categories').find('.badge');
  _.each(existingCategories, Category.fromElement);
  _.each(existingBadges, Badge.fromElement);

  window.Category = Category;
}()