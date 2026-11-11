import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Boxes, ClipboardList, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/app/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stock Management System — Inventory, Orders & Suppliers" },
      { name: "description", content: "Manage products, stock movements, suppliers, orders and reports from one clean dashboard." },
      { property: "og:title", content: "Stock Management System" },
      { property: "og:description", content: "Manage products, stock movements, suppliers, orders and reports from one clean dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const features = [
  { icon: Boxes, title: "Products & Stock", text: "Live quantities with low and out-of-stock alerts." },
  { icon: ClipboardList, title: "Orders", text: "Stock is checked and reduced automatically on confirmation." },
  { icon: Truck, title: "Suppliers", text: "Keep every supplier contact in one place." },
  { icon: BarChart3, title: "Reports", text: "Filter by date and export to CSV or PDF." },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex gap-2">
          <Button variant="ghost" asChild><Link to="/auth">Sign in</Link></Button>
          <Button asChild><Link to="/auth" search={{ mode: "register" }}>Get started</Link></Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-20">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-hero px-8 py-16 text-primary-foreground shadow-elegant md:px-14 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sidebar-primary">Inventory control, simplified</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight md:text-5xl">Know exactly what's on your shelves.</h1>
          <p className="mt-4 max-w-xl text-primary-foreground/80">Track products, stock movements, suppliers and orders — every change is saved and every number updates instantly.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" variant="secondary" asChild><Link to="/auth" search={{ mode: "register" }}>Create free account</Link></Button>
            <Button size="lg" variant="ghost" className="text-primary-foreground hover:bg-sidebar-accent hover:text-primary-foreground" asChild><Link to="/auth">I have an account</Link></Button>
          </div>
        </section>
        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-5 shadow-card">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground"><f.icon className="h-5 w-5" /></div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
