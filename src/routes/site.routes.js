const express = require('express');
const siteController = require('../controllers/site.controller');
const router = express.Router();

// Contoh: /s/user-slug/website-slug/page-path
// Atau jika slug website sudah unik global: /s/website-slug/page-path
// Di sini kita asumsikan userIdentifier adalah USERNAME dan slug website unik per user
// Atau userIdentifier adalah ID dan slug website unik per user.
// Untuk kesederhanaan, path ini akan menangkap slug website, dan controller akan mencari berdasarkan slug itu.
// Anda mungkin perlu userIdentifier jika slug website tidak unik global.
// router.get('/:userIdentifier/:websiteSlug*', siteController.renderUserSite);

// Jika slug website unik global:
router.get('/:websiteSlug*', siteController.renderUserSite);

module.exports = router;