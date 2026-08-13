import apiClient from "../config";

// Helper to normalize response
// Backend returns: { status: 200, message: "...", data: [...] }
const handleResponse = (response) => {
  const resData = response.data;
  const httpOk = response.status === 200 || response.status === 201;
  const bodyOk =
    resData?.status === 200 ||
    resData?.status === 201 ||
    resData?.success === true ||
    resData?.statusCode === 200 ||
    resData?.statusCode === 201;

  if (httpOk || bodyOk) {
    return resData;
  }
  throw new Error(resData?.message || "Request failed.");
};

// Get all Plans
export const getPlansApi = async ({ page = 0, limit = 0 } = {}) => {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('limit', limit);
  const response = await apiClient.get(`/plans?${params.toString()}`);
  return handleResponse(response);
};

// Get a single Plan by ID
export const getPlanByIdApi = async (planId) => {
  const response = await apiClient.get(`/plans/${encodeURIComponent(planId)}`);
  return handleResponse(response);
};

// Create a new Plan
export const createPlanApi = async (planData) => {
  const response = await apiClient.post("/plans", planData);
  return handleResponse(response);
};

// Update an existing Plan
export const updatePlanApi = async (planId, planData) => {
  const response = await apiClient.put(`/plans/${encodeURIComponent(planId)}`, planData);
  return handleResponse(response);
};

// Delete a Plan
export const deletePlanApi = async (planId) => {
  const response = await apiClient.delete(`/plans/${encodeURIComponent(planId)}`);
  return handleResponse(response);
};
