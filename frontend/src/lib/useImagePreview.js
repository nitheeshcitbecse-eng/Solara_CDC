import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { requestCameraPermission, requestMediaPermission } from "../utils/permission";

const toFile = (asset, index) => {
  const type = asset.mimeType || "image/jpeg";
  const extension = type.split("/")[1] || "jpg";
  return {
    uri: asset.uri,
    name: asset.fileName || `photo-${Date.now()}-${index}.${extension}`,
    type,
  };
};

// Picks images (gallery or camera) and keeps them for preview and upload.
// Each image is { uri, name, type } — ready to append to FormData.
// pickImages / takePhoto also return the newly picked images ([] if cancelled).
export default function useImagePreview({ max = 1 } = {}) {
  const [images, setImages] = useState([]);
  const [error, setError] = useState("");

  const addPicked = (result) => {
    if (result.canceled) return [];
    const picked = result.assets.map(toFile);
    setImages((current) => (max === 1 ? picked.slice(0, 1) : [...current, ...picked].slice(0, max)));
    return picked;
  };

  const pickImages = async () => {
    setError("");
    const allowed = await requestMediaPermission();
    if (!allowed) {
      setError("Please allow photo access in Settings to choose images.");
      return [];
    }
    const remaining = max - images.length;
    if (max > 1 && remaining <= 0) {
      setError(`You can add up to ${max} photos.`);
      return [];
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: max > 1,
      selectionLimit: max > 1 ? remaining : 1,
      quality: 0.7,
    });
    return addPicked(result);
  };

  // front = true opens the selfie camera.
  const takePhoto = async ({ front = false } = {}) => {
    setError("");
    const allowed = await requestCameraPermission();
    if (!allowed) {
      setError("Please allow camera access in Settings to take a photo.");
      return [];
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      cameraType: front ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
    });
    return addPicked(result);
  };

  const removeImage = (uri) => setImages((current) => current.filter((image) => image.uri !== uri));

  const clearImages = () => setImages([]);

  return { images, error, pickImages, takePhoto, removeImage, clearImages };
}
