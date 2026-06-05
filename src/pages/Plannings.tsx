import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, Pencil, Trash2, Plus, CalendarRange } from "lucide-react";
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

type Planning = {
  id_planning: number;
  titre?: string;
  description?: string;
  date_heure?: string | null;
  type_evenement?: string | null;
};

const truncate = (s?: string, n = 70) => !s ? "—" : s.length > n ? s.slice(0, n) + "…" : s;

export default function Plannings() {
  const [list, setList] = useState<Planning[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewing, setViewing] = useState<Planning | null>(null);
  const [editing, setEditing] = useState<Planning | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<{ titre?: string; description?: string; date_heure?: string; type_evenement?: string }>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<Planning | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<Planning[]>("/plannings/");
      setList(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err?.message || "Échec du chargement des plannings");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm({}); setErrors({}); setAdding(true); };
  const openEdit = (p: Planning) => {
    setEditing(p);
    setForm({
      titre: p.titre,
      description: p.description,
      date_heure: p.date_heure ? new Date(p.date_heure).toISOString().slice(0, 16) : "",
      type_evenement: p.type_evenement || "",
    });
    setErrors({});
  };

  const buildJsonPayload = () => ({
    titre: form.titre || "",
    description: form.description || "",
    type_evenement: form.type_evenement || "",
    date_heure: form.date_heure ? new Date(form.date_heure).toISOString() : null,
  });

  const submit = async () => {
    const errs: Record<string, string> = {};
    if (!form.titre?.trim()) errs.titre = "Requis";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/plannings/${editing.id_planning}`, buildJsonPayload());
        toast.success("Planning mis à jour");
        setEditing(null);
      } else {
        await api.post("/plannings/", buildJsonPayload());
        toast.success("Planning créé");
        setAdding(false);
      }
      setForm({}); load();
    } catch (err: any) {
      toast.error(err?.message || "Échec de l'enregistrement");
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDelLoading(true);
    try {
      await api.del(`/plannings/${deleting.id_planning}`);
      toast.success("Planning supprimé");
      setDeleting(null); load();
    } catch (err: any) {
      toast.error(err?.message || "Échec de la suppression");
    } finally { setDelLoading(false); }
  };

  const columns: Column<Planning>[] = [
    { key: "id_planning", header: "ID", sortable: true, className: "w-16" },
    { key: "titre", header: "Titre", sortable: true, render: (p) => <span className="font-medium">{p.titre || "—"}</span> },
    { key: "type_evenement", header: "Type", render: (p) => <span className="text-muted-foreground">{p.type_evenement || "—"}</span> },
    { key: "date_heure", header: "Date", render: (p) => <span className="text-muted-foreground">{p.date_heure ? new Date(p.date_heure).toLocaleString("fr-FR") : "—"}</span> },
    { key: "description", header: "Description", render: (p) => <span className="text-muted-foreground">{truncate(p.description)}</span> },
  ];

  const isModalOpen = adding || !!editing;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Plannings"
        description="Gérez les plannings du pèlerinage."
        action={<Button onClick={openAdd}><Plus size={16} className="mr-1" /> Ajouter un planning</Button>}
      />

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {loading ? <PageSpinner /> : (
          <DataTable
            columns={columns} data={list} rowKey={(p) => p.id_planning}
            empty={<EmptyState icon={<CalendarRange size={26} />} title="Aucun planning" description="Créez votre premier planning pour commencer." />}
            actions={(p) => (
              <div className="flex items-center justify-end gap-1">
                <Button size="icon" variant="ghost" onClick={() => setViewing(p)}><Eye size={16} /></Button>
                <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil size={16} /></Button>
                <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleting(p)}>
                  <Trash2 size={16} />
                </Button>
              </div>
            )}
          />
        )}
      </div>

      {/* View drawer */}
      <Sheet open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{viewing?.titre || "Planning"}</SheetTitle></SheetHeader>
          {viewing && (
            <div className="mt-6 space-y-5">
              <DetailGrid items={[
                ["ID", viewing.id_planning],
                ["Titre", viewing.titre],
                ["Type d'événement", viewing.type_evenement || "—"],
                ["Date & heure", viewing.date_heure ? new Date(viewing.date_heure).toLocaleString("fr-FR") : "—"],
              ]} />
              <div>
                <div className="text-xs text-muted-foreground mb-2">Description</div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{viewing.description || "—"}</div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create / edit modal */}
      <Dialog open={isModalOpen} onOpenChange={(o) => { if (!o) { setAdding(false); setEditing(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le planning" : "Nouveau planning"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Field label="Titre *" error={errors.titre}>
              <Input
                value={form.titre || ""}
                onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))}
                className={errors.titre ? "border-destructive" : ""}
              />
            </Field>
            <Field label="Description">
              <Textarea
                rows={4}
                value={form.description || ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Field>
            <Field label="Type d'événement">
              <Input
                value={form.type_evenement || ""}
                placeholder="ex: Omra, Hajj…"
                onChange={(e) => setForm((f) => ({ ...f, type_evenement: e.target.value }))}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAdding(false); setEditing(null); }} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? <Spinner className="text-primary-foreground" /> : (editing ? "Enregistrer" : "Créer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Supprimer ce planning ?"
        description={deleting ? `Ceci supprimera définitivement « ${deleting.titre || `#${deleting.id_planning}`} ».` : ""}
        confirmText="Supprimer"
        onConfirm={confirmDelete}
        loading={delLoading}
      />
    </div>
  );
}
