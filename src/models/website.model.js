const mongoose = require('mongoose');
const slugify = require('slugify');

const websiteSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Website name is required'], trim: true },
  slug: { type: String, unique: true, lowercase: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isPublished: { type: Boolean, default: false },
  settings: { favicon: String, customCss: String, siteDescription: String, siteKeywords: String },
  theme: { type: String, default: 'default' } // Untuk template EJS website pengguna
}, { timestamps: true });

websiteSchema.pre('save', function(next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true, replacement: '-' });
  }
  next();
});

const Website = mongoose.model('Website', websiteSchema);
module.exports = Website;