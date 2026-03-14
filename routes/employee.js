'use strict';

const express = require('express');
const router  = express.Router();
const { requireLogin } = require('./middleware');
const db      = require('../data/db');
const { generateId, sanitize, validateLength } = require('./helpers');

router.use(requireLogin);

// Notifications
router.get('/notifications', (req, res) => {
  const notifications = db.getNotificationsFor(req.session.user.username);
  db.markAllNotificationsRead(req.session.user.username);
  res.render('employee/notifications', {
    title: 'Notifications',
    activePage: 'notifications',
    notifications
  });
});

// Suggest Website
router.get('/suggest-website', (req, res) => {
  res.render('employee/suggest-website', { title: 'Suggest a Website', activePage: 'suggest-website', flash: null, error: null });
});
router.post('/suggest-website', (req, res) => {
  const { name, url, description, priority, notes } = req.body;
  const errors = [];
  if (!name || !sanitize(name)) errors.push('Game/website name is required.');
  if (!url || !sanitize(url)) errors.push('URL is required.');
  if (!description || !sanitize(description)) errors.push('Description is required.');
  if (!priority || !['Low','Medium','High'].includes(priority)) errors.push('Priority is required.');
  if (!validateLength(name, 100)) errors.push('Name too long.');
  if (!validateLength(url, 300)) errors.push('URL too long.');
  if (!validateLength(description, 1000)) errors.push('Description too long.');
  if (errors.length) return res.render('employee/suggest-website', { title: 'Suggest a Website', activePage: 'suggest-website', flash: null, error: errors.join(' ') });
  const entry = { id: generateId(), submitter: req.session.user.username, name: sanitize(name), url: sanitize(url), description: sanitize(description), priority, notes: notes ? sanitize(notes).substring(0,500) : '', createdAt: new Date().toISOString() };
  db.addWebsiteSuggestion(entry);
  res.render('employee/suggest-website', { title: 'Suggest a Website', activePage: 'suggest-website', flash: `✓ Website suggestion for "${entry.name}" submitted!`, error: null });
});

// Suggest Feature
router.get('/suggest-feature', (req, res) => {
  res.render('employee/suggest-feature', { title: 'Suggest a Feature', activePage: 'suggest-feature', flash: null, error: null });
});
router.post('/suggest-feature', (req, res) => {
  const { title, category, description, rationale } = req.body;
  const errors = [];
  const validCats = ['UI','Performance','Backend','Content','Other'];
  if (!title || !sanitize(title)) errors.push('Title is required.');
  if (!category || !validCats.includes(category)) errors.push('Valid category is required.');
  if (!description || !sanitize(description)) errors.push('Description is required.');
  if (!rationale || !sanitize(rationale)) errors.push('Rationale is required.');
  if (!validateLength(title, 150)) errors.push('Title too long.');
  if (!validateLength(description, 2000)) errors.push('Description too long.');
  if (errors.length) return res.render('employee/suggest-feature', { title: 'Suggest a Feature', activePage: 'suggest-feature', flash: null, error: errors.join(' ') });
  const entry = { id: generateId(), submitter: req.session.user.username, title: sanitize(title), category, description: sanitize(description), rationale: sanitize(rationale), createdAt: new Date().toISOString() };
  db.addFeatureSuggestion(entry);
  res.render('employee/suggest-feature', { title: 'Suggest a Feature', activePage: 'suggest-feature', flash: `✓ Feature "${entry.title}" submitted!`, error: null });
});

// Submit Snippet
router.get('/submit-snippet', (req, res) => {
  res.render('employee/submit-snippet', { title: 'Submit UI Code Snippet', activePage: 'submit-snippet', flash: null, error: null });
});
router.post('/submit-snippet', (req, res) => {
  const { title, description, language, code } = req.body;
  const errors = [];
  if (!title || !sanitize(title)) errors.push('Title is required.');
  if (!description || !sanitize(description)) errors.push('Description is required.');
  if (!code || !code.trim()) errors.push('Code is required.');
  if (!validateLength(title, 150)) errors.push('Title too long.');
  if (!validateLength(description, 500)) errors.push('Description too long.');
  if (!validateLength(code, 50000)) errors.push('Code too long.');
  if (errors.length) return res.render('employee/submit-snippet', { title: 'Submit UI Code Snippet', activePage: 'submit-snippet', flash: null, error: errors.join(' ') });
  const entry = { id: generateId(), submitter: req.session.user.username, title: sanitize(title), description: sanitize(description), language: language ? sanitize(language).substring(0,30) : 'HTML/CSS/JS', code, status: 'pending', createdAt: new Date().toISOString() };
  db.addSnippet(entry);
  res.render('employee/submit-snippet', { title: 'Submit UI Code Snippet', activePage: 'submit-snippet', flash: `✓ Snippet "${entry.title}" submitted for review!`, error: null });
});

module.exports = router;
