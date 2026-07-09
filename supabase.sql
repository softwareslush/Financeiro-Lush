-- ============================================================
-- LUSH. FINANCE — Estrutura do banco no Supabase
-- ------------------------------------------------------------
-- Cole TODO este conteúdo no Supabase → SQL Editor → New query
-- e clique em "Run". Ele cria a tabela onde o sistema guarda os
-- dados e libera o acesso apenas para usuários logados.
-- ============================================================

-- Tabela única: guarda todo o sistema num único registro JSON.
-- (Simples de operar e suficiente para uma equipe pequena.)
create table if not exists public.workspace (
    id            text primary key default 'principal',
    dados         jsonb not null default '{}'::jsonb,
    atualizado_em timestamptz not null default now()
);

-- Liga a segurança por linha (RLS): sem política, ninguém acessa.
alter table public.workspace enable row level security;

-- Remove políticas antigas (caso rode o script mais de uma vez)
drop policy if exists "ler workspace"      on public.workspace;
drop policy if exists "inserir workspace"  on public.workspace;
drop policy if exists "atualizar workspace" on public.workspace;

-- Apenas usuários AUTENTICADOS podem ler...
create policy "ler workspace"
    on public.workspace for select
    to authenticated
    using (true);

-- ...inserir...
create policy "inserir workspace"
    on public.workspace for insert
    to authenticated
    with check (true);

-- ...e atualizar. (Quem não fez login não enxerga nada.)
create policy "atualizar workspace"
    on public.workspace for update
    to authenticated
    using (true)
    with check (true);

-- Pronto! O sistema cria o registro 'principal' sozinho no
-- primeiro acesso, com os dados de demonstração.
