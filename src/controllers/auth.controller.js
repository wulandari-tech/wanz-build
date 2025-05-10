// src/controllers/auth.controller.js
const User = require('../models/user.model');
const { generateToken } = require('../utils/token.util');
const { catchAsync } = require('../middlewares/error.middleware');

exports.getLoginPage = (req, res) => {
  res.render('pages/auth/login', { title: 'Login - WanzOFC Site Builder' });
};

exports.getRegisterPage = (req, res) => {
  res.render('pages/auth/register', { title: 'Register - WanzOFC Site Builder' });
};

exports.registerUser = catchAsync(async (req, res, next) => {
  const { username, email, password, confirmPassword } = req.body;
  if (password !== confirmPassword) {
    req.flash('error_msg', 'Passwords do not match.');
    return res.redirect('/auth/register');
  }
  let user = await User.findOne({ $or: [{ email }, { username }] });
  if (user) {
    req.flash('error_msg', 'Email or Username already exists.');
    return res.redirect('/auth/register');
  }
  user = await User.create({ username, email, password });
  const token = generateToken(user._id);

  // Set session dan cookie
  req.session.token = token;
  // req.session.userId = user._id; // Jika Anda ingin menyimpan ID user juga di session
  res.cookie('token', token, {
      httpOnly: true,
      secure: req.app.get('config').isProduction, // Ambil dari app config
      maxAge: 24 * 60 * 60 * 1000 // 1 hari
  });

  req.flash('success_msg', 'Registration successful! You are now logged in.');
  res.redirect('/dashboard');
});

exports.loginUser = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    req.flash('error_msg', 'Please fill in all fields.');
    return res.redirect('/auth/login');
  }

  // Ambil password secara eksplisit karena mungkin di-select:false di model
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    req.flash('error_msg', 'Invalid email or password.');
    return res.redirect('/auth/login');
  }

  const token = generateToken(user._id);
  req.session.token = token;
  // req.session.userId = user._id;
  res.cookie('token', token, {
      httpOnly: true,
      secure: req.app.get('config').isProduction,
      maxAge: 24 * 60 * 60 * 1000
  });

  req.flash('success_msg', 'Login successful! Welcome back.');
  res.redirect('/dashboard');
});

exports.logoutUser = (req, res, next) => { // Tambahkan next untuk error handling jika perlu
  // Simpan pesan flash SEBELUM sesi dihancurkan, karena flash disimpan di sesi.
  // Namun, untuk logout, pesan flash ini mungkin tidak akan pernah terlihat
  // karena sesi akan hilang saat redirect.
  // Alternatif: Jangan gunakan flash untuk logout, atau set cookie untuk pesan singkat.

  // Opsi 1: Tanpa flash, langsung redirect
  // req.session.destroy(err => {
  //   if (err) {
  //     console.error("Session destruction error:", err);
  //     // Untuk error internal, lebih baik teruskan ke global error handler
  //     return next(new Error('Could not log out. Please try again.'));
  //   }
  //   res.clearCookie('token');
  //   res.clearCookie('connect.sid'); // Hapus cookie session default express-session
  //   res.redirect('/auth/login');
  // });

  // Opsi 2: Coba set flash, tapi sadar mungkin tidak tampil
  // Atau, kita bisa mengandalkan middleware res.locals untuk pesan logout
  // if (req.session) { // Hanya set flash jika sesi masih ada
  //   req.flash('success_msg', 'You have been logged out.');
  // }
  // Hapus token dari session dan cookie
  if (req.session) {
    delete req.session.token;
    // delete req.session.userId; // Jika Anda menyimpannya
  }
  res.clearCookie('token');

  // Hancurkan sesi
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        console.error("Session destruction error during logout:", err);
        // Teruskan error ke middleware error handler global
        // Pesan flash mungkin tidak akan efektif di sini karena sesi sudah bermasalah
        return next(new Error('An error occurred during logout. Please try again.'));
      }
      // Hapus cookie session default express-session setelah sesi dihancurkan
      res.clearCookie('connect.sid');
      // Flash message mungkin tidak bisa di-set di sini karena sesi sudah dihancurkan
      // Lebih baik redirect saja, atau set cookie untuk pesan logout jika sangat perlu.
      // Untuk kesederhanaan, kita redirect saja. Pesan sukses bisa ditampilkan di halaman login jika diinginkan.
      return res.redirect('/auth/login'); // Pastikan ada return di sini
    });
  } else {
    // Jika sesi sudah tidak ada (misalnya, sudah logout sebelumnya atau cookie session hilang)
    res.clearCookie('connect.sid');
    return res.redirect('/auth/login'); // Pastikan ada return di sini
  }
};


// API Login (jika masih digunakan)
exports.apiLoginUser = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = generateToken(user._id);
    res.status(200).json({ token, userId: user._id, username: user.username });
});