import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";

export default function FaceGallery() {
  const [folders, setFolders] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.getFaceFolders().then(setFolders);
  }, []);

  return (
    <div className="grid grid-cols-3 gap-4">
      {folders.map((f) => (
          <div
            onClick={() => navigate(`/face-gallery/${f.label}`)}
            className="glass-panel cursor-pointer hover:scale-[1.02] transition"
          >
          <img src={f.preview_url} className="w-full h-40 object-cover rounded-md" />
          <div className="mt-2 text-sm font-semibold">{f.label}</div>
          <div className="text-xs text-muted-foreground">{f.count} faces</div>
        </div>
      ))}
    </div>
  );
}
