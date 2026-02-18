const getBaseUrl = () => {
  return localStorage.getItem("backend_url") || "http://127.0.0.1:8000";
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${path}`, options);
  if (!res.ok) {
    const error = await res.text().catch(() => "Unknown error");
    throw new Error(error);
  }
  return res.json();
}

export const api = {
  addMemory: (text: string) =>
    request("/memory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({content: text}) }),

  uploadFile: (file: File, onProgress?: (pct: number) => void) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("file", file);
      if (onProgress) {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        });
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
        else reject(new Error(xhr.responseText || "Upload failed"));
      };
      xhr.onerror = () => reject(new Error("Upload failed"));
      xhr.open("POST", `${getBaseUrl()}/upload`);
      xhr.send(formData);
    });
  },

  smartQuery: (query: string) =>
    request<{ answer: string; evidence: Array<{ filename: string; chunk: string; document_id: string; preview_url?: string; file_url?: string }> }>("/smart-query", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }),
    }),

  deleteDocument: (documentId: string) =>
    request(`/document/${documentId}`, { method: "DELETE" }),

  getDocuments: () =>
    request<Array<{ document_id: string; filename: string; type: string; created_at: string; file_url?: string }>>("/documents"),

  uploadFace: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<{ faces: Array<{ face_id: string; label?: string; image_url?: string }> }>("/face/upload", { method: "POST", body: formData });
  },
  getFaceFolders: () =>
    request<Array<{ label: string; preview_url: string; count: number }>>("/face/folders"),


  labelFace: (faceId: string, label: string) =>
    request("/face/label", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cluster_id: faceId, label }) }),

  searchFaceByLabel: (label: string) =>
    request<Array<{ face_id: string; label: string; image_url?: string }>>(`/face/search-by-label?label=${encodeURIComponent(label)}`),

  rebuildFaiss: () => request("/rebuild-faiss", { method: "POST" }),

  deleteFace: (faceId: string) =>
    request(`/faces/${faceId}`, { method: "DELETE" }),
};