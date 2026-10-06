// The backend returns upload paths like "/uploads/jobs/abc.jpg"; files are served from the
// server root, not from /api/v1.
const ORIGIN = (process.env.EXPO_PUBLIC_BACKEND_URL || "").replace(/\/api\/v\d+\/?$/, "");

export default function fileUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${ORIGIN}${path}`;
}

export function apiUrl(path) {
  return `${process.env.EXPO_PUBLIC_BACKEND_URL}${path}`;
}
