import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Trash2, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import {
  listDocuments,
  createDocument,
  deleteDocument,
} from "@/lib/documents.functions";
import { extractPdfText } from "@/lib/pdf-client";

export const Route = createFileRoute("/_authenticated/resumos")({
  head: () => ({ meta: [{ title: "Resumos — Chronos" }] }),
  component: ResumosPage,
});

type Doc = {
  id: string;
  title: string;
  mime_type: string;
  page_count: number | null;
  size_bytes: number | null;
  status: string;
  created_at: string;
};

function ResumosPage() {
  const fetchDocs = useServerFn(listDocuments);
  const createFn = useServerFn(createDocument);
  const deleteFn = useServerFn(deleteDocument);

  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDocs((await fetchDocs()) as Doc[]);
    } finally {
      setLoading(false);
    }
  }, [fetchDocs]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFile(file: File) {
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx 25MB)");
      return;
    }
    if (!file.type.includes("pdf")) {
      toast.error("Por enquanto só PDFs");
      return;
    }
    setUploading(true);
    try {
      toast.info("Extraindo texto do PDF…");
      const buf = await file.arrayBuffer();
      const extracted = await extractPdfText(buf);

      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Sessão expirada");

      const path = `${uid}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      toast.info("Enviando arquivo…");
      const { error: upErr } = await supabase.storage
        .from("documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw new Error(upErr.message);

      await createFn({
        data: {
          title: file.name.replace(/\.pdf$/i, ""),
          storage_path: path,
          mime_type: file.type || "application/pdf",
          size_bytes: file.size,
          page_count: extracted.pageCount,
          extracted_text: extracted.fullText.slice(0, 1_500_000),
        },
      });

      toast.success("Documento adicionado!");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no upload");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Apagar documento e resumos?")) return;
    await deleteFn({ data: { id } });
    toast.success("Apagado");
    load();
  }

  function fmtSize(b: number | null) {
    if (!b) return "";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  }

  return (
    <div className="min-h-screen bg-app-gradient">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold">Resumos</h1>
          <p className="text-sm text-muted-foreground">
            Suba um PDF e a IA gera resumo, mapa mental, revisão rápida e flashcards.
          </p>
        </div>

        <label
          className={`block rounded-3xl border-2 border-dashed p-8 text-center cursor-pointer transition ${
            uploading
              ? "border-primary/60 bg-primary/5"
              : "border-border/60 hover:border-primary/60 hover:bg-muted/40"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          {uploading ? (
            <>
              <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin" />
              <p className="mt-3 font-semibold">Processando…</p>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="mt-3 font-semibold">Clique pra enviar um PDF</p>
              <p className="text-xs text-muted-foreground mt-1">Até 25MB</p>
            </>
          )}
        </label>

        <div className="mt-8">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : docs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum documento ainda.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {docs.map((d) => (
                <div
                  key={d.id}
                  className="rounded-2xl border border-border/60 bg-card p-4 flex items-start gap-3"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/resumos/$documentId"
                      params={{ documentId: d.id }}
                      className="font-semibold truncate block hover:text-primary"
                    >
                      {d.title}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {d.page_count ?? "?"} págs • {fmtSize(d.size_bytes)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
