// src/js/config/handlebars.js
const path    = require('path');
const fs      = require('fs');
const exphbs  = require('express-handlebars');

// /* ------------------------------------------------------------------ */
// /*  1.  Helper to collect partial paths recursively                    */
// /* ------------------------------------------------------------------ */
// function gatherPartials(dir) {
//   const files = [];
//   (function walk(cur) {
//     fs.readdirSync(cur).forEach(f => {
//       const fp = path.join(cur, f);
//       fs.statSync(fp).isDirectory() ? walk(fp)
//                                     : files.push(fp);
//     });
//   })(dir);
//   return files;
// }

/* ------------------------------------------------------------------ */
module.exports = function (app) {
  const partialRoot = path.join(__dirname, '..', '..', 'views', 'partials');

  /* ---------------- express-handlebars instance ------------------- */
  const hbs = exphbs.create({
    extname    : 'hbs',
    layoutsDir : path.join(__dirname, '..', '..', 'views', 'layouts'),
    // give it the *list* of partial files so sub-folders work
    partialsDir: partialRoot,
  });

  /* ----------------------------------------------------------------
   * 2.  ALL your existing helpers (unchanged)
   * ---------------------------------------------------------------- */
  const _sections = {};
  hbs.handlebars.registerHelper('section', function (n, opts) {
    (_sections[n] = _sections[n] || []).push(opts.fn(this));
    return null;
  });
  hbs.handlebars.registerHelper('block', n => {
    const out = (_sections[n] || []).join('\n');
    _sections[n] = [];
    return new hbs.handlebars.SafeString(out);
  });
  hbs.handlebars.registerHelper('stringify', v => {
    try { return JSON.stringify(v, null, 2) || 'null'; }
    catch (e) { return `Error stringifying: ${e.message}`; }
  });

  hbs.handlebars.registerHelper('ifActive', (cur, link, o) =>
    cur.replace(/\/$/, '') === `/${link}` ? o.fn(this) : o.inverse(this));

  hbs.handlebars.registerHelper('equals', (a, b) => parseInt(a) === parseInt(b));
  hbs.handlebars.registerHelper('greaterThanZero', v => parseInt(v) > 0);
  hbs.handlebars.registerHelper('calculateProgress', c =>
    Math.min(100, (c / 10) * 100));

  hbs.handlebars.registerHelper('printTime', h => {
    if (h === null || h === undefined) return '';
    const hour = parseInt(h);
    return `${hour % 12 || 12} ${hour >= 12 ? 'PM' : 'AM'}`;
  });
  hbs.handlebars.registerHelper('firstLetter', s =>
    (typeof s === 'string' && s[0]) ? s[0].toUpperCase() : '');

  hbs.handlebars.registerHelper('range', n =>
    Array.from({ length: n }, (_, i) => i));

  ['lessThan','lessThanOrEqual','greaterThan'].forEach(fn => {
    const op = { lessThan:'<', lessThanOrEqual:'<=', greaterThan:'>' }[fn];
    hbs.handlebars.registerHelper(fn, (a, b) =>
      eval(`${parseInt(a)} ${op} ${parseInt(b)}`));   // eslint-disable-line no-eval
  });

  hbs.handlebars.registerHelper('calculateTotalCompletionsPercentage', t =>
    Math.min(100, (t / 100) * 100));

  hbs.handlebars.registerHelper('json', ctx => JSON.stringify(ctx));
  hbs.handlebars.registerHelper('eq', (a, b) => a === b);

  hbs.handlebars.registerHelper('includes', (col, item) => {
    if (typeof col === 'string')
      return col.split(',').map(i => i.trim()).includes(String(item));
    return col?.includes(item);
  });

  hbs.handlebars.registerHelper('math', (l, op, r) => {
    l = parseFloat(l); r = parseFloat(r);
    switch (op) { case '+': return l + r;
      case '-': return l - r;
      case '*': return l * r;
      case '/': return l / r;
      case '%': return l % r;
      default : return l; }
  });
  hbs.handlebars.registerHelper('subtract', (a, b) =>
    parseFloat(a) - parseFloat(b));

  /* ----------------------------------------------------------------
   * 3.  NEW switch/case/default helpers (used in sidebar/week.hbs)
   * ---------------------------------------------------------------- */
  hbs.handlebars.registerHelper('switch', function (value, options) {
    this._switch_value_ = value;            // store on context
    const html = options.fn(this);          // render inner block
    delete this._switch_value_;
    return html;
  });

  hbs.handlebars.registerHelper('case', function (value, options) {
    if (value === this._switch_value_) {
      return options.fn(this);
    }
    return '';
  });

  // default must come last
  hbs.handlebars.registerHelper('default', function (options) {
    if (!('_switch_found_' in this)) {
      this._switch_found_ = true;
      return options.fn(this);
    }
    return '';
  });

  /* ---------------------------------------------------------------- */
  app.engine('hbs', hbs.engine);
  app.set   ('view engine', 'hbs');
  app.set   ('views', path.join(__dirname, '..', '..', 'views'));
};
