'use strict';

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}

function requireOwner(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  if (req.session.user.role !== 'owner') {
    return res.status(403).render('403', { title: '403 — Access Denied' });
  }
  next();
}

module.exports = { requireLogin, requireOwner };
