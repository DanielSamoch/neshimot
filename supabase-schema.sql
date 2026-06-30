-- ══════════════════════════════════════════
-- Breathly — Supabase Database Schema
-- הרץ את זה ב-Supabase > SQL Editor
-- ══════════════════════════════════════════

-- טבלת פרופילי משתמשים
create table if not exists public.profiles (
  id                  uuid references auth.users(id) on delete cascade primary key,
  full_name           text,
  is_pro              boolean default false,
  stripe_customer_id  text,
  subscription_id     text,
  pro_since           timestamptz,
  sessions            integer default 0,
  streak              integer default 0,
  total_mins          integer default 0,
  goal                text,        -- 'stress' | 'sleep' | 'energy' | 'health'
  reminder_time       text,        -- 'morning' | 'noon' | 'evening' | 'flexible'
  created_at          timestamptz default now()
);

-- טבלת sessions (כל אימון)
create table if not exists public.sessions (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete cascade,
  technique   text not null,    -- '4-7-8' | 'box' | 'wim-hof' | etc
  rounds      integer default 4,
  duration_mins integer default 3,
  mood_before text,             -- 'anxious' | 'stressed' | 'tired' | 'unfocused' | 'good'
  mood_after  text,
  created_at  timestamptz default now()
);

-- הפעל Row Level Security (RLS) — כל משתמש רואה רק את הנתונים שלו
alter table public.profiles enable row level security;
alter table public.sessions  enable row level security;

-- מדיניות: משתמש יכול לקרוא ולכתוב רק את הרשומה שלו
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can view own sessions"
  on public.sessions for select using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on public.sessions for insert with check (auth.uid() = user_id);

-- פונקציה: יצירת פרופיל אוטומטית כשמשתמש נרשם
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- טריגר: הפעל את הפונקציה אחרי יצירת משתמש חדש
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ══════════════════════════════════════════
-- בדיקה מהירה — תריץ אחרי ההגדרה:
-- ══════════════════════════════════════════
-- select * from public.profiles;
-- select * from public.sessions;

-- הוסף עמודת מגדר לטבלת profiles (הרץ אם עדיין לא הרצת)
alter table public.profiles add column if not exists gender text default 'male';

-- עמודות לonboarding משופר (הרץ אם עדיין לא הרצת)
alter table public.profiles add column if not exists onboarding_goal text;
alter table public.profiles add column if not exists onboarding_time text;
alter table public.profiles add column if not exists onboarding_level text;
