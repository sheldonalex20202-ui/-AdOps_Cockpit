-- Supabase architecture baseline for AdOps Cockpit.
-- Apply after Prisma has created the tables.

alter table if exists public."Agency" enable row level security;
alter table if exists public."User" enable row level security;
alter table if exists public."Team" enable row level security;
alter table if exists public."MetaConnection" enable row level security;
alter table if exists public."MetaAdAccount" enable row level security;
alter table if exists public."MetaCampaign" enable row level security;
alter table if exists public."MetaAdSet" enable row level security;
alter table if exists public."MetaAd" enable row level security;
alter table if exists public."KeitaroConnection" enable row level security;
alter table if exists public."Offer" enable row level security;
alter table if exists public."MetricSnapshot" enable row level security;
alter table if exists public."LaunchTemplate" enable row level security;
alter table if exists public."LaunchJob" enable row level security;
alter table if exists public."LaunchJobItem" enable row level security;
alter table if exists public."BulkActionJob" enable row level security;
alter table if exists public."AlertRule" enable row level security;
alter table if exists public."AlertEvent" enable row level security;
alter table if exists public."AuditLog" enable row level security;

create policy "users can read their own profile"
on public."User"
for select
to authenticated
using ("authUserId" = (select auth.uid())::text);

create policy "users can read their agency"
on public."Agency"
for select
to authenticated
using (
  exists (
    select 1
    from public."User" u
    where u."agencyId" = public."Agency".id
      and u."authUserId" = (select auth.uid())::text
  )
);

create policy "agency members can read teams"
on public."Team"
for select
to authenticated
using (
  exists (
    select 1
    from public."User" u
    where u."agencyId" = public."Team"."agencyId"
      and u."authUserId" = (select auth.uid())::text
  )
);

create policy "agency members can read meta connections"
on public."MetaConnection"
for select
to authenticated
using (
  exists (
    select 1 from public."User" u
    where u."agencyId" = public."MetaConnection"."agencyId"
      and u."authUserId" = (select auth.uid())::text
  )
);

create policy "agency members can read ad accounts"
on public."MetaAdAccount"
for select
to authenticated
using (
  exists (
    select 1 from public."User" u
    where u."agencyId" = public."MetaAdAccount"."agencyId"
      and u."authUserId" = (select auth.uid())::text
  )
);

create policy "agency members can read campaigns"
on public."MetaCampaign"
for select
to authenticated
using (
  exists (
    select 1 from public."User" u
    where u."agencyId" = public."MetaCampaign"."agencyId"
      and u."authUserId" = (select auth.uid())::text
  )
);

create policy "agency members can read ad sets"
on public."MetaAdSet"
for select
to authenticated
using (
  exists (
    select 1 from public."User" u
    where u."agencyId" = public."MetaAdSet"."agencyId"
      and u."authUserId" = (select auth.uid())::text
  )
);

create policy "agency members can read ads"
on public."MetaAd"
for select
to authenticated
using (
  exists (
    select 1 from public."User" u
    where u."agencyId" = public."MetaAd"."agencyId"
      and u."authUserId" = (select auth.uid())::text
  )
);

create policy "agency members can read keitaro connections"
on public."KeitaroConnection"
for select
to authenticated
using (
  exists (
    select 1 from public."User" u
    where u."agencyId" = public."KeitaroConnection"."agencyId"
      and u."authUserId" = (select auth.uid())::text
  )
);

create policy "agency members can read offers"
on public."Offer"
for select
to authenticated
using (
  exists (
    select 1 from public."User" u
    where u."agencyId" = public."Offer"."agencyId"
      and u."authUserId" = (select auth.uid())::text
  )
);

create policy "agency members can read metrics"
on public."MetricSnapshot"
for select
to authenticated
using (
  exists (
    select 1 from public."User" u
    where u."agencyId" = public."MetricSnapshot"."agencyId"
      and u."authUserId" = (select auth.uid())::text
  )
);

create policy "agency members can read launch templates"
on public."LaunchTemplate"
for select
to authenticated
using (
  exists (
    select 1 from public."User" u
    where u."agencyId" = public."LaunchTemplate"."agencyId"
      and u."authUserId" = (select auth.uid())::text
  )
);

create policy "agency members can read launch jobs"
on public."LaunchJob"
for select
to authenticated
using (
  exists (
    select 1 from public."User" u
    where u."agencyId" = public."LaunchJob"."agencyId"
      and u."authUserId" = (select auth.uid())::text
  )
);

create policy "agency members can read launch job items"
on public."LaunchJobItem"
for select
to authenticated
using (
  exists (
    select 1 from public."User" u
    where u."agencyId" = public."LaunchJobItem"."agencyId"
      and u."authUserId" = (select auth.uid())::text
  )
);

create policy "agency members can read bulk jobs"
on public."BulkActionJob"
for select
to authenticated
using (
  exists (
    select 1 from public."User" u
    where u."agencyId" = public."BulkActionJob"."agencyId"
      and u."authUserId" = (select auth.uid())::text
  )
);

create policy "agency members can read alert rules"
on public."AlertRule"
for select
to authenticated
using (
  exists (
    select 1 from public."User" u
    where u."agencyId" = public."AlertRule"."agencyId"
      and u."authUserId" = (select auth.uid())::text
  )
);

create policy "agency members can read alert events"
on public."AlertEvent"
for select
to authenticated
using (
  exists (
    select 1 from public."User" u
    where u."agencyId" = public."AlertEvent"."agencyId"
      and u."authUserId" = (select auth.uid())::text
  )
);

create policy "agency members can read audit logs"
on public."AuditLog"
for select
to authenticated
using (
  exists (
    select 1 from public."User" u
    where u."agencyId" = public."AuditLog"."agencyId"
      and u."authUserId" = (select auth.uid())::text
  )
);

create index if not exists "User_authUserId_idx" on public."User" ("authUserId");
create index if not exists "User_agencyId_role_idx" on public."User" ("agencyId", role);
create index if not exists "MetricSnapshot_agency_date_idx" on public."MetricSnapshot" ("agencyId", date);
create index if not exists "MetricSnapshot_ad_date_idx" on public."MetricSnapshot" ("adId", date);
create index if not exists "MetaAd_agency_effective_idx" on public."MetaAd" ("agencyId", "effectiveStatus");
