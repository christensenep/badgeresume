const browserid = require('../lib/browserid');
const configuration = require('../lib/configuration');
const logger = require('../lib/logging').logger;

var User = require('../models/user');
var Resume = require('../models/resume');

function showResume(request, response, resumeData)
{
  var error = request.flash('error');
  var success = request.flash('success');

  resumeData.badges.sort(function(a,b){return a.id- b.id});
  resumeData.badges.forEach(function(badge) {
    badge.serializedAttributes = JSON.stringify(badge);
    if (badge.categoryId) {
      for (var i = 0; i < resumeData.categories.length; i++) {
        if (resumeData.categories[i].id === badge.categoryId) {
          resumeData.categories[i].badges.push( { id: badge.id, imageUrl: badge.imageUrl, name: badge.assertion.badge.name } );
          break;
        }
      }
    }
    else {
      if (resumeData.categories.length > 0) {
        badge.categoryId = resumeData.categories[0].id;
        resumeData.categories[0].badges.push( { id: badge.id, imageUrl: badge.imageUrl, name: badge.assertion.badge.name } );
      }
    }
  });

  response.render('resume.html', {
    error: error,
    success: success,
    resumeData: resumeData,
    csrfToken: request.session._csrf
  });
};

exports.show = function (request, response, next) {
  var user = request.user;
  if (!user)
    return response.redirect(303, '/login');

  function startResponse () {
    return user.getResumeData(function(err, resumeData) {
      if (err) return next(err);
      return showResume(request, response, resumeData);
    });
  }

  return startResponse();
};

exports.showStatic = function (request, response, next) {
  User.findOne({ id: request.params.userId }, function (err, resumeUser) {
    if (err || !resumeUser) {
      return err;
    }

    return resumeUser.getResumeData(function(err, resumeData) {
      if (err) return next(err);
      return showResume(request, response, resumeData);
    });
  });
};
/**
 * Render the login page.
 */

exports.login = function login(request, response) {
  if (request.user)
    return response.redirect(303, '/');
  // request.flash returns an array. Pass on the whole thing to the view and
  // decide there if we want to display all of them or just the first one.
  response.render('login.html', {
    error: request.flash('error'),
    csrfToken: request.session._csrf
  });
};

/**
 * Authenticate the user using a browserID assertion.
 *
 * @param {String} assertion returned by browserID login
 * @return {HTTP 303}
 *   on error: redirect one page back
 *   on success: redirect to `backpack.manage`
 */

exports.authenticate = function authenticate(req, res) {
  function formatResponse(to, apiError, humanReadableError) {
    const preferJsonOverHtml = req.accepts('html, json') === 'json';
    if (preferJsonOverHtml) {
      if (apiError)
        return res.send(400, {status: 'error', reason: apiError});
      return res.send(200, {status: 'ok', email: req.session.emails[0]});
    }
    if (humanReadableError)
      req.flash('error', humanReadableError);
    return res.redirect(303, to);
  }

  const assertion = req.body && req.body.assertion;
  const verifierUrl = browserid.getVerifierUrl(configuration);
  const audience = browserid.getAudience(req);

  if (!assertion)
    return formatResponse('/backpack/login', "assertion expected");

  browserid.verify({
    url: verifierUrl,
    assertion: assertion,
    audience: audience,
  }, function (err, email) {
    if (err) {
      logger.error('Failed browserID verification: ');
      logger.debug('Code: ' + err.code + "; Extra: " + err.extra);
      return formatResponse('back', "browserID verification failed: " + err.message,
        "Could not verify with browserID!");
    }

    req.session.emails = [email];
    return formatResponse('/');
  });
};

exports.findById = function findById(req, res, next, id) {
  Resume.findById(id, function (err, resume) {
    if (err) {
      logger.error("Error pulling resume: " + err);
      return res.send({
        status: 'error',
        error: 'Error pulling resume'
      }, 500);
    }

    if (!resume)
      return res.send({
        status: 'missing',
        error: 'Could not find resume'
      }, 404);

    req.resume = resume;
    return next();
  });
};


exports.update = function (request, response) {
  if (!request.user)
    return response.send({
      status: 'forbidden',
      error: 'user required'
    }, 403);

  if (!request.resume)
    return response.send({
      status: 'missing-required',
      error: 'missing resume to update'
    }, 404);

  if (request.user.get('id') !== request.resume.get('user_id'))
    return response.send({
      status: 'forbidden',
      error: 'you cannot modify a resume you do not own'
    }, 403);

  if (!request.body)
    return response.send({
      status: 'missing-required',
      error: 'missing fields to update'
    }, 400);

  var resume = request.resume;
  var body = request.body;

  var sanitizeData = function(dataString) {
    return dataString.replace('<', '&lt;').replace('>', '&gt;');
  };

  if (body.fullName) {
    resume.set('name', sanitizeData(body.fullName));
  }

  if (body.title) {
    resume.set('title', sanitizeData(body.title));
  }

  if (body.email) {
    resume.set('display_email', sanitizeData(body.email));
  }

  if (body.phone) {
    resume.set('phone', sanitizeData(body.phone));
  }


  resume.save(function (err) {
    if (err) {
      logger.debug('there was an error updating a resume:');
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

