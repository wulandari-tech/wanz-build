const express = require('express');
const websiteController = require('../../controllers/website.controller');
const { protectView } = require('../../middlewares/auth.middleware');
const router = express.Router();

router.use(protectView);

router.get('/', websiteController.getDashboardPage);
router.get('/websites/new', websiteController.getCreateWebsitePage);
router.post('/websites', websiteController.createWebsite);
router.get('/websites/:websiteId/edit', websiteController.getEditWebsitePage);
router.post('/websites/:websiteId/publish', websiteController.publishWebsite);
router.post('/websites/:websiteId/unpublish', websiteController.unpublishWebsite);

// Page Structure (dari form, bukan API)
router.post('/websites/:websiteId/pages/:pageId/structure', websiteController.updatePageStructure);

// CRUD Pages
router.get('/websites/:websiteId/pages/new', websiteController.getCreatePageForm);
router.post('/websites/:websiteId/pages', websiteController.createPage);
// router.get('/websites/:websiteId/pages/:pageId/edit', websiteController.getEditPageForm); // Perlu dibuat
// router.post('/websites/:websiteId/pages/:pageId', websiteController.updatePage); // Perlu dibuat
router.post('/websites/:websiteId/pages/:pageId/delete', websiteController.deletePage);


module.exports = router;