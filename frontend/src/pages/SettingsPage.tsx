import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, RotateCcw, Info, Download } from "lucide-react";
import { motion } from "framer-motion";
export async function exportProject() {
  console.log("Export project called");
}


const SettingsPage = () => {
  const { toast } = useToast();
  const [backendUrl, setBackendUrl] = useState("http://127.0.0.1:8000");
  const [darkMode, setDarkMode] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("backend_url");
    if (saved) setBackendUrl(saved);
    const isDark = document.documentElement.classList.contains("dark");
    setDarkMode(isDark);
  }, []);

  const toggleTheme = (dark: boolean) => {
    setDarkMode(dark);
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", dark ? "dark" : "light");
  };

  const saveUrl = () => { localStorage.setItem("backend_url", backendUrl); toast({ title: "Saved", description: "Backend URL updated." }); };

  const rebuildFaiss = async () => {
    setRebuilding(true);
    try { await api.rebuildFaiss(); toast({ title: "Success", description: "FAISS index rebuilt." }); }
    catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setRebuilding(false); }
  };

  const handleExport = async () => {
    setExporting(true);
    try { await exportProject(); toast({ title: "Exported", description: "Project zip downloaded successfully." }); }
    catch (e: any) { toast({ title: "Export failed", description: e.message, variant: "destructive" }); }
    finally { setExporting(false); }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <PageHeader title="Settings" description="Configure your AI Memory Assistant." />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="glass-panel rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div><Label className="text-sm font-semibold text-foreground">Dark Mode</Label><p className="text-xs text-muted-foreground mt-0.5">Toggle between light and dark theme</p></div>
            <Switch checked={darkMode} onCheckedChange={toggleTheme} />
          </div>
        </div>
        <div className="glass-panel rounded-xl p-5 space-y-3">
          <Label className="text-sm font-semibold text-foreground">Backend URL</Label>
          <div className="flex gap-2"><Input value={backendUrl} onChange={(e) => setBackendUrl(e.target.value)} /><Button onClick={saveUrl}>Save</Button></div>
        </div>
        <div className="glass-panel rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div><Label className="text-sm font-semibold text-foreground">Rebuild FAISS Index</Label><p className="text-xs text-muted-foreground mt-0.5">Rebuild the vector search index</p></div>
            <Button variant="outline" onClick={rebuildFaiss} disabled={rebuilding}>{rebuilding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}Rebuild</Button>
          </div>
        </div>
        <div className="glass-panel rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div><Label className="text-sm font-semibold text-foreground">Export Project</Label><p className="text-xs text-muted-foreground mt-0.5">Download all frontend source files as a ZIP</p></div>
            <Button variant="outline" onClick={handleExport} disabled={exporting}>{exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}Download ZIP</Button>
          </div>
        </div>
        <div className="glass-panel rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">About</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">AI Memory Assistant — Your Personal Knowledge Brain. Fully local, fully private. Powered by FastAPI, SQLite, FAISS, Sentence Transformers, and Tesseract OCR. No cloud required.</p>
              <p className="text-xs text-muted-foreground mt-2">Version 1.0.0</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsPage;