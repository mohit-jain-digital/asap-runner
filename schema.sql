-- ASAP-Rank background engine. Run once in Supabase: SQL Editor, paste, Run.
-- Only the service key (kept in the Worker and GitHub secrets) can read or write. Never put it in a web page.
create table if not exists urls(
  uid text not null, url text not null, host text, src text default 'import',
  status text not null default 'new',            -- new, queued, running, done, error
  score int, pass int, warn int, fail int, perf int, lcp int, cls numeric,
  checks jsonb, err text, tries int not null default 0, priority int not null default 0,
  added timestamptz not null default now(), checked_at timestamptz, lease_until timestamptz,
  primary key(uid,url));
create index if not exists urls_work on urls(status,added) where status in ('queued','running');
create index if not exists urls_uid on urls(uid,status);
create table if not exists jobs(
  id bigserial primary key, uid text not null, kind text not null,   -- import
  payload jsonb not null default '{}', progress jsonb not null default '{}',
  status text not null default 'queued',                              -- queued, running, done, error, cancelled
  err text, created timestamptz not null default now(), updated timestamptz not null default now(), lease_until timestamptz);
create index if not exists jobs_work on jobs(status,created) where status in ('queued','running');
alter table urls enable row level security;   -- no policies on purpose: the anon key sees nothing
alter table jobs enable row level security;

-- Takes the next URLs to inspect, fairly across customers (round robin), safe when two runners overlap.
create or replace function claim_urls(n int, lease_min int default 20) returns setof urls language plpgsql as $$
begin
  return query
  with c as (select q.uid,q.url from (select uid,url,added,row_number() over (partition by uid order by priority desc,added) rn
               from urls where status='queued' or (status='running' and lease_until<now())) q order by q.rn,q.added limit n),
  l as (select x.uid,x.url from urls x join c on c.uid=x.uid and c.url=x.url for update of x skip locked)
  update urls t set status='running', lease_until=now()+make_interval(mins=>lease_min), tries=t.tries+1
  from l where t.uid=l.uid and t.url=l.url returning t.*;
end $$;

create or replace function claim_job(lease_min int default 30) returns setof jobs language plpgsql as $$
begin
  return query
  with c as (select id from jobs where status='queued' or (status='running' and lease_until<now()) order by created limit 1 for update skip locked)
  update jobs j set status='running', lease_until=now()+make_interval(mins=>lease_min), updated=now() from c where j.id=c.id returning j.*;
end $$;

-- mode: all | new | failing | selected. Returns how many URLs were queued.
create or replace function queue_urls(p_uid text, p_mode text, p_urls text[] default null) returns int language plpgsql as $$
declare k int;
begin
  update urls set status='queued', err=null, tries=0
  where uid=p_uid and status in ('new','done','error')
    and ( p_mode='all' or (p_mode='new' and status='new') or (p_mode='failing' and (coalesce(fail,0)>0 or status='error'))
          or (p_mode='selected' and url = any(p_urls)) );
  get diagnostics k = row_count; return k;
end $$;

create or replace function cancel_work(p_uid text) returns int language plpgsql as $$
declare k int;
begin
  update urls set status='new' where uid=p_uid and status in ('queued','running');
  get diagnostics k = row_count;
  update jobs set status='cancelled', updated=now() where uid=p_uid and status in ('queued','running');
  return k;
end $$;

create or replace function url_stats(p_uid text) returns json language sql stable as $$
  select json_build_object(
    'counts', coalesce((select json_object_agg(status,n) from (select status,count(*) n from urls where uid=p_uid group by status) a),'{}'::json),
    'avg_score', (select round(avg(score)) from urls where uid=p_uid and status='done'),
    'job', (select row_to_json(j) from (select id,kind,status,progress,err,updated from jobs where uid=p_uid order by id desc limit 1) j));
$$;

-- Static publishing: the app writes each customer's finished settings here; the publish workflow turns them into files on GitHub Pages.
create table if not exists static_cfg(
  site text primary key, uid text not null, body jsonb not null,
  dirty boolean not null default true, updated timestamptz not null default now());
create index if not exists static_dirty on static_cfg(dirty) where dirty;
alter table static_cfg enable row level security;

-- AI suggestions queue (added in v6). Safe to run again. Run this whole file once more in the Supabase SQL Editor.
alter table urls add column if not exists ai text, add column if not exists ai_err text, add column if not exists ai_at timestamptz,
  add column if not exists ai_n int, add column if not exists ai_lease timestamptz, add column if not exists ai_tries int not null default 0;
create index if not exists urls_ai on urls(ai) where ai in ('queued','running');

-- mode: selected (the pages you pick) | quickwins (pages with the most problems first, not yet suggested). Returns how many were queued.
create or replace function queue_ai(p_uid text, p_mode text, p_urls text[] default null, p_n int default 50) returns int language plpgsql as $$
declare k int;
begin
  with pick as (
    select url from urls where uid=p_uid and coalesce(ai,'') not in ('queued','running')
      and ( (p_mode='selected' and url = any(p_urls))
         or (p_mode='quickwins' and status='done' and (ai is null or ai='error') and (coalesce(fail,0)+coalesce(warn,0))>0) )
    order by (coalesce(fail,0)*2+coalesce(warn,0)) desc, score asc nulls last, url
    limit least(greatest(p_n,1),500))
  update urls t set ai='queued', ai_err=null, ai_tries=0 from pick where t.uid=p_uid and t.url=pick.url;
  get diagnostics k = row_count; return k;
end $$;

create or replace function claim_ai(n int, lease_min int default 20) returns setof urls language plpgsql as $$
begin
  return query
  with c as (select q.uid,q.url from (select uid,url,added,row_number() over (partition by uid order by added) rn
               from urls where ai='queued' or (ai='running' and ai_lease<now())) q order by q.rn,q.added limit n),
  l as (select x.uid,x.url from urls x join c on c.uid=x.uid and c.url=x.url for update of x skip locked)
  update urls t set ai='running', ai_lease=now()+make_interval(mins=>lease_min), ai_tries=t.ai_tries+1
  from l where t.uid=l.uid and t.url=l.url returning t.*;
end $$;

create or replace function cancel_work(p_uid text) returns int language plpgsql as $$
declare k int;
begin
  update urls set status='new' where uid=p_uid and status in ('queued','running');
  get diagnostics k = row_count;
  update urls set ai=null where uid=p_uid and ai in ('queued','running');
  update jobs set status='cancelled', updated=now() where uid=p_uid and status in ('queued','running');
  return k;
end $$;

create or replace function url_stats(p_uid text) returns json language sql stable as $$
  select json_build_object(
    'counts', coalesce((select json_object_agg(status,n) from (select status,count(*) n from urls where uid=p_uid group by status) a),'{}'::json),
    'ai', coalesce((select json_object_agg(ai,n) from (select ai,count(*) n from urls where uid=p_uid and ai is not null group by ai) b),'{}'::json),
    'avg_score', (select round(avg(score)) from urls where uid=p_uid and status='done'),
    'job', (select row_to_json(j) from (select id,kind,status,progress,err,updated from jobs where uid=p_uid order by id desc limit 1) j));
$$;

-- Progress history for the Home screen (added in v7). Safe to run again. One row per customer per day.
create table if not exists snap (
  uid text not null, day date not null, pages int, checked int,
  avg_score numeric, avg_perf numeric, fail int, warn int,
  primary key (uid, day));
alter table snap enable row level security;

create or replace function take_snaps() returns int language plpgsql as $$
declare k int;
begin
  insert into snap(uid,day,pages,checked,avg_score,avg_perf,fail,warn)
  select uid, current_date, count(*)::int, (count(*) filter (where status='done'))::int,
    round(avg(score) filter (where status='done'),1), round(avg(perf) filter (where perf is not null),1),
    coalesce(sum(fail) filter (where status='done'),0)::int, coalesce(sum(warn) filter (where status='done'),0)::int
  from urls group by uid
  on conflict (uid,day) do update set pages=excluded.pages, checked=excluded.checked, avg_score=excluded.avg_score,
    avg_perf=excluded.avg_perf, fail=excluded.fail, warn=excluded.warn;
  get diagnostics k = row_count;
  delete from snap where day < current_date - 400;
  return k;
end $$;

create or replace function trend(p_uid text) returns json language sql stable as $$
  select coalesce(json_agg(t order by day), '[]'::json)
  from (select day,pages,checked,avg_score,avg_perf,fail,warn from snap where uid=p_uid and day >= current_date - 400) t
$$;


-- Chatbot knowledge base (filled by the background runner, read by the Worker)
create table if not exists kb(
  id bigserial primary key, uid text not null, url text not null, title text, chunk text not null, t timestamptz not null default now());
create index if not exists kb_uid_url on kb(uid,url);
create index if not exists kb_fts on kb using gin (to_tsvector('simple', chunk));
alter table kb enable row level security;
create or replace function kb_search(p_uid text, p_q text, p_n int default 40) returns table(url text, title text, chunk text) language sql stable as $$
  select k.url, k.title, k.chunk from kb k where k.uid=p_uid and to_tsvector('simple', k.chunk) @@ websearch_to_tsquery('simple', p_q)
  order by ts_rank(to_tsvector('simple', k.chunk), websearch_to_tsquery('simple', p_q)) desc limit least(greatest(p_n,1),80) $$;
create or replace function kb_pages(p_uid text) returns table(url text, title text, n bigint, t timestamptz) language sql stable as $$
  select k.url, max(k.title), count(*), max(k.t) from kb k where k.uid=p_uid group by k.url order by k.url limit 500 $$;
create or replace function kb_wipe(p_uid text) returns int language plpgsql as $$ declare n int; begin delete from kb where uid=p_uid; get diagnostics n = row_count; return n; end $$;


-- Prices: the Worker saves the owner's prices here as well as in D1. The sales page and sign-up page can read this one row
-- straight from Supabase with the public (anon) key, so a price change shows at once and costs the Worker nothing.
create table if not exists site_cfg(k text primary key, v jsonb not null, t bigint);
alter table site_cfg enable row level security;
drop policy if exists "public can read prices" on site_cfg;
create policy "public can read prices" on site_cfg for select to anon using (k = 'prices');


-- Free-tier meter: the app reads the size of this database to show how full the free 500 MB is.
create or replace function usage_stats() returns jsonb language sql stable as $$
  select jsonb_build_object('db_bytes', pg_database_size(current_database()), 'urls', (select count(*) from urls), 'kb', (select count(*) from kb)) $$;

-- Hardening: only your Cloudflare app and your GitHub runner (service key) may call these functions.
-- The public (anon) key can still read the price row above and nothing else.
revoke execute on all functions in schema public from public, anon, authenticated;
