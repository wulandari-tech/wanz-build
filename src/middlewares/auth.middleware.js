const User = require('../models/user.model');
const { verifyToken } = require('../utils/token.util');

const protectApi = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }
  if (!token) return res.status(401).json({ message: 'Not authorized, no token' });
  try {
    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ message: 'Not authorized, token failed' });
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'Not authorized, user not found' });
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token invalid' });
  }
};

const protectView = async (req, res, next) => {
  const token = req.session.token || req.cookies.token;
  if (!token) {
    req.flash('error_msg', 'Please log in to view this resource.');
    return res.redirect('/auth/login');
  }
  try {
    const decoded = verifyToken(token);
    if (!decoded) {
      req.flash('error_msg', 'Session expired. Please log in again.');
      if (req.session) req.session.destroy(); res.clearCookie('token');
      return res.redirect('/auth/login');
    }
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      req.flash('error_msg', 'User not found. Please log in again.');
      if (req.session) req.session.destroy(); res.clearCookie('token');
      return res.redirect('/auth/login');
    }
    req.user = user;
    res.locals.currentUser = user; // Ganti 'user' menjadi 'currentUser' untuk menghindari konflik di EJS
    next();
  } catch (error) {
    req.flash('error_msg', 'Authorization error. Please log in.');
    if (req.session) req.session.destroy(); res.clearCookie('token');
    return res.redirect('/auth/login');
  }
};

const ensureGuest = (req, res, next) => {
  const token = req.session.token || req.cookies.token;
  if (token && verifyToken(token)) return res.redirect('/dashboard');
  next();
};

module.exports = { protectApi, protectView, ensureGuest };