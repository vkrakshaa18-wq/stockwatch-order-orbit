import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Boxes, IndianRupee, Layers, PackageX, ShoppingCart } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { ordersQuery, productsQuery, transactionsQuery } from "@/lib/data";
import { fmtDate, money, stockStatus } from "@/lib/stock";
import { PageHeader, Panel, Empty } from "@/components/app/PageHeader";
import { OrderStatusBadge, TxnBadge } from "@/components/app/badges";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Stock Management System" }] }),
  component: Dashboard,
});


function Stat({ icon: Icon, label, value, tone }: { icon: typeof Boxes; label: string; value: string | number; tone: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className={`grid h-9 w-9 place-items-center rounded-lg ${tone}`}><Icon className="h-4 w-4" /></div>
      </div>
      <div className="mt-3 font-display text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}

function Dashboard() {
  const { data: products = [] } = useQuery(productsQuery);
  const { data: orders = [] } = useQuery(ordersQuery);
  const { data: txns = [] } = useQuery(transactionsQuery);

  const totalQty = products.reduce((s, p) => s + p.quantity, 0);
  const low = products.filter((p) => stockStatus(p.quantity, p.low_stock_threshold) === "low_stock");
  const out = products.filter((p) => p.quantity === 0);
  const sales = orders.filter((o) => o.status === "completed").reduce((s, o) => s + Number(o.total), 0);

  const byCat = Object.values(
    products.reduce<Record<string, { name: string; quantity: number }>>((acc, p) => {
      const n = p.categories?.name ?? "Uncategorised";
      acc[n] ??= { name: n, quantity: 0 };
      acc[n].quantity += p.quantity;
      return acc;
    }, {}),
  );
  const statusData = [
    { name: "In stock", value: products.length - low.length - out.length },
    { name: "Low stock", value: low.length },
    { name: "Out of stock", value: out.length },
  ].filter((d) => d.value > 0);

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your inventory, orders and sales." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Stat icon={Boxes} label="Total products" value={products.length} tone="bg-accent text-accent-foreground" />
        <Stat icon={Layers} label="Total stock qty" value={totalQty.toLocaleString()} tone="bg-secondary text-secondary-foreground" />
        <Stat icon={AlertTriangle} label="Low stock" value={low.length} tone="bg-warning/20 text-warning-foreground" />
        <Stat icon={PackageX} label="Out of stock" value={out.length} tone="bg-destructive/12 text-destructive" />
        <Stat icon={ShoppingCart} label="Total orders" value={orders.length} tone="bg-accent text-accent-foreground" />
        <Stat icon={IndianRupee} label="Total sales" value={money(sales)} tone="bg-success/15 text-success" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Stock by category" className="lg:col-span-2">
          <div className="h-72 p-4">
            {byCat.length === 0 ? <Empty text="Add products to see the chart." /> : (
              <ResponsiveContainer>
                <BarChart data={byCat}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
                  <Tooltip cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="quantity" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>
        <Panel title="Stock status">
          <div className="h-72 p-4">
            {statusData.length === 0 ? <Empty text="No products yet." /> : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {statusData.map((d) => <Cell key={d.name} fill={d.name === "In stock" ? "var(--chart-2)" : d.name === "Low stock" ? "var(--chart-4)" : "var(--chart-5)"} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Recent orders" action={<Link to="/orders" className="text-xs font-semibold text-primary hover:underline">View all</Link>}>
          {orders.length === 0 ? <Empty text="No orders yet." /> : (
            <ul className="divide-y">
              {orders.slice(0, 6).map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{o.order_number} · {o.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(o.created_at)}</div>
                  </div>
                  <div className="flex items-center gap-3"><span className="text-sm font-semibold">{money(o.total)}</span><OrderStatusBadge status={o.status} /></div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Recent inventory activity" action={<Link to="/inventory" className="text-xs font-semibold text-primary hover:underline">View all</Link>}>
          {txns.length === 0 ? <Empty text="No stock movements yet." /> : (
            <ul className="divide-y">
              {txns.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{t.products?.name ?? "Deleted product"}</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(t.created_at)} · {t.previous_quantity} → {t.new_quantity}</div>
                  </div>
                  <TxnBadge type={t.type} qty={t.quantity} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
