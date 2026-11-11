import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Pencil, Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { suppliersQuery, ALL_KEYS, type Supplier } from "@/lib/data";
import { errMsg } from "@/lib/stock";
import { PageHeader, Panel, Empty } from "@/components/app/PageHeader";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers — Stock Management System" }] }),
  component: SuppliersPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  contact_number: z.string().trim().regex(/^[+\d][\d\s-]{6,19}$/, "Enter a valid phone number"),
  email: z.string().trim().email("Enter a valid email").max(255),
  address: z.string().trim().max(500).transform((v) => v || null),
});
const empty = { name: "", contact_number: "", email: "", address: "" };

function SuppliersPage() {
  const qc = useQueryClient();
  const { data: suppliers = [], isLoading } = useQuery(suppliersQuery);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const list = useMemo(() => {
    const s = q.toLowerCase().trim();
    return suppliers.filter((x) => !s || [x.name, x.email, x.contact_number, x.address].some((v) => v?.toLowerCase().includes(s)));
  }, [suppliers, q]);

  const refresh = () => ALL_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: k }));
  const save = useMutation({
    mutationFn: async (v: z.infer<typeof schema>) => {
      const { error } = editing ? await supabase.from("suppliers").update(v).eq("id", editing.id) : await supabase.from("suppliers").insert(v);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(editing ? "Supplier updated" : "Supplier added"); setOpen(false); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("suppliers").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Supplier deleted"); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const r = schema.safeParse(form);
    if (!r.success) {
      const errs: Record<string, string> = {};
      r.error.issues.forEach((i) => (errs[String(i.path[0])] ??= i.message));
      return setErrors(errs);
    }
    save.mutate(r.data);
  }
  const f = (k: keyof typeof empty, label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      {k === "address" ? <Textarea id={k} rows={3} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
        : <Input id={k} type={type} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} aria-invalid={!!errors[k]} />}
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <div>
      <PageHeader title="Suppliers" description={`${suppliers.length} suppliers`} actions={
        <Button variant="hero" onClick={() => { setEditing(null); setForm(empty); setErrors({}); setOpen(true); }}><Plus className="h-4 w-4" /> Add supplier</Button>
      } />
      <Panel>
        <div className="border-b p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search suppliers…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {isLoading ? <Empty text="Loading…" /> : list.length === 0 ? <Empty text={suppliers.length ? "No suppliers match your search." : "No suppliers yet — add your first one."} /> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Supplier ID</TableHead><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Email</TableHead><TableHead>Address</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {list.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">SUP-{s.id.slice(0, 6).toUpperCase()}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.contact_number}</TableCell>
                    <TableCell>{s.email}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{s.address || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => { setEditing(s); setForm({ name: s.name, contact_number: s.contact_number ?? "", email: s.email ?? "", address: s.address ?? "" }); setErrors({}); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <ConfirmDelete title={`Delete ${s.name}?`} description="Products linked to this supplier will keep their data but lose the supplier link." onConfirm={() => del.mutate(s.id)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit supplier" : "Add supplier"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4" noValidate>
            {f("name", "Supplier name")}
            <div className="grid gap-4 sm:grid-cols-2">{f("contact_number", "Contact number", "tel")}{f("email", "Email", "email")}</div>
            {f("address", "Address")}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" variant="hero" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save supplier"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
