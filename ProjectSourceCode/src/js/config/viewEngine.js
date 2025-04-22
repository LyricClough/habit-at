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

  hbs.handlebars.registerHelper('range', (start, end) => {
    const result = [];
    for (let i = start; i <= end; i++) {
      result.push(i);
    }
    return result;
  });

  hbs.handlebars.registerHelper('getHabit', (calendarData, day, hour) => {
    if (!Array.isArray(calendarData)) return null;
    const hourRow = calendarData[hour];
    if (!hourRow || typeof hourRow !== 'object') return null;
    return hourRow[day] || null;
  });
  
  hbs.handlebars.registerHelper('habitsForDay', (habits, weekdayIndex, options) => {
    if (!Array.isArray(habits)) return '';
  
    const dayHabits = habits
      .filter(h => h.weekday === weekdayIndex)
      .sort((a, b) => a.time_slot - b.time_slot);
  
    return dayHabits.map(habit => options.fn(habit)).join('');
  });

  app.engine('hbs', hbs.engine);
  app.set('view engine', 'hbs');
  app.set('views', path.join(__dirname, '..','..','views'));
};