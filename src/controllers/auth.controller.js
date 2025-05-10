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
  req.session.token = token;
  res.cookie('token', token, { httpOnly: true, secure: req.app.get('config').isProduction, maxAge: 24 * 60 * 60 * 1000 });
  req.flash('success_msg', 'Registration successful! You are now logged in.');
  res.redirect('/dashboard');
});

exports.loginUser = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    req.flash('error_msg', 'Please fill in all fields.');
    return res.redirect('/auth/login');
  }
  const user = await User.findOne({ email }).select('+password'); // Explicitly select password
  if (!user || !(await user.comparePassword(password))) {
    req.flash('error_msg', 'Invalid email or password.');
    return res.redirect('/auth/login');
  }
  const token = generateToken(user._id);
  req.session.token = token;
  res.cookie('token', token, { httpOnly: true, secure: req.app.get('config').isProduction, maxAge: 24 * 60 * 60 * 1000 });
  req.flash('success_msg', 'Login successful! Welcome back.');
  res.redirect('/dashboard');
});

exports.logoutUser = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Session destruction error:", err);
      req.flash('error_msg', 'Could not log out. Please try again.');
      return res.redirect('back');
    }
    res.clearCookie('token');
    res.clearCookie('connect.sid');
    req.flash('success_msg', 'You have been logged out.');
    res.redirect('/auth/login');
  });
};