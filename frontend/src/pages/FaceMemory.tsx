import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Search, Loader2, Tag, User } from "lucide-react";
import { motion } from "framer-motion";
import { shareFile } from "@/services/share";

interface Face { face_id: string; label?: string; image_url?: string; }

const FaceMemory = () => {
  const { toast } = useToast();
  const [faces, setFaces] = useState<Face[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLabel, setSearchLabel] = useState("");
  const [searchResults, setSearchResults] = useState<Face[]>([]);
  const [labelInputs, setLabelInputs] = useState<Record<string, string>>({});
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const handleUpload = async () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setLoading(true);
      try { const res = await api.uploadFace(file); setFaces(res.faces || []); toast({ title: "Faces detected", description: `${res.faces?.length || 0} face(s) found.` }); }
      catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
      finally { setLoading(false); }
    };
    input.click();
  };

  const handleLabel = async (faceId: string) => {
    const label = labelInputs[faceId];
    if (!label?.trim()) return;
    try { await api.labelFace(faceId, label); toast({ title: "Labeled", description: `Face labeled as "${label}".` }); setFaces((prev) => prev.map((f) => (f.face_id === faceId ? { ...f, label } : f))); }
    catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const handleSearch = async () => {
    if (!searchLabel.trim()) return;
    setLoading(true);
    try { const res = await api.searchFaceByLabel(searchLabel); setSearchResults(res); }
    catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  const handleDeleteFace = async (faceId: string) => {
    try {
      await api.deleteFace(faceId);

      // remove from UI instantly
      setSearchResults(prev => prev.filter(f => f.face_id !== faceId));

      toast({
        title: "Face deleted",
        description: "Face removed successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <PageHeader title="Face Memory" description="Upload images to detect and label faces." />
      <div className="flex gap-3 mb-8">
        <Button onClick={handleUpload} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}Upload Face Image</Button>
      </div>
      {faces.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-foreground mb-3">Detected Faces</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {faces.map((face) => (
              <motion.div
                key={face.face_id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel rounded-xl p-4 text-center relative group"
              >
                {/* FACE IMAGE */}
                {face.image_url ? (
                  <img
                    src={face.image_url}
                    alt="face"
                    className="w-20 h-20 mx-auto rounded-full object-cover border-2 border-border mb-3"
                  />
                ) : (
                  <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
                    <User className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}

                {/* LABEL OR INPUT */}
                {face.label ? (
                  <span className="text-sm font-medium text-primary">{face.label}</span>
                ) : (
                  <div className="flex gap-1">
                    <Input
                      placeholder="Label"
                      className="text-xs h-8"
                      value={labelInputs[face.face_id] || ""}
                      onChange={(e) =>
                        setLabelInputs({
                          ...labelInputs,
                          [face.face_id]: e.target.value,
                        })
                      }
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLabel(face.face_id)}
                    >
                      <Tag className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </motion.div>
            ))}

          </div>
        </div>
      )}
      <div className="glass-panel rounded-xl p-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">Search by Label</h2>
        <div className="flex gap-2">
          <Input value={searchLabel} onChange={(e) => setSearchLabel(e.target.value)} placeholder="Enter a name..." onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
          <Button onClick={handleSearch} disabled={loading}><Search className="w-4 h-4" /></Button>
        </div>
        {searchResults.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            {searchResults.map((face) => (
              <motion.div
                key={face.face_id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative rounded-xl overflow-hidden group h-48"
              >
                {/* FULL CARD IMAGE */}
                {face.image_url ? (
                  <img
                    src={face.image_url}
                    alt={face.label}
                    onClick={() => {
                      console.log("clicked image", face.image_url);
                      setFullscreenImage(face.image_url || null);
                    }}
                    className="w-full h-full object-cover cursor-pointer"
                  />
                ) : (
                  <div className="w-full h-full bg-background flex items-center justify-center">
                    <User className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}

                {/* DARK OVERLAY */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition pointer-events-none" />

                {/* LABEL + ACTIONS */}
                <div className="absolute bottom-0 left-0 right-0 p-3 text-center pointer-events-none">
                  <span className="text-sm font-semibold text-white block mb-2">
                    {face.label}
                  </span>

                  <Button
                    size="sm"
                    variant="destructive"
                    className="pointer-events-auto"
                    onClick={() => handleDeleteFace(face.face_id)}
                  >
                    Delete
                  </Button>
                </div>
              </motion.div>

            ))}

          </div>
        )}
      </div>
      {/* FULLSCREEN IMAGE MODAL */}
      {fullscreenImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setFullscreenImage(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6"
        >
          <img
            src={fullscreenImage}
            alt="fullscreen"
            className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
          />
          <button
            onClick={() => setFullscreenImage(null)}
            className="absolute top-6 right-6 text-white text-xl"
          >
            ✕
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default FaceMemory;