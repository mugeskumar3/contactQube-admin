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

export const getLatestMembersApi = async () => {
  const response = await apiClient.get("/dashboard/latest-members");
  return handleResponse(response);
};

export const getTierSharesApi = async () => {
  const response = await apiClient.get("/dashboard/tier-shares");
  return handleResponse(response);
};

export const getAssetGrowthApi = async () => {
  const response = await apiClient.get("/dashboard/asset-growth");
  return handleResponse(response);
};

export const getDashboardStatsApi = async () => {
  const response = await apiClient.get("/dashboard/statistics");
  return handleResponse(response);
};
