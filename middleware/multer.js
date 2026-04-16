const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const userId = req.user?._id || 'new-user';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `avatar-${userId}-${uniqueSuffix}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 3 * 1024 * 1024 }
});

// Wrapper to handle multer errors gracefully without crashing the server
const handleUpload = (field) => {
    return function(req, res, next) {
        const singleUpload = upload.single(field);
        singleUpload(req, res, function(err) {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
            } else if (err) {
                return res.status(400).json({ success: false, message: err.message });
            }
            // Ensure next() is called to proceed to the controller
            if (typeof next === 'function') {
                return next();
            } else {
                console.error('next is not a function inside handleUpload');
                return res.status(500).json({ success: false, message: 'Server configuration error.' });
            }
        });
    };
};

module.exports = {
    upload,
    handleUpload
};
