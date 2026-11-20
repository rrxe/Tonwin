-- =====================================================================
-- STORMY — Supabase schema (شغّله مرة وحدة في SQL Editor)
-- =====================================================================

create table if not exists players (
  telegram_id      text primary key,
  username         text,
  first_name       text,
  photo_url        text,
  lang             text default 'ar',
  crystals         numeric(16,3) not null default 0 check (crystals >= 0),
  total_earned     numeric(16,3) not null default 0,
  ads_watched      int not null default 0,
  mining_active    boolean not null default false,
  mining_started_at timestamptz,
  mining_notified  boolean not null default false,
  last_daily       date,
  daily_streak     int not null default 0,
  spins_day        date,
  spins_today      int not null default 0,
  referred_by      text,
  ref_paid         boolean not null default false,
  ref_earned       numeric(16,3) not null default 0,
  is_dup           boolean not null default false,
  banned           boolean not null default false,
  bot_blocked      boolean not null default false,
  device_hash      text,
  ip_hash          text,
  wallet           text,
  created_at       timestamptz not null default now(),
  last_seen        timestamptz not null default now()
);
create index if not exists players_ref_idx    on players(referred_by);
create index if not exists players_earned_idx on players(total_earned desc);
create index if not exists players_device_idx on players(device_hash);

create table if not exists app_settings (key text primary key, value text);

create table if not exists ledger (
  id bigserial primary key,
  telegram_id text not null,
  source text not null,
  delta numeric(16,3) not null,
  balance_after numeric(16,3),
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists ledger_tid_idx on ledger(telegram_id, created_at desc);

create table if not exists tasks (
  id bigserial primary key,
  title text not null,
  title_en text,
  type text not null default 'link' check (type in ('link','channel','ad')),
  url text,
  chat_id text,
  reward numeric(14,3) not null default 5,
  repeat_daily boolean not null default false,
  wait_s int not null default 8,
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists task_completions (
  telegram_id text not null,
  task_id bigint not null references tasks(id) on delete cascade,
  day_key text not null,
  created_at timestamptz not null default now(),
  primary key (telegram_id, task_id, day_key)
);

create table if not exists gift_codes (
  code text primary key,
  crystals numeric(14,3) not null,
  max_uses int not null default 1,
  used int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists gift_redemptions (
  code text not null references gift_codes(code) on delete cascade,
  telegram_id text not null,
  created_at timestamptz not null default now(),
  primary key (code, telegram_id)
);

create table if not exists withdrawals (
  id bigserial primary key,
  telegram_id text not null,
  username text,
  crystals numeric(16,3) not null,
  usd numeric(12,4) not null,
  method text not null,
  address text not null,
  status text not null default 'pending' check (status in ('pending','paid','rejected')),
  note text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists withdrawals_status_idx on withdrawals(status, created_at desc);

-- ---------------------------------------------------------------------
-- دوال ذرّية (atomic) — كل تعديل رصيد لازم يمر منها
-- ---------------------------------------------------------------------
create or replace function add_crystals(
  p_tid text, p_delta numeric, p_source text,
  p_detail text default null, p_ad boolean default false
) returns numeric language plpgsql as $$
declare v_bal numeric;
begin
  update players set
    crystals     = crystals + p_delta,
    total_earned = total_earned + case when p_source in ('withdraw_refund','admin') then 0 else greatest(p_delta,0) end,
    ads_watched  = ads_watched + case when p_ad then 1 else 0 end
  where telegram_id = p_tid and crystals + p_delta >= 0
  returning crystals into v_bal;
  if v_bal is null then return null; end if;
  insert into ledger(telegram_id, source, delta, balance_after, detail)
  values (p_tid, p_source, p_delta, v_bal, left(p_detail,120));
  return v_bal;
end $$;

create or replace function do_spin(p_tid text, p_day date, p_max int, p_value numeric)
returns numeric language plpgsql as $$
declare v_ok text; v_bal numeric;
begin
  update players set
    spins_today = case when spins_day = p_day then spins_today + 1 else 1 end,
    spins_day = p_day
  where telegram_id = p_tid and (spins_day is distinct from p_day or spins_today < p_max)
  returning telegram_id into v_ok;
  if v_ok is null then return null; end if;
  v_bal := add_crystals(p_tid, p_value, 'spin', 'x' || p_value::text, true);
  return v_bal;
end $$;

create or replace function request_withdrawal(
  p_tid text, p_crystals numeric, p_usd numeric, p_method text, p_addr text, p_username text
) returns bigint language plpgsql as $$
declare v_bal numeric; v_id bigint;
begin
  v_bal := add_crystals(p_tid, -p_crystals, 'withdraw', p_method, false);
  if v_bal is null then return null; end if;
  insert into withdrawals(telegram_id, username, crystals, usd, method, address)
  values (p_tid, p_username, p_crystals, p_usd, p_method, p_addr) returning id into v_id;
  update players set wallet = p_addr where telegram_id = p_tid;
  return v_id;
end $$;

create or replace function redeem_gift(p_tid text, p_code text)
returns jsonb language plpgsql as $$
declare g gift_codes%rowtype;
begin
  select * into g from gift_codes where code = upper(p_code) for update;
  if not found or not g.active then return jsonb_build_object('ok', false, 'err', 'invalid'); end if;
  if g.used >= g.max_uses then return jsonb_build_object('ok', false, 'err', 'exhausted'); end if;
  begin
    insert into gift_redemptions(code, telegram_id) values (g.code, p_tid);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'err', 'already');
  end;
  update gift_codes set used = used + 1 where code = g.code;
  perform add_crystals(p_tid, g.crystals, 'gift', g.code, false);
  return jsonb_build_object('ok', true, 'amount', g.crystals);
end $$;

-- أمان: الجداول مقفلة على anon/authenticated، السيرفر يستخدم service_role فقط
alter table players           enable row level security;
alter table app_settings      enable row level security;
alter table ledger            enable row level security;
alter table tasks             enable row level security;
alter table task_completions  enable row level security;
alter table gift_codes        enable row level security;
alter table gift_redemptions  enable row level security;
alter table withdrawals       enable row level security;

revoke execute on function add_crystals(text,numeric,text,text,boolean) from public, anon, authenticated;
revoke execute on function do_spin(text,date,int,numeric)               from public, anon, authenticated;
revoke execute on function request_withdrawal(text,numeric,numeric,text,text,text) from public, anon, authenticated;
revoke execute on function redeem_gift(text,text)                       from public, anon, authenticated;

-- مهمة جاهزة كمثال (عدّلها أو احذفها من لوحة الأدمن)
insert into tasks(title, title_en, type, reward, repeat_daily, sort)
select 'شاهد إعلان واكسب', 'Watch an ad & earn', 'ad', 3, true, 1
where not exists (select 1 from tasks);
