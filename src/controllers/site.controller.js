const Website = require('../models/website.model');
const Page = require('../models/page.model');
const { catchAsync } = require('../middlewares/error.middleware');

exports.renderUserSite = catchAsync(async (req, res, next) => {
  const { userIdentifier, websiteSlug } = req.params; // userIdentifier bisa jadi username atau ID
  const pagePath = req.params[0] || '/';

  // Cari user dulu jika userIdentifier adalah username
  // const siteOwner = await User.findOne({ username: userIdentifier });
  // if (!siteOwner) { /* ... error ... */ }
  // Untuk kesederhanaan, asumsikan userIdentifier adalah ID User untuk path /sites/:userId/:slug
  // Atau, jika Anda menggunakan subdomain/domain kustom, logika pencarian website akan berbeda.

  const website = await Website.findOne({
    // user: siteOwner._id, // Jika menggunakan username
    slug: websiteSlug, // Asumsi slug unik global atau per user
    isPublished: true
  }).populate('user', 'username'); // Untuk menampilkan nama pemilik jika perlu

  if (!website) {
    const err = new Error('Website not found or not published.');
    err.statusCode = 404; return next(err);
  }

  const page = await Page.findOne({ website: website._id, path: pagePath });
  if (!page) {
    const err = new Error(`Page at path '${pagePath}' not found on this website.`);
    err.statusCode = 404; return next(err);
  }

  const navigationPages = await Page.find({ website: website._id }).sort({ order: 1, createdAt: 1 });
  const siteSeoTitle = page.seo?.title || `${page.name} - ${website.name}`;

  res.render(`public_site_templates/${website.theme || 'default'}`, {
    title: siteSeoTitle,
    layout: false, // Jangan gunakan layout aplikasi builder untuk website publik
    websiteOwner: website.user,
    website,
    page,
    navigationPages,
    // Anda bisa menambahkan helper function di sini jika perlu
    renderElement: function(element) { // Contoh helper sederhana
        if (element.type === 'headline') return `<h1>${element.content || ''}</h1>`;
        if (element.type === 'paragraph') return `<p>${element.content || ''}</p>`;
        if (element.type === 'image' && element.src) return `<img src="${element.src}" alt="${element.alt || ''}" style="max-width:100%;">`;
        return `<div><small>Unsupported element type: ${element.type}</small></div>`;
    }
  });
});