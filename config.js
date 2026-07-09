/* ============================================================
   LUSH. FINANCE — config.js
   ------------------------------------------------------------
   Cole aqui as chaves do seu projeto Supabase.
   Onde encontrar: painel do Supabase → Project Settings →
   Data API (ou "API") → "Project URL" e "anon public".

   ⚠️  A chave "anon public" foi feita para ficar no navegador
       (é pública). Nunca coloque aqui a chave "service_role".

   • Enquanto as chaves estiverem em branco, o sistema roda em
     MODO LOCAL (demonstração), guardando os dados só neste
     navegador. Perfeito para testar.
   • Assim que você preencher as duas chaves, o sistema passa a
     usar o Supabase: login de verdade e dados compartilhados
     entre todos os computadores.
============================================================ */

window.LUSH_CONFIG = {
    // Ex.: 'https://abcdefgh.supabase.co'
    SUPABASE_URL: '',

    // Ex.: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...'
    SUPABASE_ANON_KEY: '',

    // E-mail que será tratado como ADMINISTRADOR do sistema.
    // Deve ser o mesmo e-mail que você criar no Supabase
    // (Authentication → Users). O admin gerencia usuários e papéis.
    ADMIN_EMAIL: 'admin@lush.com'
};
