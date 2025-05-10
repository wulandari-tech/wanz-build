// src/models/Website.model.js
const mongoose = require('mongoose');
const slugify = require('slugify'); // Tetap gunakan slugify untuk slug internal jika perlu

const websiteSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Website name is required'], trim: true },
  // Slug internal, bisa sama dengan subdomain atau berbeda.
  // Mungkin berguna jika subdomain yang diinginkan user sudah terpakai.
  internalSlug: { type: String, unique: true, lowercase: true, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isPublished: { type: Boolean, default: false },
  settings: {
    favicon: String,
    customCss: String,
    siteDescription: String,
    siteKeywords: String,
  },
  theme: { type: String, default: 'modern-starter' },
  // Informasi Subdomain
  subdomain: { // Ini akan menjadi bagian sebelum .wanzofc.xyz
    prefix: { type: String, trim: true, unique: true, sparse: true, lowercase: true }, // e.g., 'mysite'
    isDnsActive: { type: Boolean, default: false }, // Status apakah DNS record sudah dibuat/aktif
    cloudflareRecordId: { type: String } // Untuk menyimpan ID record DNS di Cloudflare jika perlu update/delete spesifik
  },
}, { timestamps: true });

websiteSchema.pre('save', function(next) {
  if (!this.internalSlug && this.isModified('name')) {
    // Generate slug internal awal dari nama, logika unik global di controller
    this.internalSlug = slugify(this.name, { lower: true, strict: true, replacement: '-' });
  }
  if (this.isModified('subdomain.prefix') && this.subdomain.prefix) {
      // Pastikan prefix subdomain valid (alphanumeric dan hyphen)
      this.subdomain.prefix = slugify(this.subdomain.prefix, { lower: true, strict: true, replacement: '-' });
  }
  next();
});

const Website = mongoose.model('Website', websiteSchema);
module.exports = Website;