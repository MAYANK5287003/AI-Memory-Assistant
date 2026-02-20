import { useState, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Loader2, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

const ACCEPTED_TYPES = ".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv";

const AddMemory = () => {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleTextSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try { await api.addMemory(text); toast({ title: "Memory saved", description: "Your text memory has been stored." }); setText(""); }
    catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const handleFileUpload = async () => {
    if (!file) return;
    setLoading(true); setUploadProgress(0);
    try { await api.uploadFile(file, setUploadProgress); toast({ title: "File uploaded", description: `${file.name} has been processed.` }); setFile(null); setUploadProgress(0); }
    catch (e: any) { toast({ title: "Upload failed", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const onDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }, []);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <PageHeader title="Add Memory" description="Store text or upload files to your knowledge brain." />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div className="glass-panel rounded-xl p-6">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Text Memory</h2>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Type or paste any information you want to remember..." className="min-h-[120px] bg-background resize-none mb-3" />
          <Button onClick={handleTextSubmit} disabled={loading || !text.trim()}>{loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Save Memory</Button>
        </div>
        <div className="glass-panel rounded-xl p-6">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Upload className="w-4 h-4 text-primary" /> Upload File</h2>
          <div onDrop={onDrop} onDragOver={(e) => e.preventDefault()} className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer" onClick={() => document.getElementById("file-input")?.click()}>
            {file ? (<div className="flex items-center justify-center gap-2 text-foreground"><CheckCircle className="w-5 h-5 text-success" /><span className="text-sm font-medium">{file.name}</span></div>) : (<div><Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">Drag & drop or click to select</p><p className="text-xs text-muted-foreground mt-1">PDF, Images, Excel</p></div>)}
          </div>
          <Input id="file-input" type="file" accept={ACCEPTED_TYPES} className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          {uploadProgress > 0 && uploadProgress < 100 && <Progress value={uploadProgress} className="mt-3" />}
          <Button onClick={handleFileUpload} disabled={loading || !file} className="mt-3">{loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Upload & Process</Button>
        </div>
      </motion.div>
    </div>
  );
};

export default AddMemory;