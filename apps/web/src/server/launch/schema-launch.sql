-- Launch MVP tables. Kept in a separate schema so the Chapter 1 tables keep
-- their own ids and the two products can share one database safely.

create schema if not exists launch;

create table if not exists launch.strategies (
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

-- No foreign key on strategy_id: a follow or trade can be indexed before the
-- strategy row if the backfill runs out of order.
create table if not exists launch.follows (
  follower_address text not null,
  strategy_id bigint not null,
  tx_hash text not null,
  log_index integer not null,
  created_at timestamptz not null default now(),
  primary key (follower_address, strategy_id),
  unique (tx_hash, log_index)
);

create table if not exists launch.trades (
  id bigserial primary key,
  trader_address text not null,
  stock_address text not null,
  ticker text not null,
  is_buy boolean not null,
  usdc_amount numeric(38, 6) not null,
  stock_amount numeric(38, 18) not null,
  price numeric(38, 8) not null,
  tx_hash text not null,
  log_index integer not null,
  created_at timestamptz not null default now(),
  unique (tx_hash, log_index)
);

create table if not exists launch.events (
  id bigserial primary key,
  kind text not null check (
    kind in ('strategy.published', 'strategy.followed', 'strategy.unfollowed', 'trade.made')
  ),
  actor_address text not null,
  subject text,
  tx_hash text not null,
  log_index integer not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (tx_hash, log_index)
);

create index if not exists launch_strategies_author_idx on launch.strategies (author_address);
create index if not exists launch_strategies_published_idx on launch.strategies (published_at desc);
create index if not exists launch_follows_strategy_idx on launch.follows (strategy_id);
create index if not exists launch_trades_trader_idx on launch.trades (trader_address);
create index if not exists launch_trades_created_idx on launch.trades (created_at desc);
create index if not exists launch_events_created_idx on launch.events (created_at desc);
