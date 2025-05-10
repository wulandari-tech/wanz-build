const express = require('express');
const websiteController = require('../../controllers/website.controller');
const { protectApi } = require('../../middlewares/auth.middleware'); // Gunakan protectApi
const router = express.Router();

router.use(protectApi);

// Contoh jika editor menyimpan struktur halaman via API
router.put('/websites/:websiteId/pages/:pageId/structure', websiteController.updatePageStructure);
// Perhatikan: updatePageStructure perlu diadaptasi untuk mengembalikan JSON jika dipanggil dari API

module.exports = router;