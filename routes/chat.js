'use strict';

const express = require('express');
const router = express.Router();
const { requireLogin } = require('./middleware');

router.use(requireLogin);

// GET /chat
router.get('/', (req, res) => {
  res.render('chat', {
    title: 'Team Chat',
    activePage: 'chat'
  });
});

module.exports = router;
