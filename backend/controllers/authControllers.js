const otpGenerate = require("../utils/otpGenerate");
const User = require("../models/User");
const response = require("../utils/responseHandler");
const { sendOtpToEmail } = require("../services/emailService");
// Send Otp
const Conversation = require("../models/Conversation")
const twilioService = require("../services/twilioService");
const generateToken = require("../utils/generateTokens");
const {uploadFileToCloudinary} = require("../config/cloudinaryConfig");

const sendOtp = async (req, res) => {
  
  const { phoneNumber, phoneSuffix, email } = req.body;
  const otp = otpGenerate();
  const expiry = new Date(Date.now() + 5 * 60 * 1000);
  let user;
  try {
    if (email) {
      user = await User.findOne({ email });
      if (!user) {
        user = new User({ email });
      }

      user.emailOtp = otp;
      user.emailOtpExpire = expiry;
      await user.save();
      await sendOtpToEmail(email, otp);
      return response(res, 200, "Otp send to your email", { email });
    }

    if (!phoneNumber || !phoneSuffix) {
      return response(res, 400, "Phone no and phone suffix are required.");
    }

    const fullPhoneNo = `${phoneSuffix}${phoneNumber}`;
    user = await User.findOne({ phoneNumber, phoneSuffix });

    if (!user) {
      user = new User({ phoneNumber, phoneSuffix });
    }
    await twilioService.sendOtpToPhoneNo(fullPhoneNo);
    await user.save();

    return response(res, 200, "Otp send successfully", {
      phoneNumber,
      phoneSuffix,
    });
  } catch (error) {
    console.log(error);

    return response(res, 500, "Internal server error");
  }
};

const verifyOtp = async (req, res) => {
  const { phoneNumber, phoneSuffix, email, otp } = req.body;

  try {
    let user;
    if (email) {
      user = await User.findOne({ email });
      if (!user) {
        return response(res, 404, "User not found");
      }
      const now = new Date();
      if (
        !user.emailOtp ||
        String(user.emailOtp) !== String(otp) ||
        now > new Date(user.emailOtpExpire)
      ) {
        return response(res, 400, "Invalid or Expired otp");
      }

      user.isVerified = true;
      user.emailOtp = null;
      user.emailOtpExpire = null;
      await user.save();
    } else {
      if (!phoneNumber || !phoneSuffix) {
        return response(res, 400, "Phone no and phone suffix are required.");
      }
      const fullPhoneNo = `${phoneSuffix}${phoneNumber}`;
      user = await User.findOne({ phoneNumber, phoneSuffix });
      if (!user) {
        return response(res, 404, "User not found");
      }

      const result = await twilioService.verifyOtp(fullPhoneNo, otp);
      if (result.status !== "approved") {
        return response(res, 400, "Invalid otp");
      }
      user.isVerified = true;
      await user.save();
    }

    const token = generateToken(user);
    res.cookie("auth_token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365,
    });

    return response(res, 200, "Otp verified successfully", { token, user });
  } catch (error) {
    console.log(error);

    return response(res, 500, "Internal server error");
  }
};

const updateProfile = async (req, res) => {
  // 1. Destructure profilePicture from req.body (for avatars)
  const { username, agreed, about, profilePicture } = req.body;
  const userId = req.user._id;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return response(res, 404, "User not found");
    }

    // 2. Handle File Upload (Priority)
    if (req.file) {
      const uploadResult = await uploadFileToCloudinary(req.file);
      user.profilePicture = uploadResult.secure_url;
    } 
    // 3. Handle Avatar Selection (Fallback)
    else if (profilePicture) {
      // If no file was uploaded, check if an avatar URL was sent
      user.profilePicture = profilePicture;
    }

    if (username) user.username = username;
    if (agreed !== undefined) user.agreed = agreed;
    if (about) user.about = about;

    await user.save();

    return response(res, 200, "User profile updated successfully", user);
  } catch (error) {
    console.log(error);
    return response(res, 500, "Update profile error");
  }
};

const logout = (req, res) => {
  try {
    res.cookie("auth_token", "", {
      httpOnly: true,
      expires: new Date(0),
    });
    return response(res, 200, "User logout successfully");
  } catch (error) {
    console.log(error);

    return response(res, 500, "User logout error");
  }
};

const checkAuthenticate = async(req, res) =>{
  try {
    const userId = req.user.userId;
    if(!userId){
      return response(req, 404, "Unauthorized ! please login before access our app");
    }
    const user =await User.findById(userId);
    if(!user){
      return response(req, 404, "User not found");

    }
    return response(res, 200, "User retrived and allow to use whatsapp", user);
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
}


const getAllUsers = async (req, res) => {
  const loggedUser = req.user.userId;

  try {
    const users = await User.find({ _id: { $ne: loggedUser } })
      .select(
        "username profilePicture lastSeen isOnline about phoneNumber phoneSuffix"
      )
      .lean();

    const usersWithConversation = await Promise.all(
      users.map(async (user) => {
        const conversation = await Conversation.findOne({
          participants: { $all: [loggedUser, user._id] },
        })
          .populate({
            path: "lastMessage",
            select: "content createdAt sender receiver",
          })
          .lean();

        return {
          ...user,
          conversation: conversation || null,
        };
      })
    );

    return response(
      res,
      200,
      "Users retrieved successfully",
      usersWithConversation
    );
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  updateProfile,
  logout,
  checkAuthenticate,
  getAllUsers,
};
