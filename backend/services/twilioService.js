const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

const client = twilio(accountSid, authToken);
const sendOtpToPhoneNo = async (phoneNumber) => {
  try {
    console.log("Sending otp to this no", phoneNumber);
   
    if (!phoneNumber) {
      throw new Error("Phone number is required");
    }

    const response = await client.verify.v2
      .services(serviceSid)
      .verifications.create({
        to: phoneNumber,
        channel: "sms",
      });

    console.log("OTP sent:", response.status);

    return response;
  } catch (error) {
    console.log(error);
    throw new Error("Failed to send otp");
  }
};

// const client = require("../config/twilio");

const verifyOtp = async (phone, otp) => {
  try {
       console.log("Verify SID:", process.env.twilio_SERVICE_SID);

    const verification = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({
        to: phone,
        code: otp,
      });

    console.log("Verification result:", verification.status);

    return verification;

  } catch (error) {
    console.log(error);
    throw new Error("Otp verification failed");
  }
};

module.exports = {
  verifyOtp,
};

module.exports = {
  sendOtpToPhoneNo,
  verifyOtp,
};