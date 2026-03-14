'use strict';

const express = require('express');
const router  = express.Router();
const { requireLogin } = require('./middleware');

router.use(requireLogin);

// GET /voice — voice call lobby
router.get('/', (req, res) => {
  res.render('voice', {
    title: 'Voice Call',
    activePage: 'voice'
  });
});

module.exports = router;
