import { Badge } from "@/components/ui/badge";
import { stockStatus, statusLabel, statusVariant } from "@/lib/stock";

export function StockBadge({ quantity, threshold }: { quantity: number; threshold: number }) {
  const s = stockStatus(quantity, threshold);
  return <Badge variant={statusVariant[s]}>{statusLabel[s]}</Badge>;
}

const orderV = { pending: "warning", processing: "info", completed: "success", cancelled: "danger" } as const;
export function OrderStatusBadge({ status }: { status: keyof typeof orderV }) {
  return <Badge variant={orderV[status]} className="capitalize">{status}</Badge>;
}

const txnLabel = { stock_in: "Stock in", stock_out: "Stock out", adjustment: "Adjusted", order: "Order" } as const;
export function TxnBadge({ type, qty }: { type: keyof typeof txnLabel; qty: number }) {
  const positive = type === "stock_in" || (type === "adjustment" && qty >= 0);
  return (
    <Badge variant={positive ? "success" : type === "order" ? "info" : "danger"}>
      {txnLabel[type]} {positive ? "+" : "−"}{Math.abs(qty)}
    </Badge>
  );
}
