create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  account_status text not null check (account_status in ('Guest','Authenticated')),
  display_name text,
  email text,
  role text,
  rating smallint check (rating between 1 and 5),
  useful_feedback text,
  improvement_feedback text,
  requested_feature text,
  additional_comments text,
  testimonial_permission boolean not null default false,
  app_version text not null,
  page_source text
);
alter table public.feedback enable row level security;
create policy "guests may submit private feedback" on public.feedback for insert to anon with check (user_id is null and account_status='Guest');
create policy "users may submit private feedback" on public.feedback for insert to authenticated with check (user_id=auth.uid() and account_status='Authenticated');
comment on table public.feedback is 'Private AST Compass product feedback. No public select policy.';
