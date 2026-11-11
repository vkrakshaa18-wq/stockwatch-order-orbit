
create type public.order_status as enum ('pending','processing','completed','cancelled');
create type public.txn_type as enum ('stock_in','stock_out','adjustment','order');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email);
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  created_at timestamptz not null default now(),
  unique(user_id, name)
);
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  contact_number text,
  email text,
  address text,
  created_at timestamptz not null default now()
);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  sku text not null,
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  description text,
  price numeric(12,2) not null default 0 check (price >= 0),
  quantity integer not null default 0 check (quantity >= 0),
  low_stock_threshold integer not null default 10 check (low_stock_threshold >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, sku)
);
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  order_number text not null default ('ORD-' || to_char(now(),'YYMMDD') || '-' || substr(md5(random()::text),1,5)),
  customer_name text not null,
  status public.order_status not null default 'pending',
  total numeric(12,2) not null default 0,
  stock_deducted boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  subtotal numeric(12,2) generated always as (quantity * unit_price) stored
);
create table public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  product_id uuid references public.products(id) on delete cascade,
  type public.txn_type not null,
  quantity integer not null,
  previous_quantity integer not null default 0,
  new_quantity integer not null default 0,
  reference text,
  notes text,
  created_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['categories','suppliers','products','orders','order_items','inventory_transactions'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

-- Stock movement (security invoker; RLS applies)
create or replace function public.adjust_stock(_product_id uuid, _type public.txn_type, _qty integer, _notes text default null, _reference text default null)
returns integer language plpgsql set search_path = public as $$
declare cur integer; nxt integer;
begin
  if _qty is null or _qty <= 0 then raise exception 'Quantity must be greater than zero'; end if;
  select quantity into cur from products where id = _product_id and user_id = auth.uid() for update;
  if not found then raise exception 'Product not found'; end if;
  if _type = 'stock_in' then nxt := cur + _qty;
  elsif _type in ('stock_out','order') then
    if cur < _qty then raise exception 'Insufficient stock: only % available', cur; end if;
    nxt := cur - _qty;
  else nxt := _qty; end if;
  update products set quantity = nxt, updated_at = now() where id = _product_id;
  insert into inventory_transactions(product_id, type, quantity, previous_quantity, new_quantity, notes, reference)
  values (_product_id, _type, case when _type='adjustment' then nxt - cur else _qty end, cur, nxt, _notes, _reference);
  return nxt;
end; $$;

create or replace function public.create_order(_customer text, _notes text, _items jsonb)
returns uuid language plpgsql set search_path = public as $$
declare oid uuid; it jsonb; p record; tot numeric := 0;
begin
  if coalesce(trim(_customer),'') = '' then raise exception 'Customer name is required'; end if;
  if jsonb_array_length(_items) = 0 then raise exception 'Add at least one product'; end if;
  insert into orders(customer_name, notes) values (_customer, _notes) returning id into oid;
  for it in select * from jsonb_array_elements(_items) loop
    select id, name, price, quantity into p from products where id = (it->>'product_id')::uuid and user_id = auth.uid();
    if not found then raise exception 'Product not found'; end if;
    if (it->>'quantity')::int > p.quantity then raise exception 'Insufficient stock for %: only % available', p.name, p.quantity; end if;
    insert into order_items(order_id, product_id, product_name, quantity, unit_price) values (oid, p.id, p.name, (it->>'quantity')::int, p.price);
    tot := tot + p.price * (it->>'quantity')::int;
  end loop;
  update orders set total = tot where id = oid;
  return oid;
end; $$;

create or replace function public.set_order_status(_order_id uuid, _status public.order_status)
returns void language plpgsql set search_path = public as $$
declare o record; it record;
begin
  select * into o from orders where id = _order_id and user_id = auth.uid() for update;
  if not found then raise exception 'Order not found'; end if;
  if o.status = 'cancelled' then raise exception 'Cancelled orders cannot be changed'; end if;
  if o.status = 'completed' and _status <> 'completed' then raise exception 'Completed orders cannot be changed'; end if;
  if _status in ('processing','completed') and not o.stock_deducted then
    for it in select * from order_items where order_id = _order_id loop
      perform adjust_stock(it.product_id, 'order', it.quantity, 'Order confirmed', o.order_number);
    end loop;
    update orders set stock_deducted = true where id = _order_id;
  elsif _status = 'cancelled' and o.stock_deducted then
    for it in select * from order_items where order_id = _order_id loop
      perform adjust_stock(it.product_id, 'stock_in', it.quantity, 'Order cancelled - restocked', o.order_number);
    end loop;
    update orders set stock_deducted = false where id = _order_id;
  end if;
  update orders set status = _status, updated_at = now() where id = _order_id;
end; $$;

-- log initial quantity when product created
create or replace function public.log_initial_stock() returns trigger language plpgsql set search_path = public as $$
begin
  if new.quantity > 0 then
    insert into inventory_transactions(user_id, product_id, type, quantity, previous_quantity, new_quantity, notes)
    values (new.user_id, new.id, 'stock_in', new.quantity, 0, new.quantity, 'Initial stock');
  end if;
  return new;
end; $$;
create trigger products_initial_stock after insert on public.products for each row execute function public.log_initial_stock();

grant execute on function public.adjust_stock, public.create_order, public.set_order_status to authenticated;
