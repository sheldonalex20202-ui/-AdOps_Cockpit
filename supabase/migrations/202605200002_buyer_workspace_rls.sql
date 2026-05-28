alter table if exists public."User" enable row level security;
alter table if exists public."MetaConnection" enable row level security;
alter table if exists public."MetaAdAccount" enable row level security;
alter table if exists public."AccountPool" enable row level security;
alter table if exists public."AccountPoolItem" enable row level security;
alter table if exists public."AccountHealthCheck" enable row level security;
alter table if exists public."AuditLog" enable row level security;

drop policy if exists "Users can manage own profile" on public."User";
create policy "Users can manage own profile"
on public."User"
for all
to authenticated
using ("authUserId" = (select auth.uid())::text)
with check ("authUserId" = (select auth.uid())::text);

drop policy if exists "Users can manage own meta connections" on public."MetaConnection";
create policy "Users can manage own meta connections"
on public."MetaConnection"
for all
to authenticated
using (exists (
  select 1 from public."User" u
  where u.id = "MetaConnection"."userId"
    and u."authUserId" = (select auth.uid())::text
))
with check (exists (
  select 1 from public."User" u
  where u.id = "MetaConnection"."userId"
    and u."authUserId" = (select auth.uid())::text
));

drop policy if exists "Users can manage own ad accounts" on public."MetaAdAccount";
create policy "Users can manage own ad accounts"
on public."MetaAdAccount"
for all
to authenticated
using (exists (
  select 1 from public."User" u
  where u.id = "MetaAdAccount"."userId"
    and u."authUserId" = (select auth.uid())::text
))
with check (exists (
  select 1 from public."User" u
  where u.id = "MetaAdAccount"."userId"
    and u."authUserId" = (select auth.uid())::text
));

drop policy if exists "Users can manage own pools" on public."AccountPool";
create policy "Users can manage own pools"
on public."AccountPool"
for all
to authenticated
using (exists (
  select 1 from public."User" u
  where u.id = "AccountPool"."userId"
    and u."authUserId" = (select auth.uid())::text
))
with check (exists (
  select 1 from public."User" u
  where u.id = "AccountPool"."userId"
    and u."authUserId" = (select auth.uid())::text
));

drop policy if exists "Users can manage own pool items" on public."AccountPoolItem";
create policy "Users can manage own pool items"
on public."AccountPoolItem"
for all
to authenticated
using (exists (
  select 1 from public."User" u
  where u.id = "AccountPoolItem"."userId"
    and u."authUserId" = (select auth.uid())::text
))
with check (exists (
  select 1 from public."User" u
  where u.id = "AccountPoolItem"."userId"
    and u."authUserId" = (select auth.uid())::text
));

drop policy if exists "Users can manage own health checks" on public."AccountHealthCheck";
create policy "Users can manage own health checks"
on public."AccountHealthCheck"
for all
to authenticated
using (exists (
  select 1 from public."User" u
  where u.id = "AccountHealthCheck"."userId"
    and u."authUserId" = (select auth.uid())::text
))
with check (exists (
  select 1 from public."User" u
  where u.id = "AccountHealthCheck"."userId"
    and u."authUserId" = (select auth.uid())::text
));

drop policy if exists "Users can read own audit logs" on public."AuditLog";
create policy "Users can read own audit logs"
on public."AuditLog"
for select
to authenticated
using (exists (
  select 1 from public."User" u
  where u.id = "AuditLog"."userId"
    and u."authUserId" = (select auth.uid())::text
));
