const Website = require('../models/website.model');
const Page = require('../models/page.model');
const { catchAsync } = require('../middlewares/error.middleware');
const slugify = require('slugify');
const { createDnsCnameRecord, deleteDnsCnameRecord } = require('../core/services/cloudflare.service');
const config = require('../config');

const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = (new JSDOM('')).window;
const DOMPurify = createDOMPurify(window);
const domPurifyConfig = { USE_PROFILES: { html: true }, ADD_ATTR: ['target', 'rel', 'class', 'id', 'style'], ADD_TAGS: ['iframe', 'style', 'script'] }; // Lebih permisif, hati-hati dengan script

const getStartedHtmlTemplate = (websiteName, username) => {
  return `
<style>
  .hero-gs { background: linear-gradient(45deg, ${config.cloudflare.mainAppCnameTarget ? '#0D6EFD' : '#6f42c1'}, ${config.cloudflare.mainAppCnameTarget ? '#6f42c1' : '#0D6EFD'}); color: white; padding: 4rem 1rem; text-align: center; border-radius: 8px; margin-bottom: 2rem;}
  .hero-gs h1 { font-size: 2.8rem; margin-bottom: 0.5rem; } .hero-gs p { font-size: 1.2rem; opacity: 0.9; }
  .features-gs { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
  .feature-card-gs { background: #fff; padding: 1.5rem; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.07); text-align:center; }
  .feature-card-gs i { font-size: 2.5rem; color: ${config.cloudflare.mainAppCnameTarget ? '#0D6EFD' : '#2ecc71'}; margin-bottom: 1rem; }
  .feature-card-gs h3 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #333; }
  .cta-gs { text-align:center; background: #f8f9fa; padding: 2.5rem 1rem; border-radius: 8px; }
  .cta-gs h2 { font-size: 2rem; margin-bottom: 1rem; }
  .cta-gs .btn-gs { background-color: ${config.cloudflare.mainAppCnameTarget ? '#0D6EFD' : '#2ecc71'}; color:white; padding: 0.75rem 1.5rem; text-decoration:none; border-radius: 50px; font-weight:bold; transition: background-color 0.3s ease; }
  .cta-gs .btn-gs:hover { background-color: ${config.cloudflare.mainAppCnameTarget ? '#0a58ca' : '#27ae60'}; }
</style>
<section class="hero-gs"><h1>Welcome to Your New Site: ${websiteName}!</h1><p>Created with WanzOFC Site Builder by ${username}. Start customizing your content!</p></section>
<section class="features-gs"><div class="feature-card-gs"><i class="fas fa-pencil-alt"></i><h3>Easy Editing</h3><p>Use our intuitive editor to change text, images, and layouts without any coding.</p></div><div class="feature-card-gs"><i class="fas fa-palette"></i><h3>Beautiful Design</h3><p>This is a starter template. Explore themes and customize it to match your brand.</p></div><div class="feature-card-gs"><i class="fas fa-rocket"></i><h3>Publish Instantly</h3><p>Once you're ready, publish your site with a single click and share it with the world.</p></div></section>
<article><h2>About Your Site</h2><p>This is a placeholder section. Replace this with information about your project, business, or passion. Tell your visitors who you are, what you do, and why they should be interested.</p><p>Consider adding:</p><ul><li>Your mission or vision.</li><li>Key services or products.</li><li>Your unique selling points.</li></ul></article>
<section class="cta-gs"><h2>Ready to Make It Your Own?</h2><p>Dive into the editor and transform this template into your unique online presence.</p><a href="#" class="btn-gs">Learn More (Example Button)</a></section>`;
};

async function generateUniqueInternalSlug(name) {
    let baseSlug = slugify(name, { lower: true, strict: true, replacement: '-' });
    let slug = baseSlug;
    let counter = 0;
    while (await Website.findOne({ internalSlug: slug })) {
        counter++;
        slug = `${baseSlug}-${counter}`;
    }
    return slug;
}

async function generateUniqueSubdomainPrefix(name) {
    let basePrefix = slugify(name, { lower: true, strict: true, replacement: '-' });
    if (basePrefix.length > 63) basePrefix = basePrefix.substring(0, 63);
    basePrefix = basePrefix.replace(/^-+|-+$/g, '');
    if (!basePrefix) basePrefix = 'my-site'; // Fallback jika nama hanya berisi karakter yg di-remove

    let prefix = basePrefix;
    let counter = 0;
    while (await Website.findOne({ 'subdomain.prefix': prefix })) {
        counter++;
        const suffix = `-${counter}`;
        const remainingLength = 63 - suffix.length;
        prefix = `${basePrefix.substring(0, Math.max(0, remainingLength))}${suffix}`;
        prefix = prefix.replace(/^-+|-+$/g, '');
    }
    return prefix;
}

exports.getDashboardPage = catchAsync(async (req, res) => {
  const websites = await Website.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.render('pages/dashboard/index', {
    title: 'My Websites - WanzOFC Site Builder',
    websites,
    appHostname: config.appHostname
  });
});

exports.getCreateWebsitePage = (req, res) => {
  res.render('pages/dashboard/create_website', {
    title: 'Create New Website - WanzOFC Site Builder',
    appHostname: config.appHostname
  });
};

exports.createWebsite = catchAsync(async (req, res) => {
  const { name, desiredSubdomain } = req.body;

  if (!name) {
    req.flash('error_msg', 'Website name is required.');
    return res.redirect('/dashboard/websites/new');
  }

  const internalSlug = await generateUniqueInternalSlug(name);
  let subdomainPrefixToUse = desiredSubdomain
                             ? slugify(desiredSubdomain, {lower:true, strict:true, replacement:'-'}).replace(/^-+|-+$/g, '')
                             : internalSlug;

  if (!subdomainPrefixToUse) { // Jika desiredSubdomain hanya karakter invalid
    subdomainPrefixToUse = internalSlug;
  }
  if (subdomainPrefixToUse.length > 63) subdomainPrefixToUse = subdomainPrefixToUse.substring(0, 63);
  subdomainPrefixToUse = subdomainPrefixToUse.replace(/^-+|-+$/g, '');
  if (!subdomainPrefixToUse) {
    subdomainPrefixToUse = await generateUniqueSubdomainPrefix('site'); // Fallback super aman
  }


  const existingSubdomain = await Website.findOne({ 'subdomain.prefix': subdomainPrefixToUse });
  if (existingSubdomain) {
      const originalAttempt = subdomainPrefixToUse;
      subdomainPrefixToUse = await generateUniqueSubdomainPrefix(name);
      req.flash('info_msg', `The subdomain prefix '${originalAttempt}' was taken. We've assigned '${subdomainPrefixToUse}' instead.`);
  }

  const website = new Website({
    name,
    internalSlug,
    user: req.user._id,
    theme: 'modern-starter',
    subdomain: {
        prefix: subdomainPrefixToUse,
        isDnsActive: false
    }
  });

  if (config.cloudflare.apiToken && config.isProduction && config.cloudflare.zoneId && config.cloudflare.mainAppCnameTarget) {
      const dnsResult = await createDnsCnameRecord(subdomainPrefixToUse);
      if (dnsResult.success) {
          website.subdomain.isDnsActive = true;
          if (dnsResult.record && dnsResult.record.id) {
            website.subdomain.cloudflareRecordId = dnsResult.record.id;
          }
          req.flash('success_msg', `DNS record for ${subdomainPrefixToUse}.${config.appHostname} is being created/verified.`);
      } else {
          req.flash('error_msg', `Website created, but failed to setup subdomain DNS: ${dnsResult.message}. Contact support or try setting a different subdomain prefix later.`);
      }
  } else if (!config.isProduction) {
      req.flash('info_msg', 'Website created! DNS record creation for subdomains is skipped in development mode.');
  } else {
      req.flash('warning_msg', 'Website created, but Cloudflare is not fully configured for automatic subdomain DNS. The subdomain may not be active.');
  }

  await website.save();

  const homepageContent = getStartedHtmlTemplate(website.name, req.user.username);
  const sanitizedHomepageContent = DOMPurify.sanitize(homepageContent, domPurifyConfig);

  await Page.create({
    name: 'Home',
    path: '/',
    website: website._id,
    htmlContent: sanitizedHomepageContent,
    seo: { title: `Welcome to ${website.name}`, description: `The official homepage for ${website.name}, built with WanzOFC Site Builder.` }
  });

  req.flash('success_msg', `Website "${website.name}" created with a "Get Started" template! Your site address: ${subdomainPrefixToUse}.${config.appHostname}`);
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
    currentPage = pages.find(p => p.path === '/') || pages[0];
  } else if (!currentPage && pages.length === 0) {
    try {
        const homepageContent = getStartedHtmlTemplate(website.name, req.user.username);
        const sanitizedHomepageContent = DOMPurify.sanitize(homepageContent, domPurifyConfig);
        currentPage = await Page.create({
            name: 'Home', path: '/', website: website._id, htmlContent: sanitizedHomepageContent,
            seo: { title: `Welcome to ${website.name}`, description: `The official homepage for ${website.name}.` }
        });
        pages.push(currentPage);
        req.flash('info_msg', 'Default homepage created as no pages were found.');
    } catch (dbError) {
        console.error("Error creating default page in editor:", dbError);
        req.flash('error_msg', 'Could not load or create a page to edit.');
    }
  }

  res.render('pages/dashboard/editor', {
    title: `Edit: ${website.name} - WanzOFC Site Builder`,
    website,
    pages,
    currentPage,
    appHostname: config.appHostname
  });
});

exports.updatePageContent = catchAsync(async (req, res) => {
  const { websiteId, pageId } = req.params;
  let { htmlData } = req.body;

  if (typeof htmlData === 'undefined') {
      req.flash('error_msg', 'No content provided to update.');
      return res.redirect('back');
  }

  const cleanHtml = DOMPurify.sanitize(htmlData, domPurifyConfig);

  const website = await Website.findOne({ _id: websiteId, user: req.user._id });
  if (!website) {
    req.flash('error_msg', 'Not authorized or website not found.');
    return res.redirect('/dashboard');
  }

  const page = await Page.findOneAndUpdate(
    { _id: pageId, website: websiteId },
    { htmlContent: cleanHtml },
    { new: true, runValidators: true }
  );

  if (!page) {
    req.flash('error_msg', 'Page not found within this website.');
    return res.redirect(`/dashboard/websites/${websiteId}/edit`);
  }

  req.flash('success_msg', `Page '${page.name}' content updated successfully!`);
  res.redirect(`/dashboard/websites/${websiteId}/edit?page=${encodeURIComponent(page.path)}`);
});

exports.publishWebsite = catchAsync(async (req, res) => {
  const { websiteId } = req.params;
  const website = await Website.findOneAndUpdate(
    { _id: websiteId, user: req.user._id }, { isPublished: true }, { new: true }
  );
  if (!website) {
    req.flash('error_msg', 'Website not found or not authorized to publish it.');
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
    req.flash('error_msg', 'Website not found or not authorized to unpublish it.');
    return res.redirect('back');
  }
  req.flash('success_msg', `Website '${website.name}' has been unpublished and is now a draft.`);
  res.redirect(`/dashboard/websites/${websiteId}/edit`);
});

exports.getCreatePageForm = catchAsync(async (req, res) => {
    const website = await Website.findOne({ _id: req.params.websiteId, user: req.user._id });
    if (!website) {
        req.flash('error_msg', 'Website not found, cannot create a page.');
        return res.redirect('/dashboard');
    }
    res.render('pages/dashboard/create_page', {
        title: `Create New Page for "${website.name}" - WanzOFC Site Builder`,
        website
    });
});

exports.createPage = catchAsync(async (req, res) => {
    const { name, path: customPath } = req.body;
    const { websiteId } = req.params;

    const website = await Website.findOne({ _id: websiteId, user: req.user._id });
    if (!website) {
        req.flash('error_msg', 'Website not found.'); return res.redirect('/dashboard');
    }
    if (!name) {
        req.flash('error_msg', 'Page name is required.');
        return res.redirect(`/dashboard/websites/${websiteId}/pages/new`);
    }

    let pagePath;
    if (customPath && customPath.trim() !== '' && customPath.trim() !== '/') {
        pagePath = '/' + slugify(customPath.trim().replace(/^\/+/, ''), { lower: true, strict: true, replacement: '-' });
    } else if (name.toLowerCase() === 'home') {
        pagePath = '/';
    }
    else {
        pagePath = '/' + slugify(name, { lower: true, strict: true, replacement: '-' });
    }


    const existingPage = await Page.findOne({ website: websiteId, path: pagePath });
    if (existingPage) {
        req.flash('error_msg', `A page with path '${pagePath}' already exists for this website. Choose a different name or path.`);
        return res.redirect(`/dashboard/websites/${websiteId}/pages/new`);
    }

    const newPageHtmlContent = DOMPurify.sanitize(`<h2>${name}</h2><p>Start adding unique content to your new page, "${name}"!</p>`, domPurifyConfig);
    const newPage = await Page.create({
        name, path: pagePath, website: websiteId, htmlContent: newPageHtmlContent,
        seo: { title: `${name} - ${website.name}` }
    });

    req.flash('success_msg', `Page '${newPage.name}' created successfully.`);
    res.redirect(`/dashboard/websites/${websiteId}/edit?page=${encodeURIComponent(newPage.path)}`);
});

exports.deletePage = catchAsync(async (req, res) => {
    const { websiteId, pageId } = req.params;
    const website = await Website.findOne({ _id: websiteId, user: req.user._id });
    if (!website) {
        req.flash('error_msg', 'Website not found or you are not authorized.');
        return res.redirect('/dashboard');
    }
    const page = await Page.findOne({ _id: pageId, website: websiteId });
    if (!page) {
        req.flash('error_msg', 'Page not found within this website.');
        return res.redirect(`/dashboard/websites/${websiteId}/edit`);
    }
    if (page.path === '/') {
        const pageCount = await Page.countDocuments({ website: websiteId });
        if (pageCount <= 1) {
            req.flash('error_msg', 'Cannot delete the homepage if it is the only page on the site.');
            return res.redirect(`/dashboard/websites/${websiteId}/edit`);
        }
    }
    await Page.deleteOne({ _id: pageId, website: websiteId });
    req.flash('success_msg', `Page '${page.name}' has been deleted.`);
    res.redirect(`/dashboard/websites/${websiteId}/edit`);
});

exports.getSubdomainSettingsPage = catchAsync(async (req, res) => {
    const website = await Website.findOne({ _id: req.params.websiteId, user: req.user._id });
    if (!website) {
        req.flash('error_msg', 'Website not found.');
        return res.redirect('/dashboard');
    }
    res.render('pages/dashboard/subdomain_settings', {
        title: `Subdomain Settings - ${website.name}`,
        website,
        appHostname: config.appHostname,
        mainAppCnameTarget: config.cloudflare.mainAppCnameTarget
    });
});

exports.updateSubdomain = catchAsync(async (req, res) => {
    const { websiteId } = req.params;
    let { newSubdomainPrefix } = req.body;

    if (!newSubdomainPrefix) {
        req.flash('error_msg', 'New subdomain prefix is required.'); return res.redirect('back');
    }
    newSubdomainPrefix = slugify(newSubdomainPrefix, { lower: true, strict: true, replacement: '-' }).replace(/^-+|-+$/g, '');
    if (!newSubdomainPrefix || newSubdomainPrefix.length < 3 || newSubdomainPrefix.length > 63) {
        req.flash('error_msg', 'Subdomain prefix must be between 3 and 63 alphanumeric characters or hyphens, not starting/ending with a hyphen.');
        return res.redirect('back');
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(newSubdomainPrefix)) {
        req.flash('error_msg', 'Invalid subdomain format. Use only lowercase letters, numbers, and hyphens (hyphens not at start/end).');
        return res.redirect('back');
    }

    const website = await Website.findOne({ _id: websiteId, user: req.user._id });
    if (!website) {
        req.flash('error_msg', 'Website not found.'); return res.redirect('/dashboard');
    }

    const oldSubdomainPrefix = website.subdomain?.prefix;
    if (oldSubdomainPrefix === newSubdomainPrefix) {
        req.flash('info_msg', 'Subdomain is already set to this value.'); return res.redirect('back');
    }

    const existingSiteWithNewSubdomain = await Website.findOne({ 'subdomain.prefix': newSubdomainPrefix, _id: { $ne: websiteId } });
    if (existingSiteWithNewSubdomain) {
        req.flash('error_msg', `Subdomain prefix '${newSubdomainPrefix}' is already taken. Please choose another.`);
        return res.redirect('back');
    }

    let dnsUpdateSuccess = true;
    let newRecordId = website.subdomain?.cloudflareRecordId; // Pertahankan ID lama jika ada, untuk diupdate oleh Cloudflare

    if (config.cloudflare.apiToken && config.isProduction && config.cloudflare.zoneId && config.cloudflare.mainAppCnameTarget) {
        if (oldSubdomainPrefix && website.subdomain?.isDnsActive) {
            const deleteResult = await deleteDnsCnameRecord(oldSubdomainPrefix);
            if (!deleteResult.success && deleteResult.message.indexOf('No CNAME record found') === -1) {
                req.flash('error_msg', `Could not remove old DNS record '${oldSubdomainPrefix}': ${deleteResult.message}. Subdomain update will proceed but old DNS might persist.`);
            }
        }
        const createResult = await createDnsCnameRecord(newSubdomainPrefix);
        if (createResult.success) {
            if (createResult.record && createResult.record.id) {
              newRecordId = createResult.record.id;
            }
        } else {
            dnsUpdateSuccess = false;
            req.flash('error_msg', `Failed to create new DNS record for '${newSubdomainPrefix}': ${createResult.message}. The subdomain in our database is updated, but it may not be live on the internet.`);
        }
    } else if (!config.isProduction) {
        req.flash('info_msg', 'DNS record management is skipped in development mode. Subdomain prefix updated locally.');
    } else {
        req.flash('warning_msg', 'Cloudflare is not fully configured. Subdomain prefix updated locally, but DNS not managed automatically.');
    }

    website.subdomain = {
        prefix: newSubdomainPrefix,
        isDnsActive: dnsUpdateSuccess,
        cloudflareRecordId: newRecordId
    };
    await website.save();

    if (dnsUpdateSuccess) {
        req.flash('success_msg', `Subdomain updated to '${newSubdomainPrefix}.${config.appHostname}'. DNS changes may take a few moments to propagate globally.`);
    }
    res.redirect(`/dashboard/websites/${websiteId}/subdomain`);
});

exports.deleteWebsite = catchAsync(async (req, res) => {
    const { websiteId } = req.params;
    const website = await Website.findOne({ _id: websiteId, user: req.user._id });
    if (!website) {
        req.flash('error_msg', 'Website not found or not authorized.'); return res.redirect('/dashboard');
    }
    const websiteName = website.name;
    const subdomainPrefixToDelete = website.subdomain?.prefix;

    await Page.deleteMany({ website: websiteId });
    await Website.deleteOne({ _id: websiteId });

    if (subdomainPrefixToDelete && config.cloudflare.apiToken && config.isProduction && website.subdomain?.isDnsActive) {
        const dnsDeleteResult = await deleteDnsCnameRecord(subdomainPrefixToDelete);
        if (dnsDeleteResult.success) {
            req.flash('info_msg', `DNS record for '${subdomainPrefixToDelete}.${config.appHostname}' has been removed.`);
        } else {
            req.flash('warning_msg', `Website deleted, but failed to remove its DNS record: ${dnsDeleteResult.message}. You may need to remove it manually from Cloudflare.`);
        }
    }
    req.flash('success_msg', `Website '${websiteName}' and all its pages have been successfully deleted.`);
    res.redirect('/dashboard');
});