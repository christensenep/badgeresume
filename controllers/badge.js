const logger = require('../lib/logging').logger;

var Badge = require('../models/badge.js');


exports.findById = function findById(req, res, next, id) {
  Badge.findById(id, function (err, badge) {
    if (err) {
      logger.error("Error pulling badge: " + err);
      return res.send({
        status: 'error',
        error: 'Error pulling badge'
      }, 500);
    }

    if (!badge)
      return res.send({
        status: 'missing',
        error: 'Could not find badge'
      }, 404);

    req.badge = badge;
    return next();
  });
};

exports.update = function (request, response) {
  if (!request.user)
    return response.send({
      status: 'forbidden',
      error: 'user required'
    }, 403);

  if (!request.badge)
    return response.send({
      status: 'missing-required',
      error: 'missing badge to update'
    }, 404);

  if (request.user.get('id') !== request.badge.get('user_id'))
    return response.send({
      status: 'forbidden',
      error: 'you cannot modify a badge you do not own'
    }, 403);

  if (!request.body)
    return response.send({
      status: 'missing-required',
      error: 'missing fields to update'
    }, 400);

  var badge = request.badge;
  var body = request.body;

  if (body.categoryId) {
    badge.set('category_id', body.categoryId);
  }


  badge.save(function (err) {
    if (err) {
      logger.debug('there was an error updating a badge:');
      logger.debug(err);
      return response.send({
        status: 'error',
        error: 'there was an unknown error. it has been logged.'
      }, 500);
    }

    response.contentType('json');
    response.send({status: 'okay'});
  });
};