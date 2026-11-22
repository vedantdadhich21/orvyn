-- ORVYN launch schema (Postgres).
--
-- No driver or migration tool is committed yet. This file is the shape the
-- ingest route and the admin views expect once DATABASE_URL exists.
--
-- Addresses are stored lowercase. The server normalises before insert.
-- Every ingest is idempotent on (tx_hash, log_index).

create extension if not exists pgcrypto;

create table if not exists users (
  address text primary key,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists strategies (
  onchain_id bigint primary key,
  author_address text not null,
  name text not null,
  payload text not null,
  tx_hash text not null,
  log_index integer not null,
  block_number bigint not null,
  published_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (tx_hash, log_index)
);

create table if not exists follows (
  follower_address text not null,
  strategy_id bigint not null references strategies (onchain_id),
  tx_hash text not null,
  log_index integer not null,
  created_at timestamptz not null default now(),
  primary key (follower_address, strategy_id),
  unique (tx_hash, log_index)
);

create table if not exists investments (
  id bigserial primary key,
  investor_address text not null,
  strategy_id bigint not null references strategies (onchain_id),
  amount_tusdc numeric(38, 6) not null check (amount_tusdc > 0),
  tx_hash text not null,
  log_index integer not null,
  created_at timestamptz not null default now(),
  unique (tx_hash, log_index)
);

create table if not exists trades (
  id bigserial primary key,
  investor_address text not null,
  strategy_id bigint references strategies (onchain_id),
  asset text not null,
  side text not null check (side in ('buy', 'sell')),
  amount_tusdc numeric(38, 6) not null check (amount_tusdc > 0),
  tx_hash text not null,
  log_index integer not null,
  created_at timestamptz not null default now(),
  unique (tx_hash, log_index)
);

create table if not exists events (
  id bigserial primary key,
  kind text not null check (
    kind in ('user.seen', 'strategy.published', 'strategy.followed', 'investment.made', 'trade.made')
  ),
  actor_address text not null,
  subject text,
  tx_hash text,
  log_index integer,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (tx_hash, log_index)
);

create index if not exists strategies_author_idx on strategies (author_address);
create index if not exists strategies_published_idx on strategies (published_at desc);
create index if not exists follows_strategy_idx on follows (strategy_id);
create index if not exists investments_investor_idx on investments (investor_address);
create index if not exists investments_strategy_idx on investments (strategy_id);
create index if not exists trades_investor_idx on trades (investor_address);
create index if not exists events_created_idx on events (created_at desc);
create index if not exists events_actor_idx on events (actor_address, created_at desc);

-- A batched wallet call can emit several Trade logs and one Followed log, so
-- those tables are unique by transaction and log index, not by hash alone.
-- The event feed is the source for the admin timeline.

-- Counts for /proof are simple aggregates:
--   wallets        select count(*) from users;
--   investors      select count(distinct investor_address) from investments;
--   strategies     select count(*) from strategies;
--   today          select count(*) from events where created_at >= date_trunc('day', now());
