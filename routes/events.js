'use strict';

const express = require('express');
const router  = express.Router();
const { requireLogin, requireOwner } = require('./middleware');
const db      = require('../data/db');
const { generateId, sanitize, validateLength } = require('./helpers');

// Employee: view events
router.get('/', requireLogin, (req, res) => {
  const events = db.getAllEventsSorted();
  res.render('events', {
    title: 'Scheduled Events',
    activePage: 'events',
    events
  });
});

// Owner: create event page
router.get('/create', requireOwner, (req, res) => {
  res.render('owner/event-create', {
    title: 'Schedule Event',
    activePage: 'events',
    error: null
  });
});

// Owner: POST create event
router.post('/create', requireOwner, (req, res) => {
  const { title, description, startsAt, endsAt, type } = req.body;
  const validTypes = ['Meeting','Deadline','Announcement','Maintenance','Other'];
  const errors = [];

  if (!title || !sanitize(title)) errors.push('Title is required.');
  if (!startsAt) errors.push('Start date/time is required.');
  if (!type || !validTypes.includes(type)) errors.push('Valid event type is required.');
  if (!validateLength(title, 150)) errors.push('Title too long.');
  if (description && !validateLength(description, 1000)) errors.push('Description too long.');

  if (errors.length) {
    return res.render('owner/event-create', {
      title: 'Schedule Event', activePage: 'events', error: errors.join(' ')
    });
  }

  const event = {
    id: generateId(),
    title: sanitize(title),
    description: description ? sanitize(description) : '',
    type,
    startsAt,
    endsAt: endsAt || null,
    createdBy: req.session.user.username,
    createdAt: new Date().toISOString()
  };

  db.addEvent(event);

  // Broadcast live to all connected clients
  const io = req.app.locals.io;
  if (io) io.emit('event:new', event);

  res.redirect('/events');
});

// Owner: delete event
router.post('/:id/delete', requireOwner, (req, res) => {
  db.deleteEvent(req.params.id);
  const io = req.app.locals.io;
  if (io) io.emit('event:deleted', { id: req.params.id });
  res.redirect('/events');
});

module.exports = router;
