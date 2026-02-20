import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import AddMemory from "./pages/AddMemory";
import SearchPage from "./pages/SearchPage";
import FaceMemory from "./pages/FaceMemory";
import FaceGallery from "./pages/FaceGallery";
import FileManager from "./pages/FileManager";
import SettingsPage from "./pages/SettingsPage";
import FaceGalleryLabel from "./pages/FaceGalleryLabel";
import NotFound from "./pages/NotFound";
import { useEffect ,useState} from "react";
import BootScreen from "./boot/BootScreen";
import { useBackendReady } from "./boot/useBackendReady";


export const API_BASE = "http://127.0.0.1:8000";
const queryClient = new QueryClient();

function ThemeInit() {
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  }, []);
  return null;
}

function App(){
   // ---------- Memory ----------
    const [text, setText] = useState("");
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState("");
  
    // ---------- Query ----------
    const [query, setQuery] = useState("");
    const [answer, setAnswer] = useState("");
    const [evidence, setEvidence] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
  
    // ---------- Face Memory ----------
    const [faceFile, setFaceFile] = useState(null);
    const [showLabelBox, setShowLabelBox] = useState(false);
    const [labelName, setLabelName] = useState("");
    const [pendingClusterId, setPendingClusterId] = useState(null);
    const [faceResults, setFaceResults] = useState([]);
    const backendStatus = useBackendReady();

    if (backendStatus !== "ready") {
      return <BootScreen status={backendStatus} />;
    }
  

  
    const BACKEND_URL = "http://127.0.0.1:8000";
  
    // ==========================
    // SAVE MEMORY
    // ==========================
    async function saveMemory() {
      setStatus("");
      setError("");
  
      if (!text.trim() && !file) {
        setStatus("Please add text or upload a file");
        return;
      }
  
      // ---- Text memory ----
      if (text.trim()) {
        try {
          const res = await fetch(`${BACKEND_URL}/memory`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: text }),
          });
  
          if (res.ok) {
            setStatus("Text memory saved ✅");
            setText("");
          } else {
            setStatus("Failed to save text ❌");
          }
        } catch {
          setStatus("Backend not reachable ❌");
        }
      }
  
      // ---- File upload ----
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
  
        try {
          const res = await fetch(`${BACKEND_URL}/upload`, {
            method: "POST",
            body: formData,
          });
  
          if (res.ok) {
            const data = await res.json();
            setStatus(`File uploaded ✅ (${data.chunks_added ?? "?"} chunks)`);
            setFile(null);
          } else {
            setStatus("File upload failed ❌");
          }
        } catch {
          setStatus("Backend not reachable ❌");
        }
      }
    }
    async function uploadFace() {
      if (!faceFile) return;
  
      const formData = new FormData();
      formData.append("file", faceFile);
  
      try {
        const res = await fetch(`${BACKEND_URL}/face/upload`, {
          method: "POST",
          body: formData,
        });
  
        const data = await res.json();
  
        const unknownFaces = data.faces.filter(f => f.unmatched);
  
        if (unknownFaces.length > 0) {
          setFaceResults(unknownFaces); // show cropped previews
          setPendingClusterId(null);
          setShowLabelBox(true);
        } else {
          alert("All faces matched existing people ✅");
        }
  
        setFaceFile(null);
      } catch {
        alert("Face upload failed ❌");
      }
    }
  
    async function labelFace() {
      if (!labelName.trim()) return;
  
      await fetch(`${BACKEND_URL}/face/label`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cluster_id: pendingClusterId,
          label: labelName,
        }),
      });
  
      setShowLabelBox(false);
      setLabelName("");
      setPendingClusterId(null);
  
      alert("Person labeled successfully ✅");
    }
  
  
  
    // ==========================
    // ASK QUESTION
    // ==========================
    async function searchByLabel() {
      if (!query.trim()) return;
  
      const res = await fetch(
        `${BACKEND_URL}/face/search-by-label?label=${query}`
      );
      const data = await res.json();
  
      setFaceResults(data.images || []);
    }
  
    async function askQuestion() {
      if (!query.trim()) return;
  
      setLoading(true);
      setAnswer("");
      setEvidence(null);
      setError("");
  
      try {
        const res = await fetch(`${BACKEND_URL}/smart-query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
  
        if (!res.ok) {
          throw new Error("Query failed");
        }
  
        const data = await res.json();
  
        setAnswer(data.answer || "No answer found.");
        setEvidence(data.evidence || null);
      } catch {
        setError("Backend not reachable ❌");
      } finally {
        setLoading(false);
      }
    }
    
  return(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeInit />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/add-memory" element={<AddMemory />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/face-memory" element={<FaceMemory />} />
              <Route path="/face-gallery" element={<FaceGallery />} />
              <Route path="/face-gallery/:label" element={<FaceGalleryLabel />} />
              <Route path="/file-manager" element={<FileManager />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;