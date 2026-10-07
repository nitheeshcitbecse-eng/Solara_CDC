import { useEffect, useState } from "react";
import { apiUrl } from "./fileUrl";
import { getToken } from "../utils/storage";

// Private images (profile photos, Aadhaar) need the login token. React Native 0.86's <Image> on Android
// drops `source.headers` (react-native issue #58659), so the server answered 401 and nothing showed.
// Instead the image is downloaded here with the token and handed to <Image> as a data URI.

const MAX_CACHED = 80;
const cache = new Map(); // url → data URI, most recently used last

function remember(url, dataUri) {
  cache.delete(url);
  cache.set(url, dataUri);
  if (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value);
}

function toDataUri(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the image"));
    reader.readAsDataURL(blob);
  });
}

// `path` is an API path such as "/users/get-photo/12". Returns { uri, failed }.
export default function useAuthImage(path, enabled = true) {
  const url = enabled && path ? apiUrl(path) : null;
  const [state, setState] = useState(() => ({ url, uri: url ? cache.get(url) || null : null, failed: false }));

  useEffect(() => {
    if (!url) return undefined;
    if (cache.has(url)) {
      setState({ url, uri: cache.get(url), failed: false });
      return undefined;
    }
    setState({ url, uri: null, failed: false });

    let active = true;
    const load = async () => {
      try {
        const token = await getToken();
        const response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const dataUri = await toDataUri(await response.blob());
        remember(url, dataUri);
        if (active) setState({ url, uri: dataUri, failed: false });
      } catch (err) {
        console.log("Load Image Error:", err.message);
        if (active) setState({ url, uri: null, failed: true });
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [url]);

  // Ignore a result that belongs to a previous path.
  return state.url === url ? { uri: state.uri, failed: state.failed } : { uri: null, failed: false };
}
