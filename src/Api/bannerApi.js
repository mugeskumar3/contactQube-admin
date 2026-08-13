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

export const getBannersApi = async ({ page = 0, limit = 0 } = {}) => {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('limit', limit);
  const query = params.toString();
  const response = await apiClient.get(`/banner${query ? `?${query}` : ''}`);
  return handleResponse(response);
};

export const createBannerApi = async (bannerData) => {
  const response = await apiClient.post("/banner", bannerData);
  return handleResponse(response);
};

export const deleteBannerApi = async (bannerId) => {
  const response = await apiClient.delete(`/banner/${encodeURIComponent(bannerId)}`);
  return handleResponse(response);
};

export const updateBannerOrderApi = async (banners) => {
  const response = await apiClient.put("/banner/update-order", { banners });
  return handleResponse(response);
};
