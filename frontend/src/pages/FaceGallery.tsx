import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { motion } from "framer-motion";

export default function FaceGallery() {
  const [folders, setFolders] = useState<any[]>([]);
  const navigate = useNavigate();

  // ⭐ SETTINGS FROM LOCALSTORAGE
  const gallerySize = localStorage.getItem("gallery_size") || "medium";
  const zoomMode = localStorage.getItem("zoom_mode") || "cover";
  const animations = localStorage.getItem("animations") !== "false";

  useEffect(() => {
    api.getFaceFolders().then(setFolders);
  }, []);

  // ⭐ GRID SIZE CONTROL
  const gridClass =
    gallerySize === "small"
      ? "grid-cols-4"
      : gallerySize === "large"
      ? "grid-cols-2"
      : "grid-cols-3";

  return (
    <div className={`grid ${gridClass} gap-4`}>
      {folders.map((f) => {
        const Card = animations ? motion.div : "div";

        return (
          <Card
            key={f.label}
            onClick={() => navigate(`/face-gallery/${f.label}`)}
            {...(animations && {
              initial: { opacity: 0, scale: 0.95 },
              animate: { opacity: 1, scale: 1 },
            })}
            className="glass-panel cursor-pointer hover:scale-[1.02] transition rounded-xl overflow-hidden"
          >
            <img
              src={f.preview_url}
              alt={f.label}
              loading="lazy"
              className={`w-full h-40 ${
                zoomMode === "contain" ? "object-contain" : "object-cover"
              }`}
            />

            <div className="p-3">
              <div className="text-sm font-semibold">{f.label}</div>
              <div className="text-xs text-muted-foreground">
                {f.count} faces
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}