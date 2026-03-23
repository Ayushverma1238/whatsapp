import React from "react";
import useLoginStore from "../../store/useLoginStore";
import useUserStore from "../../store/useUserStore";
import { useState } from "react";
import countries from "../../utils/countriles";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import useThemeStore from "../../store/themeStore";
import { motion } from "framer-motion";
import { FaArrowLeft, FaChevronDown, FaPlus, FaUser, FaWhatsapp } from "react-icons/fa";
import Spinner from "../../utils/Spinner";
import { toast } from "react-toastify";
// import { sendOtp, verifyOtp, updateUserProfile } from "../../api/authApi";
import { sendOtp, verifyOtp, updateUserProfile } from "../../services/user_services"

const loginValidationSchema = yup
  .object()
  .shape({
    phoneNumber: yup.string().nullable().notRequired().matches(/^\d+$/, "Phone must be digits").transform((value, originaleValue) =>
      originaleValue.trim() === "" ? null: value
    ),
    email: yup.string().nullable().notRequired().email("Invalid email").transform((value, originaleValue) =>
      originaleValue.trim() ==="" ? null: value
    )
  })
  .test(
    "at-least-one",
    "Either email or phone number is required",
    (value) => value.phoneNumber || value.email,
  );

const otpValidationSchema = yup.object().shape({
  otp: yup
    .string()
    .length(6, "Otp must be exactly 6 length")
    .required("Otp is required"),
});

const profileValidationSchema = yup.object().shape({
  username: yup.string().required("Username is required"),
  agreed: yup.bool().oneOf([true], "you must agree to the terms"),
});

const avatars = [
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Mimi",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Jasper",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Luna",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Zoe",
];

const Login = () => {
  const { step, userPhoneData, setStep, setUserPhoneData, resetLoginState } =
    useLoginStore();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [email, setEmail] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(avatars[0]);
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [error, setError] = useState("");
  const [showDropdown, setshowDropdown] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useUserStore();
  const [searchTerm, setsearchTerm] = useState("");
  const { theme, setTheme } = useThemeStore();
  const [loading, setLoading] = useState(false);


  const filterCountry = countries.filter(
    (country) =>
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.dialCode.includes(searchTerm),
  );

  const {
    register: loginRegister,
    formState: { errors: loginErrors },
    handleSubmit: handleLoginSubmit,
  } = useForm({
    resolver: yupResolver(loginValidationSchema),
  });
  const {
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors },
    setValue: setOtpValue,
  } = useForm({
    resolver: yupResolver(otpValidationSchema),
  });

  const {
    register: profileRegister,
    formState: { errors: profileError },
    handleSubmit: handleProfileSubmit,
    watch
  } = useForm({
    resolver: yupResolver(profileValidationSchema),
  });

  const ProgressBar = () => (
    <div
      className={`w-full ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"} rounded-full h-2.5 mb-6`}
    >
      <div
        className="bg-green-500 h-2.5 rounded-full transition-all duration-500 ease-in-out"
        style={{ width: `${(step / 3) * 100}%` }}
      ></div>
    </div>
  );
const onLoginSubmit = async (data) => {
  setLoading(true);
  setError(null); // Clear previous errors
  try {
    let response;
    
    if (email?.trim()) {
      // Sending OTP via Email
      response = await sendOtp(null, null, email);
      if (response.status === "success") {
        toast.info("OTP sent to your email");
        setUserPhoneData({ email });
        setStep(2);
      }
    } else if (phoneNumber) {
      // Sending OTP via Phone
      response = await sendOtp(phoneNumber, selectedCountry.dialCode);
      if (response.status === "success") {
        toast.info("OTP sent to your mobile number");
        setUserPhoneData({
          phoneNumber,
          phoneSuffix: selectedCountry.dialCode,
        });
        setStep(2);
      }
    } else {
      toast.warning("Please enter an email or phone number");
    }
  } catch (error) {
    console.error("Login Error:", error);
    const msg = error?.response?.data?.message || error.message || "Failed to send OTP";
    setError(msg);
    toast.error(msg);
  } finally {
    setLoading(false);
  }
};

  const onOtpSubmit = async () => {
  try {
    setLoading(true);
    
    if (!userPhoneData) {
      throw new Error("Phone no or email data is missing");
    }

    const otpString = otp.join("");
    let response;
    
    if (userPhoneData?.email) {
      response = await verifyOtp(null, null, otpString, userPhoneData.email);
    } else {
      response = await verifyOtp(
        userPhoneData.phoneNumber,
        userPhoneData.phoneSuffix,
        otpString
      );
    }
      if (response.status === "success") {
        toast.success("OTP verify successfully");
        const token = response?.data?.token;
        localStorage.setItem('auth_token', token)
        const user = response.data?.user;
        if (user?.username && user?.profilePicture) {
          setUser(user);

          toast.success("Welcome back to Whatsapp");
          navigate("/");
          resetLoginState();
        } else {
          setStep(3);
        }
      }
    } catch (error) {
      console.error(error);
      setError(error.message || "failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePictureFile(file);
      setProfilePicture(URL.createObjectURL(file));
    }
  };

  const handleOtpChange = (index, value) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpValue("otp", newOtp.join(""));
    if (value && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`);
      if (next) next.focus();
    }
  };

  const handleBack = () => {
    setStep(1);
    setUserPhoneData(null);
    setOtp(["", "", "", "", "", ""]);
    setError("");
  };

  const onProfileSubmit = async (data) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("username", data.username);
      formData.append("agreed", data.agreed);
      if (profilePictureFile) {
        formData.append("media", profilePictureFile);
      } else {
        formData.append("profilePicture", selectedAvatar);
      }

      await updateUserProfile(formData);
      toast.success("Welcome back to WhatsApp");
      navigate("/");
      resetLoginState();
    } catch (error) {
      console.error(error);
      setError(error.message || "failed to update user profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen ${
        theme === "dark"
          ? "bg-gray-900"
          : "bg-linear-to-br from-green-400 to-blue-500"
      } flex items-center justify-center p-4 overflow-hidden`}
    >
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 1,
        }}
        className={`${theme === "dark" ? "bg-gray-800 text-white" : "bg-white"} p-6 md:p-8 rounded-lg shadow-2xl w-full max-w-md relative z-10`}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            duration: 0.2,
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
          className={`w-24 h-24 bg-green-500 rounded-full mx-auto mb-6 flex items-center justify-center`}
        >
          <FaWhatsapp className="w-16 h-16 text-white" />
        </motion.div>

        <h1
          className={`text-3xl font-bold text-center mb-6 ${theme === "dark" ? "text-white" : "text-gray-800"} `}
        >
          WhatsApp Login
        </h1>
        <ProgressBar />

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        {step === 1 && (
          <form
            className="space-y-4"
            onSubmit={handleLoginSubmit(onLoginSubmit)}
          >
            <p
              className={`text-center ${theme === "dark" ? "text-gray-200" : "text-gray-600"}`}
            >
              Enter your phone no to receive otp
            </p>
            <div className="relative">
              <div className="flex">
                <div className="relative w-1/3">
                  <button
                    type="button"
                    className={`shrink-0 z-10 inline-flex items-center py-2.5 px-4 text-sm font-medium text-center ${theme === "dark" ? "text-white bg-gray-700 border-gray-600" : "text-gray-900 bg-gray-100 border-gray-300"} border rounded-s-lg hover:border-gray-200 focus:ring-4 focus:outline-none focus:ring-gray-100`}
                    onClick={() => {
                      setshowDropdown(!showDropdown);
                    }}
                  >
                    <span className="flex gap-1 items-center">
                      <img
                        src={`https://flagcdn.com/w40/${selectedCountry.alpha2.toLowerCase()}.png`}
                        alt={selectedCountry.name}
                        className="w-5 h-3"
                      />{" "}
                      {selectedCountry.dialCode}
                    </span>
                    <FaChevronDown className="ml-2" />
                  </button>
                  {showDropdown && (
                    <div
                      className={`absolute z-10 w-full mt-1 ${theme === "dark" ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"} border rounded-md shadow-lg max-h-60 overflow-auto`}
                    >
                      <div
                        className={`sticky top-0 ${theme === "dark" ? "bg-gray-700" : "bg-white"} p-2`}
                      >
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setsearchTerm(e.target.value)}
                          name=""
                          id=""
                          placeholder="Search Countries..."
                          className={`w-full px-2 py-1 border ${theme === "dark" ? "bg-gray-600 text-white border-gray-500" : "bg-white border-gray-300"} rounded-md text-sm focus:outline-none focus:ring-green-500 `}
                        />
                      </div>
                      {filterCountry.map((country) => (
                        <button
                          type="button"
                          key={country.alpha2}
                          className={`w-full text-left px-3 py-2 ${
                            theme === "dark"
                              ? "hover:bg-gray-600"
                              : "hover:bg-gray-100"
                          } focus:outline-none focus:bg-gray-100`}
                          onClick={() => {
                            setSelectedCountry(country);
                            setshowDropdown(false);
                          }}
                        >
                          <span className="flex gap-1 items-center">
                            <img
                              src={`https://flagcdn.com/w40/${country.alpha2.toLowerCase()}.png`}
                              alt={country.name}
                              className="w-5 h-3"
                            />{" "}
                            {country.dialCode} {country.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  {...loginRegister("phoneNumber")}
                  value={phoneNumber}
                  placeholder="Phone Number"
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className={`w-2/3 px-4 py-2 border ${theme === "dark" ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-black"} rounded-md focus:outline-none focus:ring-green-500 ${loginErrors.phoneNumber ? "border-red-500" : ""} `}
                />
              </div>

              {loginErrors.phoneNumber && (
                <p className="text-red-500 text-sm">
                  {loginError.phoneNumber.message}
                </p>
              )}
            </div>
            {/* divider with or */}
            <div className="flex items-center my-4">
              <div className="grow h-px bg-gray-300"></div>
              <span className="mx-3 text-gray-500 text-sm font-medium">or</span>
              <div className="grow h-px bg-gray-300"></div>
            </div>

            {/* email input box */}
            <div
              className={`flex items-center border rounded-md px-3 py-2 ${theme === "dark" ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"}`}
            >
              <FaUser
                className={`mr-2 text-gray-400 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
              />
              <input
                type="email"
                {...loginRegister("email")}
                value={email}
                placeholder="Email(optional)"
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full bg-transparent px-4 py-1 
${theme === "dark" ? "text-white" : "text-black"} 
focus:outline-none focus:ring-0 
${loginErrors.email ? "border-red-500" : ""}`}
              />
            </div>
            {loginErrors.email && (
              <p className="text-red-500 text-sm">{loginError.email.message}</p>
            )}

            <button
              type="submit"
              className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition-all duration-200 ease-in-out"
            >
              {loading ? <Spinner /> : "Send OTP"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form
            onSubmit={handleOtpSubmit(onOtpSubmit)}
            className="space-y-4"
          >
            <p
              className={`text-center ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              } mb-4`}
            >
              Please enter the 6-digit otp send to your{" "}
              {userPhoneData?.phoneSuffix ? userPhoneData.phoneSuffix : "Email"}{" "}
              {userPhoneData?.phoneNumber
                ? userPhoneData.phoneNumber
                : userPhoneData?.email}
            </p>
            <div className="flex justify-between">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  className={`w-12 h-12 text-center border ${theme === "dark" ? "bg-gray-700 border-gray-600 text-white" : "bg-white text-black border-gray-300"} rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${otpErrors.otp ? "border-red-500" : ""}`}
                />
              ))}
            </div>
            {otpErrors.otp && (
              <p className="text-red-500 text-sm">{otpErrors.otp.message}</p>
            )}
            <button
              type="submit"
              className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition-all duration-200 ease-in-out"
            >
              {loading ? <Spinner /> : "Verify OTP"}
            </button>

            <button
              type="button"
              onClick={handleBack}
              className={`w-full mt-2 ${theme === "dark" ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"} py-2 rounded-md hover:bg-gray-300 transition-all duration-200 flex items-center justify-center ease-in-out`}
            >
              <FaArrowLeft className="mr-2" />
              Wrong number? Go back
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className ="space-y-4">
            <div className="flex flex-col items-center mb-4">
              <div className="relative w-24 h-24 mb-2">
                <img className="w-full h-full rounded-full object-cover" src={profilePicture || selectedAvatar} alt="profile Picture" />
                <label htmlFor="profile-picture" className="absolute bottom-0 right-0 bg-green-500 text-white p-2 rounded-full cursor-pointer hover:bg-green-600 transition-all duration-300"><FaPlus className={`w-4 h-4`} /></label>

                <input className="hidden" type="file" id="profile-picture" accept="image/*" onChange={handleFileChange} />

              </div>
              
              <p className={`text-sm ${theme === 'dark' ? "text-gray-300" : "text-gray-500"} mb-2`}>Choose an avatar</p>
              <div className="flex flex-wrap justify-center gap-2">
                {avatars.map((avatar, index) =>(
                  <img
                    onClick={() => setSelectedAvatar(avatar)}
                  key={index} src={avatar} alt={`Avatar ${index +1}`}  className={`w-12 h-12 rounded-full cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-110 ${selectedAvatar === avatar ? "ring-2 ring-green-500": ""} `}/>

                ))}
              </div>
            </div>


            <div className="relative">
              <FaUser className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === 'dark' ? "text-gray-400":'text-gray-600'}`} />
                <input 
                {...profileRegister('username')}
                type="text"
                placeholder="Username"
                className={`w-full pl-10 pr-3 py-2 border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : "border-gray-300 text-black bg-white"} rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-lg`}
                 />
                 {profileError.username && (
                  <p className="text-red-500 text-sm mt-1">{profileError.username.message}</p>
                 )}
            </div>

            <div className="flex items-center space-x-2">
              <input {...profileRegister('agreed')}
              className={`rounded ${theme === 'dark' ? 'text-green-500 bg-gray-700' : 'text-green-500'} focus:ring-1 focus:ring-gray-800`}
              type="checkbox" />
              <label htmlFor="terms" 
              className={`text-sm ${theme === 'dark' ? "text-gray-300": 'text-gray-700'}`}
              >
                I agree to the {" "} <a className="text-blue-500 hover:underline" href="#">Term and Conditions</a>
              </label>

              {profileError.agreed && (
                <p className="text-red-500 text-sm mb-1">
                  {profileError.agreed.message}
                </p>
              )}
            </div>
             <button
              type="submit"
              disabled ={!watch("agreed") || loading}
              className={`w-full hover:bg-green-600 bg-green-500 transform hover:scale-105 flex items-center justify-center text-lg text-white py-3 px-4 font-bold rounded-md ${loading? "opacity-50 cursor-not-allowed": ""} transition-all duration-300 ease-in-out`}
            >
              {loading ? <Spinner /> : "Create Profile"}
            </button>
          </form>

        )}
      </motion.div>
    </div>
  );
};

export default Login;
