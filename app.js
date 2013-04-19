var express = require('express');
var http = require('http');
var path = require('path');
var nunjucks = require('nunjucks');
var middleware = require('./middleware');
var logger = require('./lib/logging').logger;
var configuration = require('./lib/configuration');
var flash = require('connect-flash');

var app = express();
app.logger = logger;
app.config = configuration;

app.locals({
  error: [],
  success: []
});

var env = new nunjucks.Environment(new nunjucks.FileSystemLoader(__dirname + '/views'));
env.express(app);

app.use(middleware.less(app.get('env')));
app.use(express.static(path.join(__dirname + '/static')));
app.use('/views', express.static(path.join(__dirname + '/views')));
app.use(middleware.noFrame({ whitelist: [ ] }));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.methodOverride());
app.use(middleware.logRequests());
app.use(middleware.cookieSessions());
app.use(middleware.userFromSession());
app.configure('development', function () {
  var testUser = process.env['BADGERESUME_TEST_USER'];
  if (testUser)
    app.use(middleware.testUser(testUser));
});
app.use(flash());
app.use(middleware.csrf({ whitelist: [ ] }));
app.use(middleware.cors({ whitelist: [ ] }));
app.use(app.router);
app.use(express.errorHandler());

const resume = require('./controllers/resume');
const category = require('./controllers/category');

app.param('categoryId', category.findById);

app.get('/', resume.show);
app.get('/login', resume.login);
app.post('/authenticate', resume.authenticate);
app.get('/resume/:userId', resume.showStatic);

//app.put('/resume/:userId', resume.update);

//app.post('/category', category.create);
app.put('/category/:categoryId', category.update);

app.listen(8080);
