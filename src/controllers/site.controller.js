// src/controllers/site.controller.js
const Website = require('../models/website.model');
const Page = require('../models/page.model');
const User = require('../models/user.model'); // Jika Anda perlu info user berdasarkan username di path
const { catchAsync } = require('../middlewares/error.middleware');

// Tidak perlu DOMPurify di sini jika HTML sudah disanitasi saat disimpan.
// Namun, jika ada keraguan, lapisan sanitasi kedua (read-only) bisa jadi ide bagus,
// tapi biasanya ini akan menambah overhead. Fokus pada sanitasi saat input.

exports.renderUserSite = catchAsync(async (req, res, next) => {
  // Mengambil slug website dan sisa path untuk halaman
  // Rute di app.js: /s/:websiteSlug*
  // req.params.websiteSlug akan berisi slug website
  // req.params[0] akan berisi sisa path setelah slug (misal /about-us/team), atau undefined jika hanya slug
  const { websiteSlug } = req.params;
  const pagePath = req.params[0] ? ('/' + req.params[0].replace(/^\/+/, '')) : '/'; // Normalisasi path halaman

  // Cari website berdasarkan slug yang unik (global atau per user, tergantung desain Anda)
  // Jika slug tidak unik global, Anda perlu cara lain untuk mengidentifikasi website,
  // misalnya dengan kombinasi username/identifier dan slug.
  const website = await Website.findOne({
    slug: websiteSlug,
    isPublished: true // Hanya tampilkan website yang sudah dipublikasikan
  }).populate('user', 'username'); // Populate username pemilik jika diperlukan untuk ditampilkan

  if (!website) {
    const err = new Error('Website not found, may not exist, or is not currently published.');
    err.statusCode = 404;
    return next(err); // Akan ditangani oleh globalErrorHandler atau 404 handler di app.js
  }

  // Cari halaman di dalam website tersebut berdasarkan path yang sudah dinormalisasi
  const page = await Page.findOne({ website: website._id, path: pagePath });

  if (!page) {
    const err = new Error(`The page at path '${pagePath}' could not be found on this website.`);
    err.statusCode = 404;
    return next(err);
  }

  // Ambil semua halaman untuk navigasi
  const navigationPages = await Page.find({ website: website._id })
                                  .sort({ order: 1, createdAt: 1 })
                                  .select('name path'); // Hanya pilih field yang dibutuhkan untuk nav

  // Tentukan judul SEO untuk halaman
  const siteSeoTitle = page.seo?.title || `${page.name} - ${website.name}`;
  const siteSeoDescription = page.seo?.description || website.settings?.siteDescription || `Welcome to ${website.name}`;
  const siteSeoKeywords = page.seo?.keywords || website.settings?.siteKeywords || website.name;


  // Render template EJS spesifik untuk website pengguna
  // Nama template bisa diambil dari `website.theme`
  res.render(`public_site_templates/${website.theme || 'default'}`, {
    title: siteSeoTitle,
    metaDescription: siteSeoDescription,
    metaKeywords: siteSeoKeywords,
    layout: false, // Penting: Jangan gunakan layout utama aplikasi builder
    websiteOwner: website.user, // Informasi pemilik website (jika dipopulate)
    website: website,       // Data website (nama, settings, dll.)
    page: page,           // Data halaman saat ini (termasuk page.htmlContent)
    navigationPages: navigationPages, // Daftar halaman untuk menu navigasi
    // Anda bisa menambahkan helper global di app.js atau helper lokal di sini jika perlu
    // Contoh helper sederhana untuk merender elemen (jika Anda kembali ke struktur JSON)
    // renderElement: function(element) { ... }
  });
});