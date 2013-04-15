const mysql = require('../lib/mysql');
const request = require('request');
const configuration = require('../lib/configuration');
const async = require('async');

var Base = require('./mysql-base');

function isObject(thing) {
  return Object.prototype.toString.call(thing) === '[object Object]';
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

var Badge = function (attributes) {
  this.attributes = attributes;
};

Base.apply(Badge, 'badge');

Badge.findOrCreate = function(hostedUrl, userId, callback) {
  var newBadge = new Badge({ hosted_url: hostedUrl, user_id: userId});
  Badge.findOne({ hosted_url: hostedUrl, user_id: userId}, function (err, badge) {
    if (err) { return callback(err); }
    if (badge) { return callback(null, badge); }
    else { return newBadge.save(callback); }
  });
};

Badge.getUserBadges = function(resumeData, userID, backpackUserID, callback) {

  request.get('http://' + configuration.get('backpack_url') + '/displayer/' +  backpackUserID + '/groups.json', function (err, response, body) {
    if (err) {
      return callback(err);
    }

    const allGroupsResult = safeJsonParse(body);

    return async.each(allGroupsResult.groups, async.apply(processGroup, resumeData, userID, backpackUserID), function(err) {
      return callback(err);
    });
  });
};

function processGroup(resumeData, userID, backpackUserID, group, callback)
{
  const groupsOfInterest = configuration.get('backpack_collections');

  if (group.badges === 0 || groupsOfInterest.indexOf(group.name.toLowerCase()) === -1) {
    return callback(null);
  }
  else {
    return request.get('http://' + configuration.get('backpack_url') + '/displayer/' + backpackUserID + '/group/' + group.groupId + '.json', function(err, response, body) {
      if (err) {
        return callback(err);
      }

      var groupResult = safeJsonParse(body);

      return async.each(groupResult.badges, async.apply(processBadge, resumeData, userID), function(err) {
        if (err) {
          return callback(err);
        }
        return callback(null);
      });
    });
  }
}

function processBadge(resumeData, userID, badgeData, callback)
{
    return Badge.findOrCreate(badgeData.hostedUrl, userID, function(err, badge) {
      if (err) {
        return callback(err);
      }

      badgeData.id = badge.attributes.id;
      badgeData.categoryId = badge.attributes.category_id;
      resumeData.badges.push(badgeData);

      return callback(null);
    });
}


module.exports = Badge;