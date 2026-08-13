import apiClient from "../config";

// Login API Call
// Sends credentials to server and gets back JWT token + admin info
export const loginApi = async (phoneNumber, pin) => {
  const response = await apiClient.post("/auth/login", { phoneNumber, pin });
  return response.data;
};

// Forgot PIN OTP Request
export const requestOtpApi = async (phoneNumber) => {
  const response = await apiClient.post("/auth/pin/forgot/request-otp", { phoneNumber });
  return response.data;
};

// Forgot PIN OTP Verification
export const verifyOtpApi = async (phoneNumber, otp) => {
  const response = await apiClient.post("/auth/pin/forgot/verify-otp", { phoneNumber, otp });
  return response.data;
};

// Forgot PIN Reset
export const resetPinApi = async (phoneNumber, otp, newPin) => {
  const response = await apiClient.post("/auth/pin/forgot/reset", { phoneNumber, otp, newPin });
  return response.data;
};
  