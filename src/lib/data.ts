import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const unwrap = <T,>({ data, error }: { data: T | null; error: unknown }) => {
  if (error) throw error;
  return (data ?? []) as T;
};

export const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: async () =>
    unwrap(
      await supabase
        .from("products")
        .select("*, categories(id,name), suppliers(id,name)")
        .order("created_at", { ascending: false }),
    ),
});
export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async () => unwrap(await supabase.from("categories").select("*").order("name")),
});
export const suppliersQuery = queryOptions({
  queryKey: ["suppliers"],
  queryFn: async () => unwrap(await supabase.from("suppliers").select("*").order("created_at", { ascending: false })),
});
export const transactionsQuery = queryOptions({
  queryKey: ["transactions"],
  queryFn: async () =>
    unwrap(
      await supabase
        .from("inventory_transactions")
        .select("*, products(name, sku)")
        .order("created_at", { ascending: false })
        .limit(1000),
    ),
});
export const ordersQuery = queryOptions({
  queryKey: ["orders"],
  queryFn: async () =>
    unwrap(await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false })),
});

export type Product = Awaited<ReturnType<NonNullable<typeof productsQuery.queryFn>>>[number];
export type Supplier = Awaited<ReturnType<NonNullable<typeof suppliersQuery.queryFn>>>[number];
export type Order = Awaited<ReturnType<NonNullable<typeof ordersQuery.queryFn>>>[number];
export type Txn = Awaited<ReturnType<NonNullable<typeof transactionsQuery.queryFn>>>[number];

export const ALL_KEYS = [["products"], ["transactions"], ["orders"], ["suppliers"], ["categories"]];
