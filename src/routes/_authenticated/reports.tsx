import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { ordersQuery, productsQuery, transactionsQuery, type Order, type Product, type Txn } from "@/lib/data";
import { fmtDate, money, stockStatus, statusLabel } from "@/lib/stock";
import { exportCSV, exportPDF, type Col } from "@/lib/export";
import { PageHeader, Panel, Empty } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — Stock Management System" }] }),
  component: ReportsPage,
});

type Key = "inventory" | "stock_in" | "stock_out" | "low" | "sales" | "orders";
const titles: Record<Key, string> = {
  inventory: "Product Inventory Report", stock_in: "Stock-In Report", stock_out: "Stock-Out Report",
  low: "Low-Stock Report", sales: "Sales Report", orders: "Order Report",
};

const productCols: Col<Product>[] = [
  { header: "Product ID", value: (p) => p.sku }, { header: "Name", value: (p) => p.name },
  { header: "Category", value: (p) => p.categories?.name ?? "" }, { header: "Supplier", value: (p) => p.suppliers?.name ?? "" },
  { header: "Price", value: (p) => Number(p.price).toFixed(2) }, { header: "Quantity", value: (p) => p.quantity },
  { header: "Stock Value", value: (p) => (p.quantity * Number(p.price)).toFixed(2) },
  { header: "Status", value: (p) => statusLabel[stockStatus(p.quantity, p.low_stock_threshold)] },
];
const txnCols: Col<Txn>[] = [
  { header: "Date", value: (t) => fmtDate(t.created_at) }, { header: "Product", value: (t) => t.products?.name ?? "" },
  { header: "Type", value: (t) => t.type.replace("_", " ") }, { header: "Quantity", value: (t) => Math.abs(t.quantity) },
  { header: "Before", value: (t) => t.previous_quantity }, { header: "After", value: (t) => t.new_quantity },
  { header: "Reference / Notes", value: (t) => [t.reference, t.notes].filter(Boolean).join(" · ") },
];
const orderCols: Col<Order>[] = [
  { header: "Order", value: (o) => o.order_number }, { header: "Date", value: (o) => fmtDate(o.created_at) },
  { header: "Customer", value: (o) => o.customer_name }, { header: "Items", value: (o) => o.order_items.reduce((s, i) => s + i.quantity, 0) },
  { header: "Status", value: (o) => o.status }, { header: "Total", value: (o) => Number(o.total).toFixed(2) },
];

function ReportsPage() {
  const { data: products = [] } = useQuery(productsQuery);
  const { data: txns = [] } = useQuery(transactionsQuery);
  const { data: orders = [] } = useQuery(ordersQuery);
  const [key, setKey] = useState<Key>("inventory");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const inRange = (d: string) => {
    const t = new Date(d).getTime();
    if (from && t < new Date(`${from}T00:00:00`).getTime()) return false;
    if (to && t > new Date(`${to}T23:59:59`).getTime()) return false;
    return true;
  };
  const dated = key !== "inventory" && key !== "low";

  const report = useMemo(() => {
    switch (key) {
      case "inventory": return { cols: productCols, rows: products, summary: `Total stock value: ${money(products.reduce((s, p) => s + p.quantity * Number(p.price), 0))}` };
      case "low": {
        const rows = products.filter((p) => stockStatus(p.quantity, p.low_stock_threshold) !== "in_stock");
        return { cols: productCols, rows, summary: `${rows.length} products need restocking` };
      }
      case "stock_in": {
        const rows = txns.filter((t) => inRange(t.created_at) && (t.type === "stock_in" || (t.type === "adjustment" && t.quantity > 0)));
        return { cols: txnCols, rows, summary: `Units received: ${rows.reduce((s, t) => s + Math.abs(t.quantity), 0)}` };
      }
      case "stock_out": {
        const rows = txns.filter((t) => inRange(t.created_at) && (t.type === "stock_out" || t.type === "order" || (t.type === "adjustment" && t.quantity < 0)));
        return { cols: txnCols, rows, summary: `Units removed: ${rows.reduce((s, t) => s + Math.abs(t.quantity), 0)}` };
      }
      case "sales": {
        const rows = orders.filter((o) => inRange(o.created_at) && o.status === "completed");
        return { cols: orderCols, rows, summary: `Revenue: ${money(rows.reduce((s, o) => s + Number(o.total), 0))} from ${rows.length} completed orders` };
      }
      case "orders": {
        const rows = orders.filter((o) => inRange(o.created_at));
        return { cols: orderCols, rows, summary: `${rows.length} orders · value ${money(rows.reduce((s, o) => s + Number(o.total), 0))}` };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, products, txns, orders, from, to]) as { cols: Col<unknown>[]; rows: unknown[]; summary: string };

  const subtitle = `${dated && (from || to) ? `Period: ${from || "start"} to ${to || "today"} · ` : ""}${report.summary} · Generated ${new Date().toLocaleString()}`;

  return (
    <div>
      <PageHeader title="Reports" description="Filter by date and export to CSV or PDF." actions={<>
        <Button variant="outline" disabled={!report.rows.length} onClick={() => exportCSV(titles[key].toLowerCase().replace(/\s+/g, "-"), report.cols, report.rows)}><FileSpreadsheet className="h-4 w-4" /> Export CSV</Button>
        <Button variant="hero" disabled={!report.rows.length} onClick={() => exportPDF(titles[key], report.cols, report.rows, subtitle)}><FileDown className="h-4 w-4" /> Export PDF</Button>
      </>} />
      <Tabs value={key} onValueChange={(v) => setKey(v as Key)} className="mb-4">
        <TabsList className="h-auto flex-wrap">
          {(Object.keys(titles) as Key[]).map((k) => <TabsTrigger key={k} value={k}>{titles[k].replace(" Report", "")}</TabsTrigger>)}
        </TabsList>
      </Tabs>
      <Panel title={titles[key]} action={<span className="text-xs font-medium text-muted-foreground">{report.summary}</span>}>
        {dated && (
          <div className="flex flex-wrap items-end gap-3 border-b p-4">
            <div className="space-y-1.5"><Label htmlFor="from">From</Label><Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="to">To</Label><Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            {(from || to) && <Button variant="ghost" onClick={() => { setFrom(""); setTo(""); }}>Clear dates</Button>}
          </div>
        )}
        {report.rows.length === 0 ? <Empty text="No records for this report." /> : (
          <div className="max-h-[600px] overflow-auto">
            <Table>
              <TableHeader><TableRow>{report.cols.map((c) => <TableHead key={c.header}>{c.header}</TableHead>)}</TableRow></TableHeader>
              <TableBody>{report.rows.map((r, i) => (
                <TableRow key={i}>{report.cols.map((c) => <TableCell key={c.header} className="whitespace-nowrap text-sm">{c.value(r)}</TableCell>)}</TableRow>
              ))}</TableBody>
            </Table>
          </div>
        )}
      </Panel>
    </div>
  );
}
