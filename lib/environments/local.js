var path = require('path');
exports.config = {
  // either http or https
  protocol: 'http',

  hostname: 'resume.fatticus.net',

  port: 8080,

  var_path: path.join(__dirname, '../../var'),

  admins: ['example@example.com'],

  database: {
    driver: 'mysql',
    host: '127.0.0.1',
    user: 'resumemaker',
    password: 'secret',
    database: 'badgeresume'
  },

  identity: {
    protocol: 'https',
    server: 'verifier.login.persona.org',
    path: '/verify'
  },

  less: {
    once: false,
    compress: "auto",
    force: true
  },

  nunjucks_precompiled: false,

  backpack_url: 'beta.openbadges.org',

  email_convert_url: 'beta.openbadges.org/displayer/convert/email',

  backpack_collections: ['employment', 'employment2', 'education', 'experience', 'experience2', 'experience3', 'resume']

}