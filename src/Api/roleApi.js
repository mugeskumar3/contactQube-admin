import apiClient from "../config";

// Get Modules List API Call
// Fetches all modules from the server with pagination params
export const getModulesApi = async ({ page = 0, limit = 0 } = {}) => {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('limit', limit);
  const response = await apiClient.get(`/modules/list?${params.toString()}`);
  const resData = response.data;

  if (response.status === 200 || resData?.success || resData?.status === 200 || resData?.statusCode === 200) {
    return resData;
  }

  throw new Error(resData?.message || "Failed to retrieve modules.");
};

// Get Roles List API Call
// Fetches all roles from the server with pagination params
export const getRolesApi = async ({ page = 0, limit = 0, search = '', isActive = '' } = {}) => {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('limit', limit);
  if (search) params.set('search', search);
  if (isActive !== undefined && isActive !== null && isActive !== '') {
    params.set('isActive', isActive);
  }
  const response = await apiClient.get(`/role/list?${params.toString()}`);
  const resData = response.data;

  // Check both standard HTTP status and custom body status/success fields
  if (response.status === 200 || resData?.success || resData?.status === 200 || resData?.statusCode === 200) {
    return resData;
  }

  throw new Error(resData?.message || "Failed to retrieve user roles.");
};

// Get Role By ID API Call
// Fetches a single role from the server by roleId
export const getRoleByIdApi = async (roleId) => {
  const response = await apiClient.get(`/role/${roleId}`);
  const resData = response.data;

  if (response.status === 200 || resData?.success || resData?.status === 200 || resData?.statusCode === 200) {
    return resData;
  }

  throw new Error(resData?.message || "Failed to retrieve user role.");
};

// Create Role API Call
// Creates a new role on the server
export const createRoleApi = async (roleData) => {
  const response = await apiClient.post("/role", roleData);
  const resData = response.data;

  // Check both standard HTTP status and custom body status/success fields
  if (response.status === 200 || response.status === 201 || resData?.success || resData?.status === 200 || resData?.statusCode === 200 || resData?.statusCode === 201) {
    return resData;
  }

  throw new Error(resData?.message || "Failed to create user role.");
};

// Update Role API Call
// Updates an existing role on the server by roleId
export const updateRoleApi = async (roleId, roleData) => {
  const response = await apiClient.put(`/role/${roleId}`, roleData);
  const resData = response.data;

  // Check both standard HTTP status and custom body status/success fields
  if (response.status === 200 || resData?.success || resData?.statusCode === 200) {
    return resData;
  }

  throw new Error(resData?.message || "Failed to update user role.");
};

// Delete Role API Call
// Deletes an existing role on the server by roleId
export const deleteRoleApi = async (roleId) => {
  const response = await apiClient.delete(`/role/${roleId}`);
  const resData = response.data;

  // Check both standard HTTP status and custom body status/success fields
  if (response.status === 200 || resData?.success || resData?.statusCode === 200) {
    return resData;
  }

  throw new Error(resData?.message || "Failed to delete user role.");
};

// Toggle Role Active API Call
// Toggles the active/inactive status of a role on the server by roleId
export const toggleRoleActiveApi = async (roleId) => {
  const response = await apiClient.patch(`/role/${roleId}/toggle-active`);
  const resData = response.data;

  // Check both standard HTTP status and custom body status/success fields
  if (response.status === 200 || resData?.success || resData?.statusCode === 200) {
    return resData;
  }

  throw new Error(resData?.message || "Failed to toggle role status.");
};
