var Category = require('../models/category.js');
var logger = require('../lib/logging').logger;

exports.findById = function findById(req, res, next, id) {
  Category.findById(id, function (err, category) {
    if (err) {
      logger.error("Error pulling category: " + err);
      return res.send({
        status: 'error',
        error: 'Error pulling category'
      }, 500);
    }

    if (!category)
      return res.send({
        status: 'missing',
        error: 'Could not find category'
      }, 404);

    req.category = category;
    return next();
  });
};

exports.update = function (request, response) {
  if (!request.user)
    return response.send({
      status: 'forbidden',
      error: 'user required'
    }, 403);

  if (!request.category)
    return response.send({
      status: 'missing-required',
      error: 'missing category to update'
    }, 404);

  if (request.user.get('id') !== request.category.get('user_id'))
    return response.send({
      status: 'forbidden',
      error: 'you cannot modify a category you do not own'
    }, 403);

  if (!request.body)
    return response.send({
      status: 'missing-required',
      error: 'missing fields to update'
    }, 400);

  var category = request.category;
  var body = request.body;

  if (body.name) {
    var saferName = body.name.replace('<', '&lt;').replace('>', '&gt;');
    category.set('name', saferName);
  }


  category.save(function (err) {
    if (err) {
      logger.debug('there was an error updating a category:');
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