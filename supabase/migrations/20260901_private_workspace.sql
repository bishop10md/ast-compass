-- Apply through the Supabase migration workflow after security review.
create table if not exists public.profiles (id uuid primary key references auth.users(id) on delete cascade, display_name text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.analyses (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, analysis_type text not null check (analysis_type in ('bcid_forecast','concordance','image_concordance','ast_detective','manual_ast')), title text not null, organism_ids jsonb not null default '[]', marker_ids jsonb not null default '[]', input_data jsonb not null default '{}', result_data jsonb not null default '{}', app_version text not null, engine_version text, reference_version text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.ast_image_uploads (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, storage_path text not null, original_filename text not null, mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')), file_size bigint not null check (file_size between 1 and 10485760), phi_screening_status text not null check (phi_screening_status = 'clear'), phi_screening_version text not null, phi_screened_at timestamptz not null, created_at timestamptz not null default now());
create table if not exists public.image_concordance_results (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, upload_id uuid references public.ast_image_uploads(id) on delete set null, organism_ids text[] not null default '{}', marker_ids text[] not null default '{}', extracted_results jsonb not null default '{}', corrected_results jsonb not null default '{}', concordance_results jsonb not null default '{}', engine_version text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.bcid_forecast_sessions (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, organism_ids text[] not null default '{}', marker_ids text[] not null default '{}', pair_assessments jsonb not null default '[]', forecast_results jsonb not null default '{}', engine_version text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.learning_progress (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, module_id text not null, progress integer not null default 0 check (progress between 0 and 100), completed boolean not null default false, updated_at timestamptz not null default now(), unique(user_id,module_id));

alter table public.profiles enable row level security;
alter table public.analyses enable row level security;
alter table public.ast_image_uploads enable row level security;
alter table public.image_concordance_results enable row level security;
alter table public.bcid_forecast_sessions enable row level security;
alter table public.learning_progress enable row level security;

create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own analyses" on public.analyses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own uploads" on public.ast_image_uploads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own concordance" on public.image_concordance_results for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own bcid sessions" on public.bcid_forecast_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own learning progress" on public.learning_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists analyses_user_created_idx on public.analyses(user_id, created_at desc);
create index if not exists uploads_user_created_idx on public.ast_image_uploads(user_id, created_at desc);
create index if not exists image_results_user_created_idx on public.image_concordance_results(user_id, created_at desc);
create index if not exists bcid_sessions_user_created_idx on public.bcid_forecast_sessions(user_id, created_at desc);
create index if not exists learning_progress_user_updated_idx on public.learning_progress(user_id, updated_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql security invoker set search_path = '' as $$ begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger analyses_updated_at before update on public.analyses for each row execute function public.set_updated_at();
create trigger image_results_updated_at before update on public.image_concordance_results for each row execute function public.set_updated_at();
create trigger bcid_sessions_updated_at before update on public.bcid_forecast_sessions for each row execute function public.set_updated_at();
create trigger learning_progress_updated_at before update on public.learning_progress for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$ begin insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'display_name','')); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('ast-images','ast-images',false,10485760,array['image/jpeg','image/png','image/webp']) on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy "read own ast images" on storage.objects for select to authenticated using (bucket_id='ast-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "insert own ast images" on storage.objects for insert to authenticated with check (bucket_id='ast-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "update own ast images" on storage.objects for update to authenticated using (bucket_id='ast-images' and auth.uid()::text = (storage.foldername(name))[1]) with check (bucket_id='ast-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "delete own ast images" on storage.objects for delete to authenticated using (bucket_id='ast-images' and auth.uid()::text = (storage.foldername(name))[1]);
