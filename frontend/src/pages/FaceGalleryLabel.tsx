import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { motion } from "framer-motion";

export default function FaceGalleryLabel() {
  const { label } = useParams();
  const [faces, setFaces] = useState<any[]>([]);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // ⭐ SETTINGS FROM LOCALSTORAGE
  const gallerySize = localStorage.getItem("gallery_size") || "medium";
  const zoomMode = localStorage.getItem("zoom_mode") || "cover";
  const animations = localStorage.getItem("animations") !== "false";

  useEffect(() => {
    if (label) {
      api.searchFaceByLabel(label).then(setFaces);
    }
  }, [label]);

  // ⭐ GRID SIZE CONTROL
  const gridClass =
    gallerySize === "small"
      ? "grid-cols-4"
      : gallerySize === "large"
      ? "grid-cols-2"
      : "grid-cols-3";

  return (
    <div className={`p-8 grid ${gridClass} gap-4`}>
      {faces.map((f) => {
        const Card = animations ? motion.div : "div";

        return (
          <Card
            key={f.face_id}
            {...(animations && {
              initial: { opacity: 0, scale: 0.95 },
              animate: { opacity: 1, scale: 1 },
            })}
            className="relative group rounded-xl overflow-hidden"
          >
            {/* IMAGE */}
            <img
              src={f.image_url}
              alt={f.label || "face"}
              loading="lazy"
              onClick={() =>
                f.image_url && setFullscreenImage(f.image_url)
              }
              className={`w-full h-48 cursor-zoom-in ${
                zoomMode === "contain" ? "object-contain" : "object-cover"
              }`}
            />

            {/* DELETE BUTTON */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition pointer-events-none">
              <button
                className="bg-red-500 text-white px-2 py-1 rounded-md text-xs pointer-events-auto"
                onClick={async (e) => {
                  e.stopPropagation();
                  await api.deleteFace(f.face_id);
                  setFaces(prev =>
                    prev.filter(x => x.face_id !== f.face_id)
                  );
                }}
              >
                Delete
              </button>
            </div>
          </Card>
        );
      })}

      {/* ⭐ FULLSCREEN VIEWER */}
      {fullscreenImage && (
        <div
          onClick={() => setFullscreenImage(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6"
        >
          <img
            src={fullscreenImage}
            onClick={(e) => e.stopPropagation()}
            className={`max-h-full max-w-full rounded-lg shadow-lg ${
              zoomMode === "contain" ? "object-contain" : "object-cover"
            }`}
          />

          <button
            onClick={() => setFullscreenImage(null)}
            className="absolute top-6 right-6 text-white text-xl"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}