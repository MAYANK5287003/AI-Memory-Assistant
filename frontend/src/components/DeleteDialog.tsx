import { useState } from "react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface DeleteDialogProps { open: boolean; onClose: () => void; documentId: string; filename: string; onDeleted: (docId: string) => void; }

export function DeleteDialog({ open, onClose, documentId, filename, onDeleted }: DeleteDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.deleteDocument(documentId);
      toast({ title: "Deleted", description: `"${filename}" has been permanently removed.` });
      onDeleted(documentId);
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" />Delete Document</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground py-2">Are you sure you want to delete <strong className="text-foreground">"{filename}"</strong>? This will permanently remove it from SQLite, FAISS, OCR memory, face memory, and storage. This action cannot be undone.</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>{loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Delete Permanently</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}