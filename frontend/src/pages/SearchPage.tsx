import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search as SearchIcon, Loader2, FileText, Share2, Pencil, Trash2, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DeleteDialog } from "@/components/DeleteDialog";
import { shareFile } from "@/services/share";

interface Evidence { filename: string; chunk: string; document_id: string; preview_url?: string; file_url?: string; }

const SearchPage = () => {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [renameTarget, setRenameTarget] = useState<Evidence | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Evidence | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true); setAnswer(null); setEvidence([]);
    try { const res = await api.smartQuery(query); setAnswer(res.answer); setEvidence(res.evidence || []); }
    catch (e: any) { toast({ title: "Search failed", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <PageHeader title="Smart Search" description="Ask anything — get answers with evidence." />
      <div className="flex gap-2 mb-8">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} placeholder="What do you want to know?" className="bg-card" />
        <Button onClick={handleSearch} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <SearchIcon className="w-4 h-4" />}</Button>
      </div>
      {loading && <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}
      <AnimatePresence>
        {answer && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-panel rounded-xl p-6 mb-6">
            <h2 className="text-sm font-semibold text-primary mb-2">Answer</h2>
            <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
      {evidence.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Evidence</h2>
          <div className="space-y-3">
            {evidence.map((ev, i) => (
              <motion.div key={ev.document_id + i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-panel rounded-xl p-4">
                <div className="flex items-start gap-4">
                  {ev.preview_url && <img src={ev.preview_url} alt="preview" className="w-16 h-16 rounded-md object-cover border border-border shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm font-medium text-foreground truncate">{ev.filename}</span>
                      <span className="text-xs text-muted-foreground">ID: {ev.document_id}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3">{ev.chunk}</p>
                    <div className="flex gap-2 mt-3">
                      {ev.file_url && <Button variant="outline" size="sm" onClick={() => window.open(ev.file_url, "_blank")}><ExternalLink className="w-3 h-3 mr-1" /> Open</Button>}
                      <Button variant="outline" size="sm" onClick={() => {const updated = evidence.find(x => x.document_id === ev.document_id);shareFile(updated?.filename, updated?.file_url);}}><Share2 className="w-3 h-3 mr-1" /> Share</Button>
  
                      <Button variant="outline" size="sm" onClick={() => setDeleteTarget(ev)} className="text-destructive hover:text-destructive"><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
     
      <DeleteDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} documentId={deleteTarget?.document_id || ""} filename={deleteTarget?.filename || ""} onDeleted={(docId) => { setEvidence((prev) => prev.filter((e) => e.document_id !== docId)); setDeleteTarget(null); }} />
    </div>
  );
};

export default SearchPage;