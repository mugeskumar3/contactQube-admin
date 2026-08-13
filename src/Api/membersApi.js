import apiClient from "../config";

// Helper to handle API responses consistently
// Backend returns: { status: 200, message: "...", total, from, to, totalPages, currentPage, data: [] }
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

// GET /api/admin/members — List all members (paginated, with optional filters)
// Backend response: { status: 200, message, total, from, to, totalPages, currentPage, data: [] }
export const getMembersApi = async ({ page = 0, limit = 10, search = '', date = '', planId = '', isActive = '' } = {}) => {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('limit', limit);
  if (search) params.set('search', search);
  if (date) params.set('date', date);
  if (planId) params.set('planId', planId);
  if (isActive !== undefined && isActive !== '') params.set('isActive', isActive);
  const response = await apiClient.get(`/members?${params.toString()}`);
  return handleResponse(response);
};

// GET /api/admin/members/{id} — Get a single member by ID
export const getMemberByIdApi = async (memberId) => {
  const response = await apiClient.get(`/members/${encodeURIComponent(memberId)}`);
  return handleResponse(response);
};

export const createMemberApi = async (memberData) => {
  const response = await apiClient.post("/members", memberData);
  return handleResponse(response);
};

// PUT /api/admin/members/{id} — Update an existing member
export const updateMemberApi = async (memberId, memberData) => {
  const response = await apiClient.put(`/members/${encodeURIComponent(memberId)}`, memberData);
  return handleResponse(response);
};

// DELETE /api/admin/members/{id} — Delete a member
export const deleteMemberApi = async (memberId) => {
  const response = await apiClient.delete(`/members/${encodeURIComponent(memberId)}`);
  return handleResponse(response);
};

// PATCH /api/admin/members/{id}/toggle-active — Toggle member active/inactive
export const toggleMemberActiveApi = async (memberId) => {
  const response = await apiClient.patch(`/members/${encodeURIComponent(memberId)}/toggle-active`);
  return handleResponse(response);
};
