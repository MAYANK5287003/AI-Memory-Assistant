import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "@/services/api";

export default function FaceGalleryLabel() {
  const { label } = useParams();
  const [faces, setFaces] = useState<any[]>([]);

  useEffect(() => {
    if (label) {
      api.searchFaceByLabel(label).then(setFaces);
    }
  }, [label]);

  return (
  <div className="p-8 grid grid-cols-3 gap-4">
    {faces.map((f, i) => (
      <div key={i} className="relative group">
        <img
          src={f.image_url}
          className="rounded-xl object-cover w-full h-48"
        />

        {/* ACTION BUTTONS */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition">
          
          <button
            className="bg-red-500 text-white px-2 py-1 rounded-md text-xs"
            onClick={async () => {
              await api.deleteFace(f.face_id);
              setFaces(prev => prev.filter(x => x.face_id !== f.face_id));
            }}
          >
            Delete
          </button>

          <button
            className="bg-blue-500 text-white px-2 py-1 rounded-md text-xs"
            onClick={async () => {
              const data = await api.getFaceShareLink(f.face_id);
              await navigator.clipboard.writeText(data.share_url);
              alert("Link copied ✅");
            }}
          >
            Share
          </button>

        </div>
      </div>
    ))}
  </div>
);

}
