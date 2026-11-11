import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Pencil, Plus, Search, Tags } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { categoriesQuery, productsQuery, suppliersQuery, ALL_KEYS, type Product } from "@/lib/data";
import { errMsg, money, stockStatus } from "@/lib/stock";
import { PageHeader, Panel, Empty } from "@/components/app/PageHeader";
import { StockBadge } from "@/components/app/badges";
import { ConfirmDelete } from "@/components/app/ConfirmDelete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({ meta: [{ title: "Products — Stock Management System" }] }),
  component: ProductsPage,
});

const schema = z.object({
  sku: z.string().trim().min(1, "Product ID is required").max(40),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  description: z.string().trim().max(1000).transform((v) => v || null),
  price: z.coerce.number({ invalid_type_error: "Enter a price" }).min(0, "Price cannot be negative"),
  quantity: z.coerce.number().int("Whole numbers only").min(0, "Quantity cannot be negative"),
  low_stock_threshold: z.coerce.number().int().min(0),
  category_id: z.string().nullable(),
  supplier_id: z.string().nullable(),
});

const empty = { sku: "", name: "", description: "", price: "", quantity: "0", low_stock_threshold: "10", category_id: null as string | null, supplier_id: null as string | null };

function ProductsPage() {
  const qc = useQueryClient();
  const { data: products = [], isLoading } = useQuery(productsQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: suppliers = [] } = useQuery(suppliersQuery);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [catOpen, setCatOpen] = useState(false);
  const [newCat, setNewCat] = useState("");

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    return products.filter(
      (p) =>
        (cat === "all" || p.category_id === cat) &&
        (status === "all" || stockStatus(p.quantity, p.low_stock_threshold) === status) &&
        (!s || [p.name, p.sku, p.description, p.suppliers?.name].some((v) => v?.toLowerCase().includes(s))),
    );
  }, [products, q, cat, status]);

  const refresh = () => ALL_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: k }));

  const save = useMutation({
    mutationFn: async (v: z.infer<typeof schema>) => {
      if (editing) {
        const { quantity: _q, ...rest } = v;
        const { error } = await supabase.from("products").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", editing.id);
        if (error) throw error;
        if (v.quantity !== editing.quantity) {
          const { error: e2 } = await supabase.rpc("adjust_stock", { _product_id: editing.id, _type: "adjustment", _qty: v.quantity || 0, _notes: "Edited in product form" });
          if (e2 && v.quantity === 0) {
            // adjust_stock requires > 0; fall back to stock_out of all
            const { error: e3 } = await supabase.rpc("adjust_stock", { _product_id: editing.id, _type: "stock_out", _qty: editing.quantity, _notes: "Set to zero in product form" });
            if (e3) throw e3;
          } else if (e2) throw e2;
        }
      } else {
        const { error } = await supabase.from("products").insert(v);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Product updated" : "Product added");
      setOpen(false);
      refresh();
    },
    onError: (e) => toast.error(errMsg(e).includes("duplicate") ? "A product with this Product ID already exists" : errMsg(e)),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Product deleted"); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  const addCat = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("categories").insert({ name });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Category added"); setNewCat(""); qc.invalidateQueries({ queryKey: ["categories"] }); },
    onError: (e) => toast.error(errMsg(e).includes("duplicate") ? "Category already exists" : errMsg(e)),
  });
  const delCat = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Category removed"); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  function openNew() {
    setEditing(null);
    setForm({ ...empty, sku: `PRD-${String(products.length + 1).padStart(4, "0")}` });
    setErrors({});
    setOpen(true);
  }
  function openEdit(p: Product) {
    setEditing(p);
    setForm({ sku: p.sku, name: p.name, description: p.description ?? "", price: String(p.price), quantity: String(p.quantity), low_stock_threshold: String(p.low_stock_threshold), category_id: p.category_id, supplier_id: p.supplier_id });
    setErrors({});
    setOpen(true);
  }
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
  const f = (k: "sku" | "name" | "price" | "quantity" | "low_stock_threshold", label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type={type} step={k === "price" ? "0.01" : undefined} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} aria-invalid={!!errors[k]} />
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Products"
        description={`${products.length} products in your catalogue`}
        actions={<>
          <Button variant="outline" onClick={() => setCatOpen(true)}><Tags className="h-4 w-4" /> Categories</Button>
          <Button variant="hero" onClick={openNew}><Plus className="h-4 w-4" /> Add product</Button>
        </>}
      />
      <Panel>
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by name, ID, supplier…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="md:w-48"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="md:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="in_stock">In stock</SelectItem>
              <SelectItem value="low_stock">Low stock</SelectItem>
              <SelectItem value="out_of_stock">Out of stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isLoading ? <Empty text="Loading…" /> : filtered.length === 0 ? <Empty text={products.length ? "No products match your filters." : "No products yet — add your first one."} /> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Product ID</TableHead><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Supplier</TableHead>
                <TableHead className="text-right">Price</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                    <TableCell><div className="font-medium">{p.name}</div>{p.description && <div className="max-w-xs truncate text-xs text-muted-foreground">{p.description}</div>}</TableCell>
                    <TableCell>{p.categories?.name ?? "—"}</TableCell>
                    <TableCell>{p.suppliers?.name ?? "—"}</TableCell>
                    <TableCell className="text-right">{money(p.price)}</TableCell>
                    <TableCell className="text-right font-semibold">{p.quantity}</TableCell>
                    <TableCell><StockBadge quantity={p.quantity} threshold={p.low_stock_threshold} /></TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                      <ConfirmDelete title={`Delete ${p.name}?`} onConfirm={() => del.mutate(p.id)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing ? "Edit product" : "Add product"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
            {f("sku", "Product ID")}
            {f("name", "Product name")}
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category_id ?? "none"} onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <Select value={form.supplier_id ?? "none"} onValueChange={(v) => setForm({ ...form, supplier_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No supplier</SelectItem>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {f("price", "Price (₹)", "number")}
            {f("quantity", "Quantity", "number")}
            {f("low_stock_threshold", "Low-stock alert at", "number")}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" variant="hero" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save product"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Categories</DialogTitle></DialogHeader>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const n = newCat.trim(); if (n.length < 2) { toast.error("Category name is too short"); return; } addCat.mutate(n.slice(0, 60)); }}>
            <Input placeholder="New category name" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
            <Button type="submit" disabled={addCat.isPending}>Add</Button>
          </form>
          <ul className="max-h-72 divide-y overflow-y-auto rounded-lg border">
            {categories.length === 0 && <li className="p-4 text-sm text-muted-foreground">No categories yet.</li>}
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
                {c.name}
                <ConfirmDelete title={`Delete category "${c.name}"?`} description="Products in this category will become uncategorised." onConfirm={() => delCat.mutate(c.id)} />
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
