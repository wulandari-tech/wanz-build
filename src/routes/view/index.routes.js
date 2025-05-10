const express = require('express');
const router = express.Router();
router.get('/', (req, res) => {
  res.render('pages/index', { title: 'WanzOFC Site Builder - Create Your Website' });
});
module.exports = router;