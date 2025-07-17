const multer = require("multer");

const upload = multer({
    storage: multer.memoryStorage(), // Use memory storage to keep files as buffers
    limits: {
        fileSize: 1000000, // 1MB = 1,000,000 bytes (matches frontend configuration)
    },
});

/**
 * Middleware to handle multer errors, especially file size limits
 */
const handleUploadErrors = (req, res, next) => {
    upload.single("file")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    error: "File size exceeds the maximum limit of 1MB. Please select a smaller file."
                });
            }
            if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                return res.status(400).json({
                    error: "Unexpected file upload. Please ensure you're uploading a single text file."
                });
            }
            // Handle other multer errors
            return res.status(400).json({
                error: `File upload error: ${err.message}`
            });
        } else if (err) {
            // Handle other non-multer errors
            return res.status(500).json({
                error: "An error occurred while processing the file upload."
            });
        }
        next();
    });
};

module.exports = {
    handleUploadErrors,
}; 