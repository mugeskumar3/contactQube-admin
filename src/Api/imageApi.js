import apiClient from "../config";

export const uploadImageApi = async (file, folderPath = 'uploads') => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post(
    `/image/upload?path=${encodeURIComponent(folderPath)}`,
    formData
  );

  const resData = response.data;
  const httpOk = response.status === 200 || response.status === 201;
  const bodyOk =
    resData?.statusCode === 200 ||
    resData?.statusCode === 201 ||
    resData?.success === true;

  if (httpOk || bodyOk) {
    return resData?.data !== undefined ? resData.data : resData;
  }

  throw new Error(resData?.message || "Image upload failed.");
};
