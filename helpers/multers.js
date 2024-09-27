const multer = require('multer');

// Setup multer to store files in memory (no immediate saving to disk)
const storage = multer.memoryStorage();

const upload = multer({ storage: storage });

module.exports = {
  upload
};
