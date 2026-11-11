import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Eye, Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ordersQuery, productsQuery, ALL_KEYS, type Order } from "@/lib/data";
import { errMsg, fmtDate, money, orderTotal } from "@/lib/stock";
import { PageHeader, Panel, Empty } from "@/components/app/PageHeader";
import { OrderStatusBadge } from "@/components/app/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "Orders — Stock Management System" }] }),
  component: OrdersPage,
});

type Status = "pending" | "processing" | "completed" | "cancelled";
const nextStatuses: Record<Status, Status[]> = {
  pending: ["pending", "processing", "completed", "cancelled"],
  processing: ["processing", "completed", "cancelled"],
  completed: ["completed"],
  cancelled: ["cancelled"],
};

function OrdersPage() {
  const qc = useQueryClient();
  const { data: orders = [], isLoading } = useQuery(ordersQuery);
  const { data: products = [] } = useQuery(productsQuery);
  const [tab, setTab] = useState<"all" | Status>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Order | null>(null);
  const [customer, setCustomer] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<{ product_id: string; quantity: string }[]>([{ product_id: "", quantity: "1" }]);
  const [err, setErr] = useState("");

  const refresh = () => ALL_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: k }));
  const counts = useMemo(() => orders.reduce<Record<string, number>>((a, o) => ({ ...a, [o.status]: (a[o.status] ?? 0) + 1 }), {}), [orders]);
  const list = orders.filter((o) => (tab === "all" || o.status === tab) && (!q || `${o.order_number} ${o.customer_name}`.toLowerCase().includes(q.toLowerCase())));

  const priced = lines.map((l) => {
    const p = products.find((x) => x.id === l.product_id);
    return { ...l, p, qty: Number(l.quantity) || 0, price: Number(p?.price ?? 0) };
  });
  const total = orderTotal(priced.map((l) => ({ quantity: l.qty, price: l.price })));

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("create_order", {
        _customer: customer.trim(),
        _notes: notes.trim() || "",
        _items: priced.map((l) => ({ product_id: l.product_id, quantity: l.qty })),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Order created (pending). Confirm it to reduce stock."); setOpen(false); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.rpc("set_order_status", { _order_id: id, _status: status });
      if (error) throw error;
      return status;
    },
    onSuccess: (s) => { toast.success(`Order marked ${s}`); refresh(); },
    onError: (e) => { toast.error(errMsg(e)); refresh(); },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    if (customer.trim().length < 2) return setErr("Enter the customer name");
    if (customer.length > 120) return setErr("Customer name is too long");
    const ids = new Set<string>();
    for (const l of priced) {
      if (!l.p) return setErr("Select a product on every line");
      if (ids.has(l.product_id)) return setErr(`${l.p.name} is added twice — combine the lines`);
      ids.add(l.product_id);
      if (!Number.isInteger(l.qty) || l.qty <= 0) return setErr("Quantities must be whole numbers above 0");
      if (l.qty > l.p.quantity) return setErr(`Insufficient stock for ${l.p.name}: only ${l.p.quantity} available`);
    }
    create.mutate();
  }

  return (
    <div>
      <PageHeader title="Orders" description="Create orders and track them from pending to completed." actions={
        <Button variant="hero" onClick={() => { setCustomer(""); setNotes(""); setLines([{ product_id: "", quantity: "1" }]); setErr(""); setOpen(true); }}><Plus className="h-4 w-4" /> New order</Button>
      } />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {(["pending", "processing", "completed", "cancelled"] as Status[]).map((s) => (
          <div key={s} className="rounded-xl border bg-card p-4 shadow-card">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s}</div>
            <div className="mt-1 font-display text-2xl font-bold">{counts[s] ?? 0}</div>
          </div>
        ))}
      </div>
      <Panel>
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="flex-wrap">
              <TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="processing">Processing</TabsTrigger><TabsTrigger value="completed">Completed</TabsTrigger><TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative md:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search order or customer…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {isLoading ? <Empty text="Loading…" /> : list.length === 0 ? <Empty text="No orders found." /> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Date</TableHead><TableHead>Items</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {list.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                    <TableCell className="font-medium">{o.customer_name}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{fmtDate(o.created_at)}</TableCell>
                    <TableCell>{o.order_items.reduce((s, i) => s + i.quantity, 0)}</TableCell>
                    <TableCell className="text-right font-semibold">{money(o.total)}</TableCell>
                    <TableCell>
                      {nextStatuses[o.status].length > 1 ? (
                        <Select value={o.status} onValueChange={(v) => setStatus.mutate({ id: o.id, status: v as Status })}>
                          <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>{nextStatuses[o.status].map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : <OrderStatusBadge status={o.status} />}
                    </TableCell>
                    <TableCell className="text-right"><Button size="icon" variant="ghost" aria-label="View" onClick={() => setView(o)}><Eye className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New order</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="cust">Customer name</Label><Input id="cust" value={customer} onChange={(e) => setCustomer(e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="onotes">Notes</Label><Input id="onotes" value={notes} maxLength={300} onChange={(e) => setNotes(e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <Label>Products</Label>
              {priced.map((l, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-2">
                  <Select value={l.product_id} onValueChange={(v) => setLines(lines.map((x, j) => (j === i ? { ...x, product_id: v } : x)))}>
                    <SelectTrigger className="min-w-48 flex-1 bg-card"><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id} disabled={p.quantity === 0}>{p.name} — {money(p.price)} ({p.quantity} in stock)</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="number" min={1} className="w-24 bg-card" value={l.quantity} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} />
                  <div className="w-28 text-right text-sm font-semibold">{money(l.qty * l.price)}</div>
                  <Button type="button" size="icon" variant="ghost" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, j) => j !== i))} aria-label="Remove line"><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setLines([...lines, { product_id: "", quantity: "1" }])}><Plus className="h-4 w-4" /> Add product</Button>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-accent px-4 py-3">
              <span className="text-sm font-semibold text-accent-foreground">Total</span>
              <span className="font-display text-xl font-bold text-accent-foreground">{money(total)}</span>
            </div>
            {err && <p className="text-sm font-medium text-destructive">{err}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" variant="hero" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create order"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent>
          {view && (<>
            <DialogHeader><DialogTitle>{view.order_number}</DialogTitle></DialogHeader>
            <div className="flex items-center justify-between text-sm"><span>{view.customer_name}</span><OrderStatusBadge status={view.status} /></div>
            <div className="text-xs text-muted-foreground">{fmtDate(view.created_at)}{view.notes && ` · ${view.notes}`}</div>
            <Table>
              <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Subtotal</TableHead></TableRow></TableHeader>
              <TableBody>{view.order_items.map((i) => (
                <TableRow key={i.id}><TableCell>{i.product_name}</TableCell><TableCell className="text-right">{i.quantity}</TableCell><TableCell className="text-right">{money(i.unit_price)}</TableCell><TableCell className="text-right">{money(i.subtotal)}</TableCell></TableRow>
              ))}</TableBody>
            </Table>
            <div className="text-right font-display text-lg font-bold">Total {money(view.total)}</div>
            <p className="text-xs text-muted-foreground">{view.stock_deducted ? "Stock has been deducted for this order." : "Stock will be deducted when the order is confirmed (processing or completed)."}</p>
          </>)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
