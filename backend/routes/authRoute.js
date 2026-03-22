const express = require("express")
const authController = require("../controllers/authControllers")
const authMiddleware = require("../middleware/authMiddleware")
const {multerMiddleware} = require("../config/cloudinaryConfig")
const router = express.Router()
// const {updateProfile} = require("../controllers/authControllers")


router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);


// protect router
router.put(
  "/update-profile",
  authMiddleware,
  multerMiddleware,
  authController.updateProfile
);

router.get("/logout", authController.logout)

router.get("/check-auth",authMiddleware, authController.checkAuthenticate)
router.get('/users', authMiddleware, authController.getAllUsers)
module.exports = router;