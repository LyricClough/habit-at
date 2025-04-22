// src/js/config/handlebars.js
const path = require('path');
const exphbs = require('express-handlebars');

module.exports = function(app) {
  const hbs = exphbs.create({
    extname: 'hbs',
    layoutsDir: path.join(__dirname, '..','..','views','layouts'),
    partialsDir: path.join(__dirname, '..','..','views','partials'),
  });

  // Store for sections content
  const _sections = {};
  
  // Section helper for defining content sections
  hbs.handlebars.registerHelper('section', function(name, options) {
    if (!_sections[name]) {
      _sections[name] = [];
    }
    
    _sections[name].push(options.fn(this));
    return null;
  });
  
  // Block helper for retrieving and rendering sections
  hbs.handlebars.registerHelper('block', function(name) {
    const val = (_sections[name] || []).join('\n');
    // Clear the section after retrieval
    _sections[name] = [];
    return new hbs.handlebars.SafeString(val);
  });

  // Helper for debugging - stringify any value for display
  hbs.handlebars.registerHelper('stringify', function(value) {
    try {
      return JSON.stringify(value, null, 2) || 'null';
    } catch (error) {
      return `Error stringifying: ${error.message}`;
    }
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

  // Helper for creating an array of numbers (range)
  hbs.handlebars.registerHelper('range', function(n) {
    const result = [];
    for (let i = 0; i < n; i++) {
      result.push(i);
    }
    return result;
  });

  // Helper for checking if a value is less than another
  hbs.handlebars.registerHelper('lessThan', function(a, b) {
    return parseInt(a) < parseInt(b);
  });

  // Helper for checking if a value is less than or equal to another
  hbs.handlebars.registerHelper('lessThanOrEqual', function(a, b) {
    return parseInt(a) <= parseInt(b);
  });

  // Helper for checking if a value is greater than another
  hbs.handlebars.registerHelper('greaterThan', function(a, b) {
    return parseInt(a) > parseInt(b);
  });

  // Helper for calculating total completions percentage
  hbs.handlebars.registerHelper('calculateTotalCompletionsPercentage', function(total) {
    // Target is arbitrary - could be set to a user goal
    const target = 100;
    return Math.min(100, (total / target) * 100);
  });
  
  // Helper for JSON stringification in templates
  hbs.handlebars.registerHelper('json', function(context) {
    return JSON.stringify(context);
  });

  app.engine('hbs', hbs.engine);
  app.set('view engine', 'hbs');
  app.set('views', path.join(__dirname, '..','..','views'));
};