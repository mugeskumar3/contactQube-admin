import apiClient from "../config";

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

export const getActivitiesApi = async ({ page = 0, limit = 0, search = '', startDate = '', endDate = '' } = {}) => {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('limit', limit);
  if (search) params.set('search', search);
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const query = params.toString();
  const response = await apiClient.get(`/activities${query ? `?${query}` : ''}`);
  return handleResponse(response);
};

export const createActivityApi = async (activityData) => {
  const response = await apiClient.post("/activities", activityData);
  return handleResponse(response);
};

export const updateActivityApi = async (activityId, activityData) => {
  const response = await apiClient.put(`/activities/${encodeURIComponent(activityId)}`, activityData);
  return handleResponse(response);
};

export const deleteActivityApi = async (activityId) => {
  const response = await apiClient.delete(`/activities/${encodeURIComponent(activityId)}`);
  return handleResponse(response);
};

export const getActivityParticipantsApi = async (activityId, params = {}) => {
  const response = await apiClient.get(`/activities/${encodeURIComponent(activityId)}/participants`, { params });
  return handleResponse(response);
};

