import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, Trash2, Send, Bell } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { PageSpinner, Spinner } from "@/components/Spinner";
import { DataTable, Column } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, DetailGrid } from "./Users";

type Notif = {
  id_notification: number;
  titre?: string;
  message?: string;
  categorie?: string;
  type?: string;
  lue?: boolean;
  is_global?: boolean;
  date_envoi?: string;
  id_utilisateur?: number | null;
};

const truncate = (s?: string, n = 60) => !s ? "—" : s.length > n ? s.slice(0, n) + "…" : s;

export default function Notifications() {
  const [list, setList] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<Notif | null>(null);
  const [deleting, setDeleting] = useState<Notif | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  const [form, setForm] = useState<any>({ categorie: "info", is_global: true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<any>("/notifications/admin/all");
      const arr = Array.isArray(data) ? data : (Array.isArray(data?.notifications) ? data.notifications : []);
      setList(arr);
    } catch (err: any) { toast.error(err?.message || "Échec du chargement des notifications"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const send = async () => {
    const errs: Record<string, string> = {};
    if (!form.titre) errs.titre = "Requis";
    if (!form.message) errs.message = "Requis";
    if (!form.is_global && !form.id_utilisateur) errs.id_utilisateur = "Requis pour un envoi ciblé";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSending(true);
    try {
      await api.post("/notifications/admin/send", {
        titre: form.titre,
        message: form.message,
        categorie: String(form.categorie || "info").toLowerCase(),
        type: form.type || null,
        sendToAll: !!form.is_global,
        userId: form.is_global ? null : Number(form.id_utilisateur),
      });
      toast.success("Notification envoyée");
      setForm({ categorie: "info", is_global: true });
      load();
    } catch (err: any) { toast.error(err?.message || "Échec de l'envoi"); }
    finally { setSending(false); }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDelLoading(true);
    try {
      await api.del(`/notifications/admin/${deleting.id_notification}`);
      toast.success("Notification supprimée");
      setDeleting(null); load();
    } catch (err: any) { toast.error(err?.message || "Échec de la suppression"); }
    finally { setDelLoading(false); }
  };

  const columns: Column<Notif>[] = [
    { key: "titre", header: "Titre", sortable: true, render: (n) => <span className="font-medium">{n.titre || "—"}</span> },
    { key: "message", header: "Message", render: (n) => <span className="text-muted-foreground">{truncate(n.message, 60)}</span> },
    { key: "categorie", header: "Catégorie", sortable: true, render: (n) => n.categorie ? <Badge variant="outline">{n.categorie}</Badge> : "—" },
    { key: "type", header: "Type", render: (n) => n.type || "—" },
    { key: "is_global", header: "Globale", sortable: true, render: (n) => (
      n.is_global
        ? <Badge className="bg-accent text-accent-foreground hover:bg-accent">Oui</Badge>
        : <Badge variant="outline">Non</Badge>
    ) },
    { key: "lue", header: "Lue", sortable: true, render: (n) => (
      n.lue
        ? <Badge variant="outline" className="bg-success/10 text-success border-success/30">Lue</Badge>
        : <Badge variant="outline">Non lue</Badge>
    ) },
    { key: "date_envoi", header: "Date", sortable: true, render: (n) => n.date_envoi ? new Date(n.date_envoi).toLocaleDateString() : "—" },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Notifications" description="Envoyez et gérez les notifications de l'application." />

      <div className="bg-card rounded-xl border shadow-sm p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Send size={16} />
          </div>
          <div>
            <h2 className="font-semibold">Envoyer une notification</h2>
            <p className="text-xs text-muted-foreground">Diffusez à tous les utilisateurs ou ciblez un utilisateur précis.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Titre *" error={errors.titre}>
            <Input value={form.titre || ""} onChange={(e) => setForm((f: any) => ({ ...f, titre: e.target.value }))} className={errors.titre ? "border-destructive" : ""} />
          </Field>
          <Field label="Catégorie">
            <Select value={form.categorie || "info"} onValueChange={(v) => setForm((f: any) => ({ ...f, categorie: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="alert">Alerte</SelectItem>
                <SelectItem value="social">Social</SelectItem>
                <SelectItem value="rappel">Rappel</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Message *" error={errors.message} className="md:col-span-2">
            <Textarea rows={3} value={form.message || ""} onChange={(e) => setForm((f: any) => ({ ...f, message: e.target.value }))} className={errors.message ? "border-destructive" : ""} />
          </Field>
          <Field label="Type (optionnel)">
            <Input value={form.type || ""} onChange={(e) => setForm((f: any) => ({ ...f, type: e.target.value }))} />
          </Field>
          <div className="flex items-end gap-3 pb-1">
            <div className="flex items-center gap-3 px-3 py-2 rounded-md border bg-muted/40 flex-1">
              <Switch checked={!!form.is_global} onCheckedChange={(v) => setForm((f: any) => ({ ...f, is_global: v }))} />
              <div className="text-sm">
                <div className="font-medium">Envoyer à tous</div>
                <div className="text-xs text-muted-foreground">Désactivez pour cibler un utilisateur</div>
              </div>
            </div>
          </div>
          {!form.is_global && (
            <Field label="ID utilisateur *" error={errors.id_utilisateur} className="md:col-span-2">
              <Input type="number" value={form.id_utilisateur ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, id_utilisateur: e.target.value }))} className={errors.id_utilisateur ? "border-destructive" : ""} />
            </Field>
          )}
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={send} disabled={sending}>
            {sending ? <Spinner className="text-primary-foreground" /> : (<><Send size={14} className="mr-1.5" /> Envoyer</>)}
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {loading ? <PageSpinner /> : (
          <DataTable
            columns={columns} data={list} rowKey={(n) => n.id_notification}
            empty={<EmptyState icon={<Bell size={26} />} title="Aucune notification" description="Les notifications envoyées apparaîtront ici." />}
            actions={(n) => (
              <div className="flex items-center justify-end gap-1">
                <Button size="icon" variant="ghost" onClick={() => setViewing(n)}><Eye size={16} /></Button>
                <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleting(n)}>
                  <Trash2 size={16} />
                </Button>
              </div>
            )}
          />
        )}
      </div>

      <Sheet open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>{viewing?.titre || "Notification"}</SheetTitle></SheetHeader>
          {viewing && (
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-muted/40 rounded-lg text-sm leading-relaxed">{viewing.message}</div>
              <DetailGrid items={[
                ["ID", viewing.id_notification],
                ["Catégorie", viewing.categorie],
                ["Type", viewing.type],
                ["Globale", viewing.is_global ? "Oui" : "Non"],
                ["Lue", viewing.lue ? "Lue" : "Non lue"],
                ["ID utilisateur", viewing.id_utilisateur],
                ["Envoyée le", viewing.date_envoi ? new Date(viewing.date_envoi).toLocaleString() : "—"],
              ]} />
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}
        title="Supprimer cette notification ?" description="Cette action est irréversible."
        onConfirm={confirmDelete} loading={delLoading}
      />
    </div>
  );
}
