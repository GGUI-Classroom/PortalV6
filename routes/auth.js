'use strict';

const express = require('express');
const router = express.Router();

// GET /login
router.get('/login', (req, res) => {
  if (req.session.user) {
    return req.session.user.role === 'owner'
      ? res.redirect('/owner/dashboard')
      : res.redirect('/employee/suggest-website');
  }
  res.render('login', { title: 'Login — G.GUI Dev Portal', error: null });
});

// POST /login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  const OWNER_USERNAME = process.env.OWNER_USERNAME || 'owner';
  const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'ownerpass';
  const EMP_USERNAME   = process.env.EMP_USERNAME   || 'employee';
  const EMP_PASSWORD   = process.env.EMP_PASSWORD   || 'emppass';

  if (!username || !password) {
    return res.render('login', { title: 'Login — G.GUI Dev Portal', error: 'Username and password are required.' });
  }

  const u = username.trim();

  if (u === OWNER_USERNAME && password === OWNER_PASSWORD) {
    req.session.user = { username: u, role: 'owner' };
    return res.redirect('/owner/dashboard');
  }

  if (u === EMP_USERNAME && password === EMP_PASSWORD) {
    req.session.user = { username: u, role: 'employee' };
    return res.redirect('/employee/suggest-website');
  }

  return res.render('login', { title: 'Login — G.GUI Dev Portal', error: 'Invalid username or password.' });
});

// GET /logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
