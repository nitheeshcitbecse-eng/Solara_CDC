import api, { multipartConfig } from "../api/api";

// Uploads any of: the user's own photo, Aadhaar front/back, last 4 digits.
// Each image is { uri, name, type } from useImagePreview. Returns the API response data.
export default async function uploadDocuments({ photo, aadhaarFront, aadhaarBack, last4 }) {
  const formData = new FormData();
  if (photo) formData.append("photo", photo);
  if (aadhaarFront) formData.append("aadhaarFront", aadhaarFront);
  if (aadhaarBack) formData.append("aadhaarBack", aadhaarBack);
  if (last4) formData.append("last4", last4);
  const { data } = await api.post("/onboarding/upload-documents", formData, multipartConfig);
  return data;
}
