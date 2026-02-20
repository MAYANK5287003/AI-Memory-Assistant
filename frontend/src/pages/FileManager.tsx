import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, Eye,  Trash2, Share2, FileText } from "lucide-react";
import { DeleteDialog } from "@/components/DeleteDialog";
import { shareFile } from "@/services/share";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Doc { document_id: string; filename: string; type: string; created_at: string; file_url?: string; }

const FileManager = () => {
  const { toast } = useToast();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Doc | null>(null);

  useEffect(() => { loadDocs(); }, []);
  const loadDocs = async () => {
    setLoading(true);
    try { const res = await api.getDocuments(); setDocs(res); }
    catch (e: any) { toast({ title: "Error loading documents", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader title="File Manager" description="Browse and manage all your stored documents." />
      {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> : docs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><FileText className="w-12 h-12 mx-auto mb-3 opacity-50" /><p className="text-sm">No documents yet. Add some memories first.</p></div>
      ) : (
        <div className="glass-panel rounded-xl overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Filename</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {docs.map((doc) => (
                <TableRow key={doc.document_id}>
                  <TableCell className="font-medium">{doc.filename}</TableCell>
                  <TableCell className="text-muted-foreground text-xs uppercase">{doc.type}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {doc.file_url && <Button variant="ghost" size="sm" onClick={() => window.open(doc.file_url, "_blank")}><Eye className="w-3.5 h-3.5" /></Button>}
                      <Button variant="ghost" size="sm" onClick={() => shareFile(doc.filename, doc.file_url)}><Share2 className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(doc)} className="text-destructive hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <DeleteDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} documentId={deleteTarget?.document_id || ""} filename={deleteTarget?.filename || ""} onDeleted={(docId) => { setDocs((prev) => prev.filter((d) => d.document_id !== docId)); setDeleteTarget(null); }} />
    </div>
  );
};

export default FileManager;