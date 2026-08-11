const { Router } = require('express');
const authController = require('./auth.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

const router = Router();

router.post('/login', (req, res) => authController.login(req, res));

router.post('/change-password', authenticate, (req, res) =>
  authController.changePassword(req, res)
);

module.exports = router;
