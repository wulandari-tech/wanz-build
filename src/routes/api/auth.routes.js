const express = require('express');
const authController = require('../../controllers/auth.controller');
const router = express.Router();

// Jika Anda memiliki frontend JavaScript yang melakukan login via API
router.post('/login', authController.apiLoginUser);
// router.post('/register', authController.apiRegisterUser); // Buat fungsi ini jika perlu

module.exports = router;