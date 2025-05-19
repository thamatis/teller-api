const express = require('express');
const router = express.Router();
const controller = require('../controllers/transactionController');
const { authenticate, authorizeRoles  } = require('../middlewares/auth');

router.post('/deposit', authenticate, authorizeRoles('teller', 'admin'), controller.deposit);
router.post('/withdraw', authenticate, authorizeRoles('teller', 'admin'), controller.withdraw);
router.post('/transfer', authenticate, authorizeRoles('teller', 'admin'), controller.transfer);

module.exports = router;
