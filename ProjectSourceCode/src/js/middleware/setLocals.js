// src/js/middleware/setLocals.js
module.exports = (req, res, next) => {
    res.locals.currentPath = req.path;
    next();
  };