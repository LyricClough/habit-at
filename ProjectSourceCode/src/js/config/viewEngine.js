// src/js/config/handlebars.js
const path = require('path');
const exphbs = require('express-handlebars');

module.exports = function(app) {
  const hbs = exphbs.create({
    extname: 'hbs',
    layoutsDir: path.join(__dirname, '..','..','views','layouts'),
    partialsDir: path.join(__dirname, '..','..','views','partials'),
  });

  hbs.handlebars.registerHelper('ifActive', (currentPath, linkPath, opts) => {
    const active = currentPath.replace(/\/$/, '') === `/${linkPath}`;
    return active ? opts.fn(this) : opts.inverse(this);
  });
  
  // Helper for comparing values
  hbs.handlebars.registerHelper('equals', function(a, b) {
    return parseInt(a) === parseInt(b);
  });
  
  // Helper for checking if value is greater than zero
  hbs.handlebars.registerHelper('greaterThanZero', function(value) {
    return parseInt(value) > 0;
  });
  
  // Helper for calculating progress percentage
  hbs.handlebars.registerHelper('calculateProgress', function(counter) {
    const maxCount = 10; // Arbitrary max for progress bar
    return Math.min(100, (counter / maxCount) * 100);
  });
  
  // Helper for formatting time
  hbs.handlebars.registerHelper('printTime', function(hour) {
    if (hour === null || hour === undefined) return '';
    
    const h = parseInt(hour);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    
    return `${hour12} ${period}`;
  });

  app.engine('hbs', hbs.engine);
  app.set('view engine', 'hbs');
  app.set('views', path.join(__dirname, '..','..','views'));
};