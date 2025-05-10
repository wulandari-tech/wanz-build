const Website = require('../models/website.model');
const Page = require('../models/page.model');
const { catchAsync } = require('../middlewares/error.middleware');
const slugify = require('slugify');

exports.getDashboardPage = catchAsync(async (req, res) => {
  const websites = await Website.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.render('pages/dashboard/index', {
    title: 'My Websites - WanzOFC Site Builder',
    websites,
    // currentUser: req.user // sudah ada di res.locals dari middleware
  });
});

exports.getCreateWebsitePage = (req, res) => {
  res.render('pages/dashboard/create_website', {
    title: 'Create New Website - WanzOFC Site Builder'
  });
};

exports.createWebsite = catchAsync(async (req, res) => {
  const { name } = req.body;
  if (!name) {
    req.flash('error_msg', 'Website name is required.');
    return res.redirect('/dashboard/websites/new');
  }
  let websiteSlug = slugify(name, { lower: true, strict: true, replacement: '-' });
  let existingWebsite = await Website.findOne({ slug: websiteSlug, user: req.user._id });
  let counter = 1;
  while(existingWebsite) { // Pastikan slug unik per user
      websiteSlug = `${slugify(name, { lower: true, strict: true, replacement: '-' })}-${counter}`;
      existingWebsite = await Website.findOne({ slug: websiteSlug, user: req.user._id });
      counter++;
  }

  const website = await Website.create({ name, slug: websiteSlug, user: req.user._id });
  await Page.create({
    name: 'Home',
    path: '/',
    website: website._id,
    structure: { elements: [{ type: 'headline', content: `Welcome to ${website.name}` }] }
  });
  req.flash('success_msg', 'Website created successfully! Start editing your homepage.');
  res.redirect(`/dashboard/websites/${website._id}/edit`);
});

exports.getEditWebsitePage = catchAsync(async (req, res, next) => {
  const website = await Website.findOne({ _id: req.params.websiteId, user: req.user._id });
  if (!website) {
    req.flash('error_msg', 'Website not found or you are not authorized.');
    return res.redirect('/dashboard');
  }
  const pages = await Page.find({ website: website._id }).sort({ order: 1, createdAt: 1 });
  let activePagePath = req.query.page || '/';
  let currentPage = pages.find(p => p.path === activePagePath);
  if (!currentPage && pages.length > 0) {
    currentPage = pages.find(p => p.path === '/') || pages[0]; // Fallback ke homepage atau halaman pertama
  } else if (!currentPage && pages.length === 0) {
    // Jika tidak ada halaman sama sekali (seharusnya tidak terjadi jika ada default Home)
    // Buat halaman Home default
    currentPage = await Page.create({ name: 'Home', path: '/', website: website._id, structure: { elements: [] } });
    pages.push(currentPage);
  }


  if (!currentPage) { // Jika masih belum ada halaman aktif (misal website baru tanpa halaman)
    req.flash('error_msg', 'No pages found for this website. Create one first.');
    // Mungkin redirect ke halaman 'create page' atau handle di EJS
    // Untuk sekarang, kita akan render dengan currentPage = null dan EJS akan handle
  }

  res.render('pages/dashboard/editor', {
    title: `Edit: ${website.name} - WanzOFC Site Builder`,
    website,
    pages,
    currentPage // Bisa jadi null jika tidak ada halaman
  });
});

exports.updatePageStructure = catchAsync(async (req, res) => {
  const { websiteId, pageId } = req.params;
  let { structureData } = req.body; // Ini string JSON dari textarea

  try {
      structureData = JSON.parse(structureData); // Parse string JSON menjadi objek
      if (typeof structureData !== 'object' || !structureData.elements || !Array.isArray(structureData.elements)) {
          throw new Error('Invalid structure format');
      }
  } catch(e) {
      req.flash('error_msg', 'Invalid JSON structure for the page.');
      return res.redirect('back');
  }


  const website = await Website.findOne({ _id: websiteId, user: req.user._id });
  if (!website) {
    req.flash('error_msg', 'Not authorized or website not found.');
    return res.redirect('/dashboard');
  }
  const page = await Page.findOneAndUpdate(
    { _id: pageId, website: websiteId },
    { structure: structureData },
    { new: true, runValidators: true }
  );
  if (!page) {
    req.flash('error_msg', 'Page not found.');
    return res.redirect(`/dashboard/websites/${websiteId}/edit`);
  }
  req.flash('success_msg', `Page '${page.name}' structure updated!`);
  res.redirect(`/dashboard/websites/${websiteId}/edit?page=${encodeURIComponent(page.path)}`);
});

exports.publishWebsite = catchAsync(async (req, res) => {
  const { websiteId } = req.params;
  const website = await Website.findOneAndUpdate(
    { _id: websiteId, user: req.user._id }, { isPublished: true }, { new: true }
  );
  if (!website) {
    req.flash('error_msg', 'Website not found or not authorized.');
    return res.redirect('back');
  }
  req.flash('success_msg', `Website '${website.name}' is now published!`);
  res.redirect(`/dashboard/websites/${websiteId}/edit`);
});

exports.unpublishWebsite = catchAsync(async (req, res) => {
  const { websiteId } = req.params;
  const website = await Website.findOneAndUpdate(
    { _id: websiteId, user: req.user._id }, { isPublished: false }, { new: true }
  );
  if (!website) {
    req.flash('error_msg', 'Website not found or not authorized.');
    return res.redirect('back');
  }
  req.flash('success_msg', `Website '${website.name}' has been unpublished.`);
  res.redirect(`/dashboard/websites/${websiteId}/edit`);
});

// CRUD untuk Pages
exports.getCreatePageForm = catchAsync(async (req, res) => {
    const website = await Website.findOne({ _id: req.params.websiteId, user: req.user._id });
    if (!website) {
        req.flash('error_msg', 'Website not found.');
        return res.redirect('/dashboard');
    }
    res.render('pages/dashboard/create_page', { // Buat view ini
        title: `Create New Page - ${website.name}`,
        website
    });
});

exports.createPage = catchAsync(async (req, res) => {
    const { name } = req.body;
    const { websiteId } = req.params;

    const website = await Website.findOne({ _id: websiteId, user: req.user._id });
    if (!website) {
        req.flash('error_msg', 'Website not found.');
        return res.redirect('/dashboard');
    }
    if (!name) {
        req.flash('error_msg', 'Page name is required.');
        return res.redirect(`/dashboard/websites/${websiteId}/pages/new`);
    }

    const newPage = await Page.create({ name, website: websiteId });
    req.flash('success_msg', `Page '${newPage.name}' created.`);
    res.redirect(`/dashboard/websites/${websiteId}/edit?page=${encodeURIComponent(newPage.path)}`);
});

exports.deletePage = catchAsync(async (req, res) => {
    const { websiteId, pageId } = req.params;
    const website = await Website.findOne({ _id: websiteId, user: req.user._id });
     if (!website) {
        req.flash('error_msg', 'Website not found.');
        return res.redirect('/dashboard');
    }
    const page = await Page.findOne({ _id: pageId, website: websiteId });
    if (!page) {
        req.flash('error_msg', 'Page not found.');
        return res.redirect(`/dashboard/websites/${websiteId}/edit`);
    }
    if (page.path === '/') {
        req.flash('error_msg', 'Cannot delete the homepage.');
        return res.redirect(`/dashboard/websites/${websiteId}/edit`);
    }
    await Page.deleteOne({ _id: pageId, website: websiteId });
    req.flash('success_msg', `Page '${page.name}' deleted.`);
    res.redirect(`/dashboard/websites/${websiteId}/edit`);
});