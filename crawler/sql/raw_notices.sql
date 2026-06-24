-- Supabase SQL Editor에 1회 실행 (anon 키로는 DDL이 안 되어 대시보드에서 직접 실행 필요)
create table if not exists raw_notices (
  source text not null,
  post_id text not null,
  date_posted text,
  title text,
  body text,
  link text,
  image_urls jsonb default '[]',
  file_urls jsonb default '[]',
  dept text,
  campus text,
  category text,
  notice_period text,
  event_period text,
  status text default 'new',
  first_seen timestamptz,
  crawled_at timestamptz,
  updated_at timestamptz default now(),
  primary key (source, post_id)
);

create index if not exists idx_raw_notices_date on raw_notices (date_posted);
create index if not exists idx_raw_notices_status on raw_notices (status);
create index if not exists idx_raw_notices_source on raw_notices (source);

alter table raw_notices enable row level security;

-- anon 키로 읽기/upsert 허용 (내부 툴 전제)
drop policy if exists anon_select on raw_notices;
drop policy if exists anon_insert on raw_notices;
drop policy if exists anon_update on raw_notices;
create policy anon_select on raw_notices for select using (true);
create policy anon_insert on raw_notices for insert with check (true);
create policy anon_update on raw_notices for update using (true) with check (true);
