const API_BASE_URL = "http://document_tracking_system.test/api";

export const getDisplayFileName = (file) => {
  const rawName = file?.display_name || file?.displayName || file?.original_name || file?.originalName || file?.name || "";
  if (!rawName) return "Document";

  const lastDot = rawName.lastIndexOf(".");
  const ext = lastDot >= 0 ? rawName.slice(lastDot) : "";
  let base = lastDot >= 0 ? rawName.slice(0, lastDot) : rawName;

  base = base
    .replace(/_signed_\d+$/i, "")
    .replace(/_\d{9,}$/g, "")
    .replace(/[_-]+$/g, "")
    .trim();

  return `${base || "Document"}${ext}`;
};

export const getStoredFileName = (file) => {
  if (!file) return "";
  return file.stored_name || file.storedName || file.file_path || file.name || "";
};

export const getDocumentFileUrl = (file) => {
  if (!file) return "#";

  if (file.data) return file.data;
  if (file.dataUrl) return file.dataUrl;
  if (file.base64) return file.base64;
  if (file.url) return file.url;

  const fileName = getStoredFileName(file);
  if (!fileName) return "#";

  return `${API_BASE_URL}/documents/file/${encodeURIComponent(fileName)}`;
};

export const getFileExtension = (file) => {
  const name = typeof file === "string" ? file : getDisplayFileName(file);
  return name.split(".").pop()?.toLowerCase() || "";
};

export const getFileKind = (file) => {
  const mime = file?.type || "";
  const ext = getFileExtension(file);

  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "image";
  if (["doc", "docx"].includes(ext)) return "word";
  if (["xls", "xlsx", "csv"].includes(ext)) return "excel";
  if (["ppt", "pptx"].includes(ext)) return "powerpoint";

  return "generic";
};

export const getFileKindLabel = (file) => {
  const kind = getFileKind(file);
  const ext = getFileExtension(file);

  if (kind === "pdf") return "PDF";
  if (kind === "image") return ext === "png" ? "PNG" : "Image";
  if (kind === "word") return "Word";
  if (kind === "excel") return "Excel";
  if (kind === "powerpoint") return "PowerPoint";

  return "File";
};

export const getSignActionLabel = (file) => {
  return getFileKind(file) === "pdf" ? "Sign Document" : "Convert to PDF & Sign";
};
