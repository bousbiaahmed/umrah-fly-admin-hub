import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, Plus, BookOpen, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { PageSpinner, Spinner } from "@/components/Spinner";
import { DataTable, Column } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, DetailGrid } from "./Users";
import { I18nInput, I18nValue, toI18n, loc, hasI18n, LANGS } from "@/components/I18nField";

type Dua = {
  id_douaa: number;
  titre?: any;
  texte_arabe?: string;
  traduction?: any;
  audio_url?: string;
};

const truncate = (s: string | undefined, n = 60) =>
  !s ? "—" : s.length > n ? s.slice(0, n) + "…" : s;

export default function Duas() {
  const [list, setList] = useState<Dua[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<Dua | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingDua, setEditingDua] = useState<Dua | null>(null);
  const [deletingDua, setDeletingDua] = useState<Dua | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  const [titre, setTitre] = useState<I18nValue>({});
  const [traduction, setTraduction] = useState<I18nValue>({});
  const [texteArabe, setTexteArabe] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<Dua[]>("/douaa/all");
      setList(Array.isArray(data) ? data : []);
    } catch (err: any) { toast.error(err?.message || "Échec du chargement des douaas"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setTitre({}); setTraduction({}); setTexteArabe(""); setAudioFile(null); setErrors({});
    setEditingDua(null);
  };

  const openEdit = (d: Dua) => {
    setEditingDua(d);
    setTitre(toI18n(d.titre));
    setTraduction(toI18n(d.traduction));
    setTexteArabe(d.texte_arabe || "");
    setAudioFile(null);
    setErrors({});
    setAdding(true);
  };

  const submit = async () => {
    const errs: Record<string, string> = {};
    if (!hasI18n(titre)) errs.titre = "Requis";
    if (!texteArabe.trim()) errs.texte_arabe = "Requis";
    if (!editingDua && !audioFile) errs.audio = "Fichier audio requis";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      if (editingDua) {
        let audio_filename: string | undefined;
        if (audioFile) {
          const formData = new FormData();
          formData.append("audio", audioFile);
          const uploadRes = await api.postForm<{ filename: string }>("/douaa/upload-audio", formData);
          audio_filename = uploadRes.filename;
        }
        await api.put(`/douaa/${editingDua.id_douaa}`, {
          titre,
          texte_arabe: texteArabe,
          traduction,
          ...(audio_filename && { audio_filename }),
        });
        toast.success("Douaa mise à jour");
      } else {
        const formData = new FormData();
        formData.append("audio", audioFile!);
        const uploadRes = await api.postForm<{ filename: string }>("/douaa/upload-audio", formData);
        const { filename } = uploadRes;
        await api.post("/douaa/", {
          titre,
          texte_arabe: texteArabe,
          traduction,
          audio_filename: filename,
        });
        toast.success("Douaa créée avec succès");
      }
      setAdding(false);
      resetForm();
      load();
    } catch (err: any) {
      toast.error(err?.message || "Échec de l'enregistrement");
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deletingDua) return;
    setDelLoading(true);
    try {
      await api.del(`/douaa/${deletingDua.id_douaa}`);
      toast.success("Douaa supprimée");
      setDeletingDua(null);
      load();
    } catch (err: any) {
      toast.error(err?.message || "Échec de la suppression");
    } finally { setDelLoading(false); }
  };

  const columns: Column<Dua>[] = [
    { key: "id_douaa", header: "ID", sortable: true, className: "w-16" },
    { key: "titre", header: "Titre", sortable: true, render: (d) => <span className="font-medium">{loc(d.titre) || "—"}</span> },
    { key: "texte_arabe", header: "Arabe", render: (d) => <span dir="rtl" className="font-arabic text-foreground/80">{truncate(d.texte_arabe, 40)}</span> },
    { key: "traduction", header: "Traduction", render: (d) => <span className="text-muted-foreground">{truncate(loc(d.traduction), 60)}</span> },
    { key: "audio_url", header: "Audio", render: (d) => d.audio_url ? <span className="text-xs text-primary">✓ disponible</span> : <span className="text-xs text-muted-foreground">—</span> },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Douaas"
        description="Bibliothèque des invocations."
        action={<Button onClick={() => { resetForm(); setAdding(true); }}><Plus size={16} className="mr-1" /> Ajouter une douaa</Button>}
      />

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {loading ? <PageSpinner /> : (
          <DataTable
            columns={columns} data={list} rowKey={(d) => d.id_douaa}
            empty={<EmptyState icon={<BookOpen size={26} />} title="Aucune douaa" description="Ajoutez votre première invocation pour commencer." />}
            actions={(d) => (
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => setViewing(d)} title="Voir"><Eye size={16} /></Button>
                <Button size="icon" variant="ghost" onClick={() => openEdit(d)} title="Modifier"><Pencil size={16} /></Button>
                <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeletingDua(d)} title="Supprimer"><Trash2 size={16} /></Button>
              </div>
            )}
          />
        )}
      </div>

      <Sheet open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{loc(viewing?.titre) || "Douaa"}</SheetTitle></SheetHeader>
          {viewing && (
            <div className="mt-6 space-y-5">
              <div>
                <div className="text-xs text-muted-foreground mb-2">Titre</div>
                <div className="space-y-1 text-sm">
                  {LANGS.map((l) => (
                    <div key={l.key} className="flex gap-2">
                      <span className="text-[10px] font-mono uppercase text-muted-foreground w-8">{l.key}</span>
                      <span dir={l.dir}>{toI18n(viewing.titre)[l.key] || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-2">Arabe</div>
                <div dir="rtl" className="text-2xl leading-loose text-right font-medium bg-accent-soft/40 p-4 rounded-lg">
                  {viewing.texte_arabe || "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-2">Traduction</div>
                <div className="space-y-2 text-sm">
                  {LANGS.map((l) => (
                    <div key={l.key}>
                      <div className="text-[10px] font-mono uppercase text-muted-foreground">{l.key}</div>
                      <div dir={l.dir} className="leading-relaxed">{toI18n(viewing.traduction)[l.key] || "—"}</div>
                    </div>
                  ))}
                </div>
              </div>
              {viewing.audio_url && (
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Audio</div>
                  <audio controls src={viewing.audio_url} className="w-full" />
                </div>
              )}
              <DetailGrid items={[["ID", viewing.id_douaa], ["URL audio", viewing.audio_url]]} />
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={adding} onOpenChange={(o) => { setAdding(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingDua ? "Modifier la douaa" : "Ajouter une douaa"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Titre * (3 langues)" error={errors.titre}>
              <I18nInput value={titre} onChange={setTitre} error={!!errors.titre} />
            </Field>
            <Field label="Texte arabe *" error={errors.texte_arabe}>
              <Textarea dir="rtl" rows={4} value={texteArabe} onChange={(e) => setTexteArabe(e.target.value)} className={errors.texte_arabe ? "border-destructive" : ""} />
            </Field>
            <Field label="Traduction (3 langues)">
              <I18nInput value={traduction} onChange={setTraduction} multiline rows={2} />
            </Field>
            <Field label={editingDua ? "Fichier audio (.mp3) — optionnel pour mise à jour" : "Fichier audio (.mp3) *"} error={errors.audio}>
              <Input
                type="file"
                accept=".mp3,audio/*"
                onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
                className={errors.audio ? "border-destructive" : ""}
              />
              {audioFile && (
                <p className="text-xs text-muted-foreground mt-1">📎 {audioFile.name}</p>
              )}
              {editingDua && !audioFile && (
                <p className="text-xs text-muted-foreground mt-1">Laissez vide pour conserver l'audio actuel.</p>
              )}
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)} disabled={saving}>Annuler</Button>
            <Button onClick={submit} disabled={saving}>{saving ? <Spinner className="text-primary-foreground" /> : (editingDua ? "Enregistrer" : "Créer la douaa")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletingDua} onOpenChange={(o) => !o && setDeletingDua(null)}
        title="Supprimer cette douaa ?" description={`"${loc(deletingDua?.titre)}" sera supprimée définitivement.`}
        confirmText="Supprimer" loading={delLoading} onConfirm={confirmDelete}
      />
    </div>
  );
}
