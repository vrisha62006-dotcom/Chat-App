const express = require('express');
const { getUsers } = require('../controllers/users.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', authenticate, getUsers);

module.exports = router;
