export const API_BASE_URL = "http://document_tracking_system.test/api";

export const fetchWithAuth = async (url, options = {}) => {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem("auth_token") : null;
  const response = await fetch(`${url.startsWith('http') ? url : API_BASE_URL + url}`, {
    ...options,
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    }
  });

  if (!response.ok) {
    let message = 'An error occurred';
    try {
      const errData = await response.json();
      message = errData.message || message;
    } catch (e) {
      // JSON parse error, ignore
    }
    throw new Error(message);
  }

  // Handle 204 No Content for DELETE
  if (response.status === 204) {
    return null;
  }

  return response.json();
};

export const getDocuments = () => fetchWithAuth('/documents');

export const createDocument = (data) => fetchWithAuth('/documents', {
  method: 'POST',
  body: JSON.stringify(data),
});

export const updateDocument = ({ id, data }) => fetchWithAuth(`/documents/${id}`, {
  method: 'PUT',
  body: JSON.stringify(data),
});

export const deleteDocument = (id) => fetchWithAuth(`/documents/${id}`, {
  method: 'DELETE',
});

export const logDocumentAction = (documentId, action) => fetchWithAuth(`/documents/${documentId}/log-action`, {
  method: 'POST',
  body: JSON.stringify({ action }),
});

export const getDocumentVersions = (documentNumber) => fetchWithAuth(`/documents/${documentNumber}/versions`);

export const getDepartments = () => fetchWithAuth('/job-departments');

export const getDocumentTypes = () => fetchWithAuth('/document-types');

export const createDocumentType = (data) => fetchWithAuth('/document-types', {
  method: 'POST',
  body: JSON.stringify(data),
});

export const getAdminDashboardStats = () => fetchWithAuth('/admin/dashboard-stats');

export const updateDocumentType = ({ id, data }) => fetchWithAuth(`/document-types/${id}`, {
  method: 'PUT',
  body: JSON.stringify(data),
});

export const deleteDocumentType = (id) => fetchWithAuth(`/document-types/${id}`, {
  method: 'DELETE',
});
