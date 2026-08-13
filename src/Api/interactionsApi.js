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

export const getInteractionsApi = async ({ page = 0, limit = 10, type = '', search = '', date = '' } = {}) => {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('limit', limit);
  if (type) params.set('type', type);
  if (search) params.set('search', search);
  if (date) params.set('date', date);
  const url = `/contacts/interactions?${params.toString()}`;
  const response = await apiClient.get(url);
  return handleResponse(response);
};
