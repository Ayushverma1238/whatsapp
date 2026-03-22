const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  phoneNumber: { type: String, unique: true, sparse: true },
  phoneSuffix: { type: String, unique: false },
  email: {
    type: String,
    lowercase: true,
    validate: {
      validator: function (v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: (props) => `${props.value} is not a valid email address!`,
    },
  },
  emailOtp: { type: String },
  emailOtpExpire: { type: Date },
  profilePicture: { type: String },
  username: { type: String },
  about:{type:String},
  lastSeen:{type:Date},
  isOnline:{type:Boolean, default:false},
  isVerified:{type:Boolean, default:false},
  agreed:{type:Boolean, default:false},
},{timestamps:true});

const User = mongoose.model("User", UserSchema);

module.exports = User;
