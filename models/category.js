const mysql = require('../lib/mysql');
const request = require('request');
const configuration = require('../lib/configuration');
const async = require('async');

var Base = require('./mysql-base');

var Category = function (attributes) {
  this.attributes = attributes;
};

Base.apply(Category, 'category');

Category.findOrCreate = function(name, userId, callback) {
  var newCategory = new Category({ name: name, user_id: userId});
  Category.findOne({ name: name, user_id: userId}, function (err, category) {
    if (err) { return callback(err); }
    if (category) { return callback(null, category); }
    else { return newCategory.save(callback); }
  });
};

pushToData = function(resumeData, category, callback) {
  resumeData.categories.push( { id: category.attributes.id, name: category.attributes.name, badges: [ ]} );
  return callback();
};

Category.getUserCategories = function(resumeData, userId, callback) {
  Category.find({ user_id: userId }, function (err, categories) {
    if (err) {
      return callback(err);
    }
    else {
      return async.each(categories, async.apply(pushToData, resumeData), function(err) {
        if (err) {
          return callback(err);
        }

        return callback();
      });
    }
  });
};

module.exports = Category;