const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
require('dotenv').config(); // <--- ADD THIS LINE HERE

// Debugging: This will tell us if the key is actually reaching the file
if (!process.env.CLOUDINARY_API_KEY) {
    console.error("FATAL ERROR: CLOUDINARY_API_KEY is missing from process.env");
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadFileToCloudinary = (file) => {
    // Safety check for the file object
    if (!file || !file.path) {
        return Promise.reject(new Error("No file provided for upload"));
    }

    const options = {
        resource_type: file.mimetype.startsWith('video') ? "video" : "image",
        folder: "whatsapp_uploads" // Optional: keeps your Cloudinary clean
    };   

    return new Promise((resolve, reject) => {
        // Use auto-detection or ternary logic as you had it
        const uploader = file.mimetype.startsWith("video")
            ? cloudinary.uploader.upload_large
            : cloudinary.uploader.upload;

        uploader(file.path, options, (error, result) => {
            // Clean up local temp file
            if (fs.existsSync(file.path)) {
                fs.unlink(file.path, (err) => {
                    if (err) console.error("FS Unlink Error:", err);
                });
            }

            if (error) {
                console.error("Cloudinary Upload Error:", error);
                return reject(error);
            }
            resolve(result);
        });
    });
};

// Multer setup - ensure the 'upload/' directory exists or use /tmp
const multerMiddleware = multer({ dest: 'upload/' }).single('media');

module.exports = {
    uploadFileToCloudinary,
    multerMiddleware
};