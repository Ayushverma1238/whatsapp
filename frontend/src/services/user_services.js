import axiosInstance from "./url_service";

export const sendOtp = async (phoneNumber, phoneSuffix, email) => {
  try {
    const response = await axiosInstance.post("/auth/send-otp", {
      phoneNumber,
      phoneSuffix,
      email,
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

export const verifyOtp = async (phoneNumber, phoneSuffix, otp, email) => {
  const response = await axiosInstance.post("/auth/verify-otp", {
    phoneNumber,
    phoneSuffix,
    otp,
    email,
  });

  return response.data;
};

export const updateUserProfile = async (formData) => {
  const response = await axiosInstance.put("/auth/update-profile", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

export const checkUserAuth = async () => {
  try {
    const response = await axiosInstance.get("/auth/check-auth");

    if (response.data.status === "success") {
      return {
        isAuthenticated: true,
        user: response?.data?.data,
      };
    }
    return { isAuthenticated: false };
  } catch (error) {
    console.warn("Auth check: User is not logged in (401).");

    return {
      isAuthenticated: false,
      user: null,
      error: error.response?.data?.message || error.message,
    };
  }
};

export const logoutUser = async () => {
  try {
    const response = await axiosInstance.get("/auth/logout");
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

export const getAllUsers = async () => {
  try {
    const response = await axiosInstance.get("/auth/users");
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};
