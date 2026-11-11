export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export function stockStatus(quantity: number, threshold: number): StockStatus {
  if (quantity <= 0) return "out_of_stock";
  if (quantity <= threshold) return "low_stock";
  return "in_stock";
}

export const statusLabel: Record<StockStatus, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
};

export const statusVariant: Record<StockStatus, "success" | "warning" | "danger"> = {
  in_stock: "success",
  low_stock: "warning",
  out_of_stock: "danger",
};

export function orderTotal(items: { quantity: number; price: number }[]) {
  return Math.round(items.reduce((s, i) => s + i.quantity * i.price, 0) * 100) / 100;
}

export const money = (n: number | string | null | undefined) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(n ?? 0));

export const fmtDate = (d: string) =>
  new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const errMsg = (e: unknown) =>
  e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Something went wrong";
