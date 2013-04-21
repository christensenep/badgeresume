const crypto = require('crypto');
const regex = require('../lib/regex');
const mysql = require('../lib/mysql');
const request = require('request');
const configuration = require('../lib/configuration');
const async = require('async');

var Base = require('./mysql-base');
var Category = require('./category');
var Resume = require('./resume');
var Badge = require('./badge');

function isObject(thing) {
  return Object.prototype.toString.call(thing) === '[object Object]';
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function safeJsonParse(str) {
  if (isObject(str))
    return str;
  try {
    return JSON.parse(str);
  } catch (_) {
    return undefined;
  }
}

var User = function (attributes) {
  this.attributes = attributes;
  this.setLoginDate = function () {
    this.set('last_login', Math.floor(Date.now() / 1000));
  };
};

Base.apply(User, 'user');


User.prototype.getResumeData = function(callback) {
  var resumeData = {
    resumeId : '',
    fullName : '',
    title : '',
    email : '',
    phone : '',
    categories : [ ],
    badges: [ ]
  };

  const userID = this.attributes.id;

  request.post('http://' + configuration.get('email_convert_url'), {form:{email:this.attributes.email}}, function (err, response, body) {
    if (err) {
      return callback(err);
    }

    const conversionResult = safeJsonParse(body);

    var backpackUserID = conversionResult.userId;

    return Badge.getUserBadges(resumeData, userID, backpackUserID, function() {
      Resume.getUserResume(resumeData, userID, function() {
        return callback(null, resumeData);
      });
    });
  });
};

User.findOrCreate = function(email, callback) {
  var newUser = new User({ email: email });
  User.findOne({ email: email }, function (err, user) {
    if (err) { return callback(err); }
    if (user) { return callback(null, user); }
    else {
      var addCategories = function(err, user) {
        if (err) { return callback(err); }

        var addCategory = function(categoryName, innerCallback) {
          Category.findOrCreate(categoryName, user.attributes.id, function(err, category) {
            if (err) {
              return innerCallback(err);
            }

            innerCallback();
          });
        };

        return async.each(['First Category', 'Second Category', 'Third Category'], addCategory, function(err) {
          if (err) {
            return callback(err);
          }
          return callback(null);
        });
      };

      return newUser.save(addCategories);
    }
  });
};

User.validators = {
  email: function (value) {
    if (!regex.email.test(value)) { return "invalid value for required field `email`"; }
  }
};

// callback has the signature (err, numberOfUsers)
User.totalCount = function(callback) {
  User.findAll(function(err, users) {
    if (err) {
      return callback(err, null);
    }
    return callback(null, users.length);
  })
}


module.exports = User;