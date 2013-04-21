const mysql = require('../lib/mysql');
const request = require('request');
const configuration = require('../lib/configuration');
const async = require('async');

var Base = require('./mysql-base');
var Category = require('./category');

var Resume = function (attributes) {
  this.attributes = attributes;
};

Base.apply(Resume, 'resume');

Resume.findOrCreate = function(userId, callback) {
  var newResume = new Resume({ user_id: userId, name: 'Your Name', display_email: 'youremail@fake.com', phone: '(555) - 555-5555', title: 'Your Title'});
  Resume.findOne({ user_id: userId}, function (err, category) {
    if (err) { return callback(err); }
    if (category) { return callback(null, category); }
    else { return newResume.save(callback); }
  });
};

pushToData = function(resumeData, category, callback) {
  resumeData.categories.push( { id: category.attributes.id, name: category.attributes.name, badges: [ ]} );
  return callback();
};

Resume.getUserResume = function(resumeData, userId, callback) {
  Resume.findOrCreate(userId, function (err, resume) {
    if (err) {
      return callback(err);
    }
    else {
      resumeData.resumeId = resume.attributes.id;
      resumeData.fullName = resume.attributes.name;
      resumeData.email = resume.attributes.display_email;
      resumeData.title = resume.attributes.title;
      resumeData.phone = resume.attributes.phone;

      Category.getUserCategories(resumeData, userId, callback);
    }
  });
};

module.exports = Resume;