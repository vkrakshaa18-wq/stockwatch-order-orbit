import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, PackageX, Search, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { productsQuery, transactionsQuery, ALL_KEYS } from "@/lib/data";
import { errMsg, fmtDate, stockStatus } from "@/lib/stock";
import { PageHeader, Panel, Empty } from "@/components/app/PageHeader";
import { TxnBadge } from "@/components/app/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({ meta: [{ title: "Inventory — Stock Management System" }] }),
  component: InventoryPage,
});

type Op = "stock_in" | "stock_out" | "adjustment";

function InventoryPage() {
  const qc = useQueryClient();
  const { data: products = [] } = useQuery(productsQuery);
  const { data: txns = [] } = useQuery(transactionsQuery);
  const [op, setOp] = useState<Op>("stock_in");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");

  const selected = products.find((p) => p.id === productId);
  const out = products.filter((p) => p.quantity === 0);
  const low = products.filter((p) => stockStatus(p.quantity, p.low_stock_threshold) === "low_stock");

  const mut = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("adjust_stock", { _product_id: productId, _type: op, _qty: Number(qty), _notes: notes.trim() || "" });
      if (error) throw error;
      return data;
    },
    onSuccess: (n) => {
      toast.success(`Stock updated — ${selected?.name} now has ${n} units`);
      setQty(""); setNotes("");
      ALL_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: k }));
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    const n = Number(qty);
    if (!productId) return setErr("Select a product");
    if (!Number.isInteger(n) || n <= 0) return setErr("Enter a whole number greater than 0");
    if (op === "stock_out" && selected && n > selected.quantity) return setErr(`Only ${selected.quantity} units available`);
    if (notes.length > 300) return setErr("Notes are too long");
    mut.mutate();
  }

  const history = useMemo(() => {
    const s = q.toLowerCase();
    return txns.filter((t) => (type === "all" || t.type === type) && (!s || t.products?.name?.toLowerCase().includes(s) || t.reference?.toLowerCase().includes(s) || t.notes?.toLowerCase().includes(s)));
  }, [txns, q, type]);

  return (
    <div>
      <PageHeader title="Inventory" description="Record stock movements and monitor stock levels." />

      {(out.length > 0 || low.length > 0) && (
        <div className="mb-6 grid gap-3 md:grid-cols-2">
          {out.length > 0 && (
            <div className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/8 p-4">
              <PackageX className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div><div className="text-sm font-semibold text-destructive">{out.length} product{out.length > 1 && "s"} out of stock</div>
                <div className="mt-1 text-xs text-muted-foreground">{out.map((p) => p.name).join(", ")}</div></div>
            </div>
          )}
          {low.length > 0 && (
            <div className="flex gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning-foreground" />
              <div><div className="text-sm font-semibold text-warning-foreground">{low.length} product{low.length > 1 && "s"} running low</div>
                <div className="mt-1 text-xs text-muted-foreground">{low.map((p) => `${p.name} (${p.quantity})`).join(", ")}</div></div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Stock operation">
          <form onSubmit={submit} className="space-y-4 p-5" noValidate>
            <Tabs value={op} onValueChange={(v) => setOp(v as Op)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="stock_in"><ArrowDownToLine className="h-3.5 w-3.5" /> In</TabsTrigger>
                <TabsTrigger value="stock_out"><ArrowUpFromLine className="h-3.5 w-3.5" /> Out</TabsTrigger>
                <TabsTrigger value="adjustment"><SlidersHorizontal className="h-3.5 w-3.5" /> Set</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="space-y-1.5">
              <Label>Product</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.quantity})</SelectItem>)}</SelectContent>
              </Select>
              {selected && <p className="text-xs text-muted-foreground">Current stock: <b>{selected.quantity}</b></p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qty">{op === "adjustment" ? "New quantity" : "Quantity"}</Label>
              <Input id="qty" type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input id="notes" placeholder={op === "stock_in" ? "e.g. Purchase from supplier" : "e.g. Damaged goods"} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {err && <p className="text-xs font-medium text-destructive">{err}</p>}
            <Button type="submit" variant="hero" className="w-full" disabled={mut.isPending}>
              {mut.isPending ? "Saving…" : op === "stock_in" ? "Add stock" : op === "stock_out" ? "Remove stock" : "Update quantity"}
            </Button>
          </form>
        </Panel>

        <Panel title="Transaction history" className="lg:col-span-2">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search product, reference, notes…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem><SelectItem value="stock_in">Stock in</SelectItem>
                <SelectItem value="stock_out">Stock out</SelectItem><SelectItem value="order">Orders</SelectItem><SelectItem value="adjustment">Adjustments</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {history.length === 0 ? <Empty text="No transactions found." /> : (
            <div className="max-h-[560px] overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Product</TableHead><TableHead>Movement</TableHead><TableHead>Stock</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
                <TableBody>
                  {history.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap text-xs">{fmtDate(t.created_at)}</TableCell>
                      <TableCell className="font-medium">{t.products?.name ?? "—"}</TableCell>
                      <TableCell><TxnBadge type={t.type} qty={t.quantity} /></TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{t.previous_quantity} → <b>{t.new_quantity}</b></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{[t.reference, t.notes].filter(Boolean).join(" · ") || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
