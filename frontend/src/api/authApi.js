import axios from "axios";
const apiUrl = import.meta.env.VITE_API_URL
const API = axios.create({
  baseURL: `${apiUrl}/api/auth`, // your backend base URL
  withCredentials: true
});

export const sendOtp = async (phoneNumber, phoneSuffix, email) => {
  const response = await API.post("/send-otp", {
    phoneNumber,
    phoneSuffix,
    email
  });

  return response.data;
};

export const verifyOtp = async (phoneNumber, phoneSuffix, otp, email) => {
  const response = await API.post("/verify-otp", {
    phoneNumber,
    phoneSuffix,
    otp,
    email
  });

  return response.data;
};

export const updateUserProfile = async (formData) => {
  const response = await API.put("/update-profile", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

  return response.data;
};