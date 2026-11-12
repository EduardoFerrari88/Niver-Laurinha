-- Cole no Supabase: SQL Editor > New query > Run
create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  name text not null, phone text not null unique,   -- phone só com dígitos: impede duplicidade
  attending boolean not null, guests int not null default 1,
  adults int, children int, companions text, notes text,
  created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null, message text not null, created_at timestamptz default now());
alter table public.rsvps enable row level security;
alter table public.messages enable row level security;
-- Só você (usuário logado do Supabase) lê/edita/exclui. Convidados NÃO acessam as tabelas.
create policy "admin rsvps" on public.rsvps for all to authenticated using (true) with check (true);
create policy "admin messages" on public.messages for all to authenticated using (true) with check (true);
-- Convidados gravam apenas por estas funções:
create or replace function public.rsvp_upsert(p_name text,p_phone text,p_attending boolean,p_guests int default 1,
  p_adults int default 0,p_children int default 0,p_companions text default null,p_notes text default null)
returns void language plpgsql security definer set search_path=public as $$
declare ph text := regexp_replace(coalesce(p_phone,''),'\D','','g');
begin
  if length(trim(coalesce(p_name,''))) < 2 or length(ph) not between 10 and 13 then raise exception 'dados invalidos'; end if;
  insert into rsvps(name,phone,attending,guests,adults,children,companions,notes)
  values (left(trim(p_name),120),ph,p_attending,
    case when p_attending then greatest(1,least(coalesce(p_guests,1),20)) else 0 end,
    case when p_attending then least(coalesce(p_adults,0),20) end, case when p_attending then least(coalesce(p_children,0),20) end,
    left(p_companions,500), left(p_notes,500))
  on conflict (phone) do update set name=excluded.name, attending=excluded.attending, guests=excluded.guests,
    adults=excluded.adults, children=excluded.children, companions=excluded.companions, notes=excluded.notes, updated_at=now();
end $$;
create or replace function public.send_message(p_name text,p_message text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if length(trim(coalesce(p_name,''))) < 2 or length(trim(coalesce(p_message,''))) < 2 then raise exception 'dados invalidos'; end if;
  insert into messages(name,message) values (left(trim(p_name),120), left(trim(p_message),600));
end $$;
revoke all on function public.rsvp_upsert(text,text,boolean,int,int,int,text,text) from public;
revoke all on function public.send_message(text,text) from public;
grant execute on function public.rsvp_upsert(text,text,boolean,int,int,int,text,text) to anon;
grant execute on function public.send_message(text,text) to anon;
