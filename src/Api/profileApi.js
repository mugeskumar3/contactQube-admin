import apiClient from "../config";

// Get Profile API Call
// Fetches user profile info from the server and checks response status
export const profileApi = async () => {
    const response = await apiClient.get("/auth/profile");
    const resData = response.data;

    // Check both standard HTTP status and custom body status/success fields
    if (response.status === 200 || resData?.success || resData?.statusCode === 200) {
        return resData;
    }

    throw new Error(resData?.message || "Failed to retrieve profile data.");
};

// Update Profile API Call
// Updates user profile info on the server by adminId
export const updateProfileApi = async (adminId, updateData) => {
    const response = await apiClient.put(`/adminUser/${encodeURIComponent(adminId)}`, updateData);
    const resData = response.data;

    // Check both standard HTTP status and custom body status/success fields
    if (response.status === 200 || resData?.success || resData?.statusCode === 200) {
        return resData;
    }

    throw new Error(resData?.message || "Failed to update profile data.");
};

// Delete Admin User API Call
// Deletes an admin user account on the server by adminId
export const deleteAdminUserApi = async (adminId) => {
    const response = await apiClient.delete(`/adminUser/${encodeURIComponent(adminId)}`);
    const resData = response.data;

    // Check both standard HTTP status and custom body status/success fields
    if (response.status === 200 || resData?.success || resData?.statusCode === 200) {
        return resData;
    }

    throw new Error(resData?.message || "Failed to delete administrator account.");
};

// Get Admin Users API Call
// Fetches all admin users from the server with optional filters
export const getAdminUsersApi = async ({ page = 0, limit = 10, search = '', roleId = '', isActive = '' } = {}) => {
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('limit', limit);
    if (search) params.set('search', search);
    if (roleId && roleId !== 'all') params.set('roleId', roleId);
    if (isActive !== undefined && isActive !== '') params.set('isActive', isActive);

    const response = await apiClient.get(`/adminUser?${params.toString()}`);
    const resData = response.data;

    // Check both standard HTTP status and custom body status/success fields
    if (response.status === 200 || resData?.success || resData?.status === 200 || resData?.statusCode === 200) {
        return resData;
    }

    throw new Error(resData?.message || "Failed to retrieve administrator users.");
};

// Get Admin User By ID API Call
// Fetches one admin user from the server by adminId
export const getAdminUserByIdApi = async (adminId) => {
    const response = await apiClient.get(`/adminUser/${encodeURIComponent(adminId)}`);
    const resData = response.data;

    if (response.status === 200 || resData?.success || resData?.status === 200 || resData?.statusCode === 200) {
        return resData;
    }

    throw new Error(resData?.message || "Failed to retrieve administrator account.");
};

// Create Admin User API Call
// Creates a new admin user on the server
export const createAdminUserApi = async (adminData) => {
    const response = await apiClient.post("/adminUser", adminData);
    const resData = response.data;

    // Check both standard HTTP status and custom body status/success fields
    if (response.status === 200 || response.status === 201 || resData?.success || resData?.status === 200 || resData?.statusCode === 200 || resData?.statusCode === 201) {
        return resData;
    }

    throw new Error(resData?.message || "Failed to create administrator account.");
};

// Update Admin User API Call
// Updates an admin user's details on the server by adminId
export const updateAdminUserApi = async (adminId, updateData) => {
    const response = await apiClient.put(`/adminUser/${encodeURIComponent(adminId)}`, updateData);
    const resData = response.data;

    // Check both standard HTTP status and custom body status/success fields
    if (response.status === 200 || resData?.success || resData?.statusCode === 200) {
        return resData;
    }

    throw new Error(resData?.message || "Failed to update administrator account.");
};

// View Admin Users API Call
export const viewAdminUsersApi = async () => {
    const response = await apiClient.get("/adminUser");
    const resData = response.data;

    // Check both standard HTTP status and custom body status/success fields
    if (response.status === 200 || resData?.success || resData?.statusCode === 200) {
        return resData;
    }

    throw new Error(resData?.message || "Failed to retrieve administrator accounts.");
};
