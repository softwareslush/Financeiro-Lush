/* ============================================================
   LUSH. FINANCE — config.js
   ------------------------------------------------------------
   Chaves do projeto Supabase.
   Onde encontrar: painel do Supabase → Project Settings →
   Data API (ou "API") → "Project URL" e "anon public".

   ⚠️  A chave "anon public" foi feita para ficar no navegador
       (é pública). Nunca coloque aqui a chave "service_role".

   • Com as duas chaves preenchidas, o sistema roda em MODO
     SUPABASE: login de verdade e dados compartilhados entre
     todos os computadores.
============================================================ */

window.LUSH_CONFIG = {
    SUPABASE_URL: 'https://xqmckavsooxckicotnya.supabase.co',

    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxbWNrYXZzb294Y2tpY290bnlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MTkwMzQsImV4cCI6MjA5OTE5NTAzNH0.CUSnLRjKzDkH8M9rKUHwVvXPv2YHMiZC7tmu6tZqRso',

    // Administrador geral do sistema (gerencia usuários e papéis).
    // Precisa ser o mesmo e-mail criado no Supabase (Authentication → Users).
    ADMIN_EMAIL: 'pompeu6565@gmail.com'
};
