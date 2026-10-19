-- Stylist AI: initial schema.
-- Every table is owned by a single user and protected by RLS.
-- Category / pattern / slot vocabularies use check constraints instead of
-- Postgres enums so adding a value later is a one-line migration.

-- ---------------------------------------------------------------------------
-- profiles: 1:1 with auth.users
-- ---------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  location_name text,
  latitude      numeric(7, 4) check (latitude between -90 and 90),
  longitude     numeric(7, 4) check (longitude between -180 and 180),
  temp_unit     text not null default 'c' check (temp_unit in ('c', 'f')),
  created_at    timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- items: one row per clothing photo
-- ---------------------------------------------------------------------------
create table public.items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  image_path  text not null,
  name        text,
  category    text check (category in ('top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory')),
  subcategory text,
  colors      text[] not null default '{}',
  pattern     text check (pattern in ('solid', 'striped', 'plaid', 'floral', 'graphic', 'polka_dot', 'animal', 'other')),
  formality   smallint check (formality between 1 and 5),
  warmth      smallint check (warmth between 1 and 5),
  waterproof  boolean not null default false,
  ai_tags     jsonb,
  tag_status  text not null default 'pending' check (tag_status in ('pending', 'tagged', 'failed')),
  user_edited boolean not null default false,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- The storage object must live in the owner's folder.
  constraint items_image_path_owner check (split_part(image_path, '/', 1) = user_id::text),
  -- A tagged item must have every attribute the outfit filter relies on.
  constraint items_tagged_complete check (
    tag_status <> 'tagged'
    or (category is not null and pattern is not null and formality is not null and warmth is not null)
  )
);

create index items_active_by_category
  on public.items (user_id, category)
  where archived_at is null and tag_status = 'tagged';

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- outfits + outfit_items
-- ---------------------------------------------------------------------------
create table public.outfits (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  occasion         text not null,
  target_formality smallint check (target_formality between 1 and 5),
  weather          jsonb,
  explanation      text,
  model            text,
  source           text not null default 'ai' check (source in ('ai', 'manual')),
  rating           smallint check (rating between -1 and 1),
  worn_on          date,
  created_at       timestamptz not null default now()
);

create index outfits_by_user_recent on public.outfits (user_id, created_at desc);
create index outfits_worn on public.outfits (user_id, worn_on) where worn_on is not null;

create table public.outfit_items (
  outfit_id uuid not null references public.outfits (id) on delete cascade,
  item_id   uuid not null references public.items (id),
  slot      text not null check (slot in ('top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory')),
  primary key (outfit_id, item_id)
);

create index outfit_items_item on public.outfit_items (item_id);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.items        enable row level security;
alter table public.outfits      enable row level security;
alter table public.outfit_items enable row level security;

create policy "profiles: owner can read"   on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "profiles: owner can update" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "items: owner full access" on public.items for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "outfits: owner full access" on public.outfits for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Both the outfit and the item must belong to the caller, so nobody can
-- attach someone else's item to their outfit.
create policy "outfit_items: owner full access" on public.outfit_items for all to authenticated
  using (
    exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = (select auth.uid()))
    and exists (select 1 from public.items i where i.id = item_id and i.user_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- Storage: private bucket, one folder per user ({user_id}/{item_id}.jpg)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wardrobe', 'wardrobe', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "wardrobe: owner can read" on storage.objects for select to authenticated
  using (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "wardrobe: owner can upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "wardrobe: owner can update" on storage.objects for update to authenticated
  using (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "wardrobe: owner can delete" on storage.objects for delete to authenticated
  using (bucket_id = 'wardrobe' and (storage.foldername(name))[1] = (select auth.uid())::text);
