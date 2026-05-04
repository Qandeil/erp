-- ============================================================
-- ERP Pro – Full Database Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── profiles ─────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  email       text not null default '',
  role        text not null default 'staff' check (role in ('admin','staff')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'role', 'staff')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── products ──────────────────────────────────────────────────
create table if not exists public.products (
  id                  uuid primary key default uuid_generate_v4(),
  name                text not null,
  name_ar             text not null default '',
  sku                 text,
  barcode             text,
  cost_price          numeric(12,2) not null default 0,
  sale_price          numeric(12,2) not null default 0,
  stock_quantity      integer not null default 0,
  low_stock_threshold integer not null default 10,
  category            text not null default '',
  unit                text not null default 'pcs',
  is_active           boolean not null default true,
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── customers ─────────────────────────────────────────────────
create table if not exists public.customers (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  name_ar     text not null default '',
  phone       text,
  email       text,
  address     text not null default '',
  total_debt  numeric(12,2) not null default 0,
  notes       text not null default '',
  is_active   boolean not null default true,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── sales ─────────────────────────────────────────────────────
create table if not exists public.sales (
  id             uuid primary key default uuid_generate_v4(),
  invoice_number text not null unique,
  customer_id    uuid references public.customers(id) on delete set null,
  customer_name  text not null default '',
  payment_type   text not null default 'paid' check (payment_type in ('paid','postpaid')),
  total_amount   numeric(12,2) not null default 0,
  paid_amount    numeric(12,2) not null default 0,
  discount       numeric(12,2) not null default 0,
  status         text not null default 'completed' check (status in ('completed','pending','cancelled')),
  notes          text not null default '',
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── sale_items ────────────────────────────────────────────────
create table if not exists public.sale_items (
  id           uuid primary key default uuid_generate_v4(),
  sale_id      uuid not null references public.sales(id) on delete cascade,
  product_id   uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity     integer not null default 1,
  unit_price   numeric(12,2) not null default 0,
  cost_price   numeric(12,2) not null default 0,
  total_price  numeric(12,2) not null default 0,
  created_at   timestamptz not null default now()
);

-- ── expenses ──────────────────────────────────────────────────
create table if not exists public.expenses (
  id           uuid primary key default uuid_generate_v4(),
  title        text not null,
  title_ar     text not null default '',
  category     text not null default 'other',
  amount       numeric(12,2) not null default 0,
  expense_date date not null default current_date,
  notes        text not null default '',
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── activity_logs ─────────────────────────────────────────────
create table if not exists public.activity_logs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete set null,
  user_name   text not null default '',
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  details     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

-- ── petty_cash_shifts ─────────────────────────────────────────
create table if not exists public.petty_cash_shifts (
  id                uuid primary key default uuid_generate_v4(),
  assigned_to       uuid references public.profiles(id) on delete set null,
  assigned_to_name  text not null default '',
  assigned_by       uuid references public.profiles(id) on delete set null,
  assigned_by_name  text not null default '',
  starting_cash     numeric(12,2) not null default 0,
  cash_sales        numeric(12,2) not null default 0,
  total_expenses    numeric(12,2) not null default 0,
  expected_cash     numeric(12,2) not null default 0,
  actual_cash       numeric(12,2),
  difference        numeric(12,2),
  status            text not null default 'open' check (status in ('open','settled')),
  shift_date        date not null default current_date,
  opened_at         timestamptz not null default now(),
  settled_at        timestamptz,
  notes             text not null default ''
);

-- ── petty_cash_expenses ───────────────────────────────────────
create table if not exists public.petty_cash_expenses (
  id               uuid primary key default uuid_generate_v4(),
  shift_id         uuid not null references public.petty_cash_shifts(id) on delete cascade,
  title            text not null,
  amount           numeric(12,2) not null default 0,
  created_by       uuid references public.profiles(id) on delete set null,
  created_by_name  text not null default '',
  created_at       timestamptz not null default now()
);

-- ── debt_payments ─────────────────────────────────────────────
create table if not exists public.debt_payments (
  id            uuid primary key default uuid_generate_v4(),
  customer_id   uuid not null references public.customers(id) on delete cascade,
  customer_name text not null default '',
  amount        numeric(12,2) not null default 0,
  notes         text not null default '',
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

alter table public.profiles          enable row level security;
alter table public.products          enable row level security;
alter table public.customers         enable row level security;
alter table public.sales             enable row level security;
alter table public.sale_items        enable row level security;
alter table public.expenses          enable row level security;
alter table public.activity_logs     enable row level security;
alter table public.petty_cash_shifts enable row level security;
alter table public.petty_cash_expenses enable row level security;
alter table public.debt_payments     enable row level security;

-- Helper: get role of current user
create or replace function public.get_my_role()
returns text language sql security definer stable as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ── Profiles policies ─────────────────────────────────────────
create policy "Authenticated users can read profiles"
  on public.profiles for select to authenticated using (true);

create policy "Admins can insert profiles"
  on public.profiles for insert to authenticated
  with check (get_my_role() = 'admin');

create policy "Admins can update any profile"
  on public.profiles for update to authenticated
  using (get_my_role() = 'admin' or id = auth.uid());

create policy "Admins can delete profiles"
  on public.profiles for delete to authenticated
  using (get_my_role() = 'admin' and id <> auth.uid());

-- ── Products: all authenticated can read; only admin can mutate ──
create policy "All authenticated read products"
  on public.products for select to authenticated using (true);

create policy "Admins insert products"
  on public.products for insert to authenticated
  with check (get_my_role() = 'admin');

create policy "Admins update products"
  on public.products for update to authenticated
  using (get_my_role() = 'admin');

create policy "Admins delete products"
  on public.products for delete to authenticated
  using (get_my_role() = 'admin');

-- Staff can decrement stock (for sales)
create policy "Staff can update stock"
  on public.products for update to authenticated
  using (true)
  with check (true);

-- ── Sales: all authenticated users can create & read ──────────
create policy "Auth users read sales"
  on public.sales for select to authenticated using (true);

create policy "Auth users create sales"
  on public.sales for insert to authenticated with check (true);

create policy "Admins update sales"
  on public.sales for update to authenticated using (get_my_role() = 'admin');

create policy "Admins delete sales"
  on public.sales for delete to authenticated using (get_my_role() = 'admin');

-- ── Sale Items ───────────────────────────────────────────────
create policy "Auth read sale_items"
  on public.sale_items for select to authenticated using (true);
create policy "Auth insert sale_items"
  on public.sale_items for insert to authenticated with check (true);

-- ── Customers: admin full, staff read only ────────────────────
create policy "Auth read customers"
  on public.customers for select to authenticated using (true);
create policy "Admins mutate customers"
  on public.customers for insert to authenticated with check (get_my_role() = 'admin');
create policy "Admins update customers"
  on public.customers for update to authenticated using (true);
create policy "Admins delete customers"
  on public.customers for delete to authenticated using (get_my_role() = 'admin');

-- ── Expenses: admin only ──────────────────────────────────────
create policy "Admins read expenses"
  on public.expenses for select to authenticated using (get_my_role() = 'admin');
create policy "Admins insert expenses"
  on public.expenses for insert to authenticated with check (get_my_role() = 'admin');
create policy "Admins update expenses"
  on public.expenses for update to authenticated using (get_my_role() = 'admin');
create policy "Admins delete expenses"
  on public.expenses for delete to authenticated using (get_my_role() = 'admin');

-- ── Activity Logs: admin read, all can insert ─────────────────
create policy "Admins read logs"
  on public.activity_logs for select to authenticated using (get_my_role() = 'admin');
create policy "All insert logs"
  on public.activity_logs for insert to authenticated with check (true);

-- ── Petty Cash Shifts: all read & insert, admin settle ───────
create policy "Auth read shifts"
  on public.petty_cash_shifts for select to authenticated using (true);
create policy "Admins insert shifts"
  on public.petty_cash_shifts for insert to authenticated with check (get_my_role() = 'admin');
create policy "Auth update shifts"
  on public.petty_cash_shifts for update to authenticated using (true);

-- ── Petty Cash Expenses: all authenticated ────────────────────
create policy "Auth read petty expenses"
  on public.petty_cash_expenses for select to authenticated using (true);
create policy "Auth insert petty expenses"
  on public.petty_cash_expenses for insert to authenticated with check (true);

-- ── Debt Payments: all authenticated ─────────────────────────
create policy "Auth read debt_payments"
  on public.debt_payments for select to authenticated using (true);
create policy "Auth insert debt_payments"
  on public.debt_payments for insert to authenticated with check (true);

-- ============================================================
-- Indexes for performance
-- ============================================================
create index if not exists idx_products_barcode on public.products(barcode);
create index if not exists idx_products_sku     on public.products(sku);
create index if not exists idx_sales_invoice    on public.sales(invoice_number);
create index if not exists idx_sales_created_at on public.sales(created_at desc);
create index if not exists idx_logs_created_at  on public.activity_logs(created_at desc);
create index if not exists idx_shifts_date      on public.petty_cash_shifts(shift_date);
create index if not exists idx_shifts_status    on public.petty_cash_shifts(status);

-- ============================================================
-- Trigger: auto update petty_cash_shifts.cash_sales when a
-- cash sale is inserted
-- ============================================================
create or replace function public.update_shift_cash_sales()
returns trigger language plpgsql security definer as $$
declare
  active_shift uuid;
begin
  if new.payment_type = 'paid' and new.status = 'completed' then
    select id into active_shift
    from public.petty_cash_shifts
    where status = 'open'
      and shift_date = current_date
    order by opened_at desc
    limit 1;

    if active_shift is not null then
      update public.petty_cash_shifts
      set
        cash_sales    = cash_sales + new.total_amount - new.discount,
        expected_cash = starting_cash + cash_sales + (new.total_amount - new.discount) - total_expenses
      where id = active_shift;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_sale_created on public.sales;
create trigger on_sale_created
  after insert on public.sales
  for each row execute function public.update_shift_cash_sales();

-- ============================================================
-- Done! Create your first admin user via Supabase Auth,
-- then manually update their profile role to 'admin':
--
--   update public.profiles set role = 'admin' where email = 'your@email.com';
-- ============================================================
