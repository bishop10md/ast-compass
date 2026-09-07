alter table public.feedback
  add column if not exists category text not null default 'General feedback',
  add column if not exists content_id text;

alter table public.feedback drop constraint if exists feedback_category_check;
alter table public.feedback add constraint feedback_category_check check (category in ('Scientific content / possible error', 'Usability', 'Missing organism/drug', 'Missing resistance mechanism', 'Breakpoint/standard request', 'Feature request', 'Privacy/security', 'General feedback'));

comment on column public.feedback.category is 'User-selected private feedback category; never include PHI.';
comment on column public.feedback.content_id is 'Optional public AST Compass content identifier. Does not contain analysis or patient data.';
