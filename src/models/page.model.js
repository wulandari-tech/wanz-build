const mongoose = require('mongoose');
const slugify = require('slugify');

const pageSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Page name is required'], trim: true, default: 'Untitled Page' },
  path: { type: String, required: true, trim: true, default: '/' },
  website: { type: mongoose.Schema.Types.ObjectId, ref: 'Website', required: true },
  structure: { type: Object, default: { elements: [] } },
  order: { type: Number, default: 0 },
  seo: { title: String, description: String, keywords: String }
}, { timestamps: true });

pageSchema.pre('save', function(next) {
  if (this.isModified('name') || (this.path === '/' && this.name.toLowerCase() !== 'home')) {
    if (this.name.toLowerCase() !== 'home') {
        this.path = '/' + slugify(this.name, { lower: true, strict: true, replacement: '-' });
    } else {
        this.path = '/';
    }
  } else if (this.path && this.path !=='/') { // Pastikan path custom diawali '/'
    this.path = '/' + this.path.replace(/^\/+/, '');
  }
  next();
});

pageSchema.index({ website: 1, path: 1 }, { unique: true });

const Page = mongoose.model('Page', pageSchema);
module.exports = Page;