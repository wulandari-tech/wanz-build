// src/routes/view/dashboard.routes.js
const express = require('express');
const websiteController = require('../../controllers/website.controller');
const { protectView } = require('../../middlewares/auth.middleware');
const router = express.Router();

router.use(protectView);

router.get('/', websiteController.getDashboardPage);

// Website CRUD
router.get('/websites/new', websiteController.getCreateWebsitePage);
router.post('/websites', websiteController.createWebsite);
router.get('/websites/:websiteId/edit', websiteController.getEditWebsitePage);
router.post('/websites/:websiteId/publish', websiteController.publishWebsite);
router.post('/websites/:websiteId/unpublish', websiteController.unpublishWebsite);
router.post('/websites/:websiteId/delete', websiteController.deleteWebsite); // Rute delete website

// Page Content
router.post('/websites/:websiteId/pages/:pageId/content', websiteController.updatePageContent);

// Page CRUD
router.get('/websites/:websiteId/pages/new', websiteController.getCreatePageForm);
router.post('/websites/:websiteId/pages', websiteController.createPage);
router.post('/websites/:websiteId/pages/:pageId/delete', websiteController.deletePage);

// Subdomain Settings
router.get('/websites/:websiteId/subdomain', websiteController.getSubdomainSettingsPage);
router.post('/websites/:websiteId/subdomain', websiteController.updateSubdomain);

module.exports = router;