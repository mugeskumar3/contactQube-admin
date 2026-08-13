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

// Fetch payments/transactions report
export const getTransactionsApi = async ({ page = 0, limit = 10, planId = '', planType = 'all', search = '', date = '' } = {}) => {
  const response = await apiClient.get(
    `/reports/transactions?page=${page}&limit=${limit}&planId=${planId}&planType=${planType}&search=${encodeURIComponent(search)}&date=${encodeURIComponent(date)}`
  );
  return handleResponse(response);
};

// Fetch membership/plans report
export const getMembershipReportApi = async ({ page = 0, limit = 10, planId = '', planType = 'all', search = '', date = '' } = {}) => {
  const response = await apiClient.get(
    `/reports/membership?page=${page}&limit=${limit}&planId=${planId}&planType=${planType}&search=${encodeURIComponent(search)}&date=${encodeURIComponent(date)}`
  );
  return handleResponse(response);
};

// Export payments/transactions report (Excel or PDF)
export const exportTransactionsApi = async ({ planId = '', planType = 'all', search = '', date = '', format = 'excel' } = {}) => {
  const response = await apiClient.get(
    `/reports/transactions/export?planId=${planId}&planType=${planType}&search=${encodeURIComponent(search)}&date=${encodeURIComponent(date)}&format=${format}`,
    { responseType: 'blob' }
  );
  return response.data;
};

// Export membership/plans report (Excel or PDF)
export const exportMembershipReportApi = async ({ planId = '', planType = 'all', search = '', date = '', format = 'excel' } = {}) => {
  const response = await apiClient.get(
    `/reports/membership/export?planId=${planId}&planType=${planType}&search=${encodeURIComponent(search)}&date=${encodeURIComponent(date)}&format=${format}`,
    { responseType: 'blob' }
  );
  return response.data;
};
