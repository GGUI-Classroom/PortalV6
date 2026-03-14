'use strict';

const express = require('express');
const router  = express.Router();
const { requireOwner } = require('./middleware');
const db      = require('../data/db');
const { generateId } = require('./helpers');

router.use(requireOwner);

// Dashboard
router.get('/dashboard', (req, res) => {
  const websites = db.getWebsiteSuggestions();
  const features = db.getFeatureSuggestions();
  const pending  = db.getPendingSnippets();
  const reviewed = db.getReviewedSnippets();
  const events   = db.getUpcomingEvents();

  res.render('owner/dashboard', {
    title: 'Owner Dashboard', activePage: 'dashboard',
    counts: {
      websites: websites.length,
      features: features.length,
      snippetsPending: pending.length,
      snippetsReviewed: reviewed.length,
      events: events.length
    }
  });
});

// Website suggestions
router.get('/websites', (req, res) => {
  let items = db.getWebsiteSuggestions();
  const { q, priority } = req.query;
  if (priority && ['Low','Medium','High'].includes(priority)) items = items.filter(i => i.priority === priority);
  if (q) { const lc = q.toLowerCase(); items = items.filter(i => i.name.toLowerCase().includes(lc) || i.description.toLowerCase().includes(lc) || i.submitter.toLowerCase().includes(lc)); }
  res.render('owner/websites', { title: 'Website Suggestions', activePage: 'websites', items, q: q||'', priority: priority||'' });
});

// Feature suggestions
router.get('/features', (req, res) => {
  let items = db.getFeatureSuggestions();
  const { q, category } = req.query;
  const validCategories = ['UI','Performance','Backend','Content','Other'];
  if (category && validCategories.includes(category)) items = items.filter(i => i.category === category);
  if (q) { const lc = q.toLowerCase(); items = items.filter(i => i.title.toLowerCase().includes(lc) || i.description.toLowerCase().includes(lc) || i.submitter.toLowerCase().includes(lc)); }
  res.render('owner/features', { title: 'Feature Suggestions', activePage: 'features', items, q: q||'', category: category||'', validCategories });
});

// Snippets (pending review)
router.get('/snippets', (req, res) => {
  let items = db.getPendingSnippets();
  const { q } = req.query;
  if (q) { const lc = q.toLowerCase(); items = items.filter(i => i.title.toLowerCase().includes(lc) || i.submitter.toLowerCase().includes(lc) || i.language.toLowerCase().includes(lc)); }
  res.render('owner/snippets', { title: 'Pending Code Snippets', activePage: 'snippets', items, q: q||'' });
});

// Snippets reviewed archive
router.get('/snippets/reviewed', (req, res) => {
  let items = db.getReviewedSnippets();
  res.render('owner/snippets-reviewed', { title: 'Reviewed Snippets', activePage: 'snippets', items });
});

// POST accept/decline snippet
router.post('/snippets/:id/review', (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'accepted' or 'declined'
  if (!['accepted','declined'].includes(action)) return res.redirect('/owner/snippets');

  const snippet = db.reviewSnippet(id, action);
  if (!snippet) return res.redirect('/owner/snippets');

  // Create notification for submitter
  const notif = {
    id: generateId(),
    username: snippet.submitter,
    type: 'snippet_review',
    status: action,
    snippetTitle: snippet.title,
    message: action === 'accepted'
      ? `Your code snippet "${snippet.title}" was accepted by the owner! ✅`
      : `Your code snippet "${snippet.title}" was declined by the owner. ❌`,
    read: false,
    createdAt: new Date().toISOString()
  };
  db.addNotification(notif);

  // Emit real-time notification via socket.io
  const io = req.app.locals.io;
  if (io) io.emit('notification:new', notif);

  res.redirect('/owner/snippets');
});

// Combined view
router.get('/combined', (req, res) => {
  const websites = db.getWebsiteSuggestions();
  const features = db.getFeatureSuggestions();
  const snippets = db.getSnippets();
  const all = [
    ...websites.map(i => ({ ...i, _type: 'Website Suggestion' })),
    ...features.map(i => ({ ...i, _type: 'Feature Suggestion', name: i.title })),
    ...snippets.map(i => ({ ...i, _type: 'Code Snippet', name: i.title }))
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.render('owner/combined', { title: 'Combined View', activePage: 'combined', items: all });
});

module.exports = router;
