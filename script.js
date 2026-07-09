/* ============================================================
   LUSH. FINANCE — script.js
   ------------------------------------------------------------
   Sistema de gestão financeira. Funciona em dois modos:

   • MODO LOCAL (padrão): sem chaves no config.js. Login de
     demonstração e dados guardados no localStorage deste
     navegador. Ótimo para testar na hora.

   • MODO SUPABASE: com as chaves preenchidas no config.js.
     Login de verdade (Supabase Auth) e dados compartilhados
     entre todos os computadores, guardados no banco.

   Todo o resto da lógica (receitas, despesas, carteira,
   lembretes e gráficos) é igual nos dois modos.
============================================================ */

'use strict';

/* ============================================================
   0. CONFIGURAÇÃO E DETECÇÃO DE MODO
============================================================ */

const CFG          = window.LUSH_CONFIG || {};
const ADMIN_EMAIL  = (CFG.ADMIN_EMAIL || 'admin@lush.com').toLowerCase();
const TEM_SUPABASE = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
const MODO         = TEM_SUPABASE ? 'supabase' : 'local';

// Cliente Supabase (só é criado quando há chaves)
let sb = null;
if (TEM_SUPABASE && window.supabase) {
    sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
} else if (TEM_SUPABASE) {
    console.error('A biblioteca do Supabase não carregou. Verifique sua conexão com a internet.');
}

const CHAVE_ARMAZENAMENTO = 'lush-finance-v1'; // usada no modo local
const WORKSPACE_ID        = 'principal';       // id da linha única no Supabase


/* ============================================================
   1. CONSTANTES
============================================================ */

const CORES = {
    primaria:   '#9D14FF',
    secundaria: '#C858C6',
    receita:    '#2FD57B',
    despesa:    '#FF4D5E',
    alerta:     '#FFB454',
    fundo:      '#120917',
    card:       '#1B0F23',
    textoSuave: 'rgba(255, 255, 255, 0.65)',
    grade:      'rgba(255, 255, 255, 0.06)'
};

const MARGEM_MINIMA     = 0.20;      // margem mínima nos projetos (20%)
const DIAS_ANTECEDENCIA = 3;         // lembrete aparece N dias antes do vencimento
const SENHA_PADRAO      = '12345@';  // senha inicial (só no modo local)

const PASSO_RECORRENCIA = { 'Mensal': 1, 'Trimestral': 3, 'Semestral': 6, 'Anual': 12 };


/* ============================================================
   2. UTILITÁRIOS
============================================================ */

const formatarMoeda = (valor) =>
    (Number(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const esc = (texto) =>
    String(texto ?? '').replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const uid = () =>
    'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);

const hojeISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatarDataISO = (iso) =>
    iso ? new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

const formatarPercentual = (fracao) =>
    (fracao * 100).toFixed(1).replace('.', ',') + '%';

const el = (id) => document.getElementById(id);


/* ============================================================
   3. ESTADO INICIAL (dados de demonstração)
============================================================ */

function estadoInicial() {
    const agora     = new Date();
    const inicioMes = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-01`;
    const mesAtual  = inicioMes.slice(0, 7);

    const c1 = { id: uid(), empresa: 'Clínica Vitalle', cnpj: '12.345.678/0001-90', gestor: 'Dra. Paula Freitas', gestorContato: '(11) 98888-1234', financeiro: 'Carlos Souza', financeiroContato: 'financeiro@vitalle.com', emiteNF: true,  recorrencia: 'Mensal', diaCobranca: 8,  valor: 6500, inicio: inicioMes };
    const c2 = { id: uid(), empresa: 'Grupo Andrade',   cnpj: '45.678.912/0001-33', gestor: 'Marcos Andrade',    gestorContato: '(11) 97777-4567', financeiro: 'Ana Lima',    financeiroContato: 'contas@grupoandrade.com', emiteNF: true,  recorrencia: 'Mensal', diaCobranca: 10, valor: 4200, inicio: inicioMes };
    const c3 = { id: uid(), empresa: 'TechNova',        cnpj: '78.912.345/0001-56', gestor: 'Júlia Prado',       gestorContato: 'julia@technova.com', financeiro: 'Júlia Prado', financeiroContato: '(11) 96666-7890', emiteNF: true,  recorrencia: 'Mensal', diaCobranca: 20, valor: 3900, inicio: inicioMes };
    const c4 = { id: uid(), empresa: 'Espaço Zen',      cnpj: '32.165.498/0001-77', gestor: 'Renato Dias',       gestorContato: '(11) 95555-2468', financeiro: 'Renato Dias', financeiroContato: 'renato@espacozen.com', emiteNF: false, recorrencia: 'Mensal', diaCobranca: 5,  valor: 3850, inicio: inicioMes };

    return {
        clientes: [c1, c2, c3, c4],
        projetos: [
            { id: uid(), empresa: 'Bella Moda',  cnpj: '98.765.432/0001-10', gestor: 'Renata Lima', gestorContato: '(11) 94444-2211', financeiro: 'Renata Lima', financeiroContato: 'renata@bellamoda.com', emiteNF: true,  servico: 'Identidade visual completa', entrega: `${mesAtual}-28`, custo: 6200, valor: 8900 },
            { id: uid(), empresa: 'Café Aurora', cnpj: '11.222.333/0001-44', gestor: 'Pedro Neves', gestorContato: 'pedro@cafeaurora.com', financeiro: 'Pedro Neves', financeiroContato: '(11) 93333-1357', emiteNF: false, servico: 'Vídeo institucional',        entrega: `${mesAtual}-15`, custo: 4000, valor: 4500 }
        ],
        upsells: [
            { id: uid(), clienteId: c1.id, cliente: c1.empresa, descricao: 'Campanha extra — Dia dos Pais', data: `${mesAtual}-03`, valor: 1500 },
            { id: uid(), clienteId: c3.id, cliente: c3.empresa, descricao: 'Pacote de criativos adicionais', data: `${mesAtual}-05`, valor: 850 }
        ],
        fixas: [
            { id: uid(), descricao: 'Aluguel do estúdio',           categoria: 'Estrutura',              diaVencimento: 5,  valor: 2100 },
            { id: uid(), descricao: 'Assinatura Adobe + Canva Pro', categoria: 'Ferramentas & Software', diaVencimento: 10, valor: 640 },
            { id: uid(), descricao: 'Internet + telefonia',         categoria: 'Estrutura',              diaVencimento: 15, valor: 280 },
            { id: uid(), descricao: 'Contabilidade',                categoria: 'Serviços',               diaVencimento: 20, valor: 450 }
        ],
        colaboradores: [
            { id: uid(), nome: 'Marina Costa', funcao: 'Social Media',       contato: '(11) 98888-7766', cpf: '123.456.789-00', chavePix: 'marina.costa@pix.com', diaPagamento: 5,  valor: 2800 },
            { id: uid(), nome: 'Diego Ramos',  funcao: 'Designer',           contato: '(11) 97777-5544', cpf: '987.654.321-00', chavePix: '(11) 97777-5544',      diaPagamento: 5,  valor: 3200 },
            { id: uid(), nome: 'Ana Beatriz',  funcao: 'Gestora de Tráfego', contato: 'ana@lush.com',    cpf: '456.789.123-00', chavePix: '456.789.123-00',       diaPagamento: 10, valor: 3500 }
        ],
        variaveis: [
            { id: uid(), descricao: 'Meta Ads — campanhas de clientes', categoria: 'Tráfego Pago',     data: `${mesAtual}-03`, valor: 5200 },
            { id: uid(), descricao: 'Freelancer — motion design',       categoria: 'Equipe & Freelas', data: `${mesAtual}-01`, valor: 1800 },
            { id: uid(), descricao: 'Café e suprimentos do estúdio',    categoria: 'Outros',           data: `${mesAtual}-06`, valor: 180.50 }
        ],
        concluidas: {},
        mensagens:  {},
        usuarios: [
            { id: uid(), nome: 'Admin LUSH', email: ADMIN_EMAIL, senha: SENHA_PADRAO, papel: 'admin' }
        ]
    };
}

// Garante que todas as coleções existam, mesmo em dados antigos
function normalizarEstado() {
    estado                = estado || estadoInicial();
    estado.clientes       = estado.clientes       || [];
    estado.projetos       = estado.projetos       || [];
    estado.upsells        = estado.upsells        || [];
    estado.fixas          = estado.fixas          || [];
    estado.colaboradores  = estado.colaboradores  || [];
    estado.variaveis      = estado.variaveis      || [];
    estado.concluidas     = estado.concluidas     || {};
    estado.mensagens      = estado.mensagens      || {};
    estado.usuarios       = estado.usuarios       || [];

    // Garante que exista pelo menos o registro do admin
    if (!estado.usuarios.some((u) => (u.email || '').toLowerCase() === ADMIN_EMAIL)) {
        estado.usuarios.push({ id: uid(), nome: 'Admin', email: ADMIN_EMAIL, senha: SENHA_PADRAO, papel: 'admin' });
    }
}


/* ============================================================
   4. CAMADA DE DADOS (carregar / salvar) — depende do modo
============================================================ */

let estado       = null;   // dados em memória
let usuarioAtual = null;    // { email, nome, papel }
let salvarTimer  = null;

async function carregarEstado() {
    if (MODO === 'supabase') {
        const { data, error } = await sb
            .from('workspace').select('dados').eq('id', WORKSPACE_ID).maybeSingle();

        if (error) console.error('Erro ao ler do Supabase:', error);

        if (data && data.dados) {
            estado = data.dados;
        } else {
            // Primeira vez: cria a linha com os dados de demonstração
            estado = estadoInicial();
            const r = await sb.from('workspace').upsert({ id: WORKSPACE_ID, dados: estado });
            if (r.error) console.error('Erro ao criar workspace:', r.error);
        }
    } else {
        try {
            estado = JSON.parse(localStorage.getItem(CHAVE_ARMAZENAMENTO)) || estadoInicial();
        } catch {
            estado = estadoInicial();
        }
    }
    normalizarEstado();
}

// Salva: re-renderiza o que depende dos dados (imediato) e
// persiste no armazenamento (com pequeno atraso no Supabase)
function salvar() {
    renderizarCarteira();
    atualizarResumoSaidas();
    atualizarResumoGeral();
    if (graficoFluxo)  atualizarGraficoFluxo();
    if (graficoBarras) atualizarGraficoBarras();
    if (graficoRosca)  atualizarGraficoRosca();
    persistir();
}

function persistir() {
    if (MODO === 'supabase') {
        clearTimeout(salvarTimer);
        salvarTimer = setTimeout(async () => {
            const { error } = await sb.from('workspace').upsert({
                id: WORKSPACE_ID,
                dados: estado,
                atualizado_em: new Date().toISOString()
            });
            if (error) console.error('Erro ao salvar no Supabase:', error);
        }, 400);
    } else {
        localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(estado));
    }
}


/* ============================================================
   5. LOGIN E LOGOUT
============================================================ */

const telaLogin = el('tela-login');
const sistema   = el('sistema');

let graficosIniciados = false;

el('form-login').addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const email = el('login-email').value.trim().toLowerCase();
    const senha = el('login-senha').value;

    if (MODO === 'supabase') {
        if (!sb) { alert('Não foi possível conectar ao Supabase. Recarregue a página e verifique sua internet.'); return; }
        const botao = evento.submitter;
        if (botao) { botao.disabled = true; botao.textContent = 'Entrando...'; }

        const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });

        if (botao) { botao.disabled = false; botao.textContent = 'Entrar'; }

        if (error || !data.session) {
            el('login-erro').hidden = false;
            return;
        }
        await entrarComSessao(data.session);
    } else {
        // Modo local (demonstração)
        const usuario = estado.usuarios.find(
            (u) => (u.email || '').toLowerCase() === email && u.senha === senha
        );
        if (!usuario) {
            el('login-erro').hidden = false;
            return;
        }
        usuarioAtual = { email: usuario.email, nome: usuario.nome, papel: usuario.papel, foto: usuario.foto || '' };
        el('login-erro').hidden = true;
        el('login-senha').value = '';
        revelarSistema();
    }
});

// Some com o erro quando o usuário volta a digitar
['login-email', 'login-senha'].forEach((id) =>
    el(id).addEventListener('input', () => { el('login-erro').hidden = true; }));

el('botao-sair').addEventListener('click', async () => {
    try {
        if (MODO === 'supabase' && sb) await sb.auth.signOut({ scope: 'local' });
    } catch (e) {
        console.error('Erro ao sair:', e);
    }
    usuarioAtual     = null;
    sistema.hidden   = true;
    telaLogin.hidden = false;
    el('login-senha').value = '';
    window.scrollTo(0, 0);
});

// Entra a partir de uma sessão válida do Supabase
async function entrarComSessao(session) {
    const email = (session.user.email || '').toLowerCase();

    await carregarEstado(); // agora que está autenticado, lê os dados

    // Descobre o papel a partir da lista de usuários (ou cria o registro)
    let registro = estado.usuarios.find((u) => (u.email || '').toLowerCase() === email);
    if (!registro) {
        registro = {
            id: uid(),
            nome: email.split('@')[0],
            email,
            papel: email === ADMIN_EMAIL ? 'admin' : 'colaborador'
        };
        estado.usuarios.push(registro);
        persistir();
    }
    const papel = (email === ADMIN_EMAIL || registro.papel === 'admin') ? 'admin' : 'colaborador';
    usuarioAtual = { email, nome: registro.nome || email.split('@')[0], papel, foto: registro.foto || '' };

    el('login-erro').hidden = true;
    el('login-senha').value = '';
    renderTudo();
    revelarSistema();
}

// Mostra o dashboard e prepara gráficos + notificações
function revelarSistema() {
    aplicarUsuarioNaInterface();
    telaLogin.hidden = true;
    sistema.hidden   = false;

    // Volta ao topo e garante que o conteúdo comece do começo,
    // deixando claro que o login foi concluído.
    window.scrollTo(0, 0);
    const conteudo = document.querySelector('.conteudo');
    if (conteudo) conteudo.scrollTop = 0;

    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    notificarDesktop(atualizarNotificacoes());

    if (!graficosIniciados) {
        iniciarGraficos();
        graficosIniciados = true;
    } else {
        atualizarGraficoBarras();
        atualizarGraficoRosca();
    }
    atualizarResumoGeral();
}


/* ============================================================
   6. USUÁRIOS DO SISTEMA (perfil admin nas Configurações)
============================================================ */

function iniciaisDe(usuario) {
    const base = String(usuario.nome || usuario.email || '').replace(/[^0-9a-zA-ZÀ-ú]/g, '');
    return base.slice(0, 2).toUpperCase() || 'LU';
}

function registroUsuarioAtual() {
    if (!usuarioAtual || !estado) return null;
    return estado.usuarios.find((u) => (u.email || '').toLowerCase() === usuarioAtual.email.toLowerCase()) || null;
}

// Mostra a foto (se houver) ou as iniciais dentro de um avatar
function pintarAvatar(elemento, foto, iniciais) {
    if (!elemento) return;
    if (foto) {
        elemento.textContent = '';
        elemento.style.backgroundImage = `url("${foto}")`;
    } else {
        elemento.style.backgroundImage = '';
        elemento.textContent = iniciais;
    }
}

function aplicarUsuarioNaInterface() {
    if (!usuarioAtual) return;

    const rotulo   = usuarioAtual.nome || usuarioAtual.email.split('@')[0];
    const iniciais = iniciaisDe(usuarioAtual);
    const foto     = usuarioAtual.foto || (registroUsuarioAtual() || {}).foto || '';

    el('usuario-nome').textContent  = rotulo;
    el('usuario-papel').textContent = usuarioAtual.papel === 'admin' ? 'Admin · Financeiro' : 'Colaborador';
    pintarAvatar(el('avatar-sidebar'), foto, iniciais);
    pintarAvatar(el('avatar-topbar'),  foto, iniciais);
    pintarAvatar(el('preview-foto'),   foto, iniciais);

    const cardUsuarios = el('card-usuarios');
    cardUsuarios.hidden = usuarioAtual.papel !== 'admin';
    if (!cardUsuarios.hidden) {
        el('usuarios-ajuda').innerHTML = MODO === 'supabase'
            ? 'Defina o papel de cada pessoa (admin ou colaborador). <strong>O login de verdade é criado no painel do Supabase</strong> (Authentication → Users). Adicione aqui o mesmo e-mail para controlar as permissões.'
            : `Cadastre o e-mail do colaborador. Ele entra com a senha padrão <strong>${SENHA_PADRAO}</strong> e pode alterá-la depois em "Minha conta". O admin não pode ser removido.`;
        renderizarUsuarios();
    }
}

function renderizarUsuarios() {
    el('lista-usuarios').innerHTML = estado.usuarios.map((u) => {
        const ehAdmin = u.papel === 'admin' || (u.email || '').toLowerCase() === ADMIN_EMAIL;
        const nota = MODO === 'local' && u.senha === SENHA_PADRAO ? ' · usando a senha padrão' : '';
        return `
        <li class="usuario-item">
            <div class="usuario-item__info">
                <strong>${esc(u.email)}</strong>
                <small>${ehAdmin ? 'Admin' : 'Colaborador'}${nota}</small>
            </div>
            ${ehAdmin
                ? '<span class="selo selo--positivo" title="O admin não pode ser removido">Protegido</span>'
                : `<button class="botao-icone botao-icone--perigo" type="button" data-remover-usuario="${u.id}">Remover</button>`}
        </li>`;
    }).join('');
}

el('form-usuario').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = el('usuario-email').value.trim().toLowerCase();

    if (estado.usuarios.some((u) => (u.email || '').toLowerCase() === email)) {
        alert('Já existe um usuário com este e-mail.');
        return;
    }

    estado.usuarios.push({
        id: uid(),
        nome: email.split('@')[0],
        email,
        senha: MODO === 'local' ? SENHA_PADRAO : undefined,
        papel: 'colaborador'
    });
    persistir();
    renderizarUsuarios();
    el('form-usuario').reset();

    alert(MODO === 'supabase'
        ? `Permissão criada para ${email}.\n\nAgora crie o login dela no painel do Supabase:\nAuthentication → Users → Add user (com este mesmo e-mail e uma senha).`
        : `Usuário criado!\n\n${email} já pode entrar com a senha padrão ${SENHA_PADRAO} e alterá-la depois em Configurações → Minha conta.`);
});

el('lista-usuarios').addEventListener('click', (e) => {
    const botao = e.target.closest('[data-remover-usuario]');
    if (!botao) return;

    const usuario = estado.usuarios.find((u) => u.id === botao.dataset.removerUsuario);
    if (!usuario) return;

    if (usuario.papel === 'admin' || (usuario.email || '').toLowerCase() === ADMIN_EMAIL) {
        alert('O admin não pode ser removido.');
        return;
    }

    if (confirm(`Remover o acesso de ${usuario.email}?`)) {
        estado.usuarios = estado.usuarios.filter((u) => u.id !== usuario.id);
        persistir();
        renderizarUsuarios();
    }
});

// Alteração de senha ("Minha conta")
el('form-senha').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!usuarioAtual) return;

    const atual       = el('senha-atual').value;
    const nova        = el('senha-nova').value;
    const confirmacao = el('senha-confirma').value;

    if (nova.length < 6)        { alert('A nova senha precisa ter pelo menos 6 caracteres.'); return; }
    if (nova !== confirmacao)   { alert('A confirmação não confere com a nova senha.'); return; }

    if (MODO === 'supabase') {
        // Confere a senha atual re-autenticando, depois atualiza
        const check = await sb.auth.signInWithPassword({ email: usuarioAtual.email, password: atual });
        if (check.error) { alert('A senha atual está incorreta.'); return; }

        const { error } = await sb.auth.updateUser({ password: nova });
        if (error) { alert('Não foi possível alterar a senha: ' + error.message); return; }
    } else {
        const usuario = estado.usuarios.find((u) => (u.email || '').toLowerCase() === usuarioAtual.email.toLowerCase());
        if (!usuario || atual !== usuario.senha) { alert('A senha atual está incorreta.'); return; }
        usuario.senha = nova;
        persistir();
        if (!el('card-usuarios').hidden) renderizarUsuarios();
    }

    el('form-senha').reset();
    alert('Senha alterada com sucesso!');
});

/* ---- Foto de perfil (própria conta) ---- */

// Recorta no centro e reduz a imagem para um quadrado pequeno,
// mantendo o dado leve para caber no banco.
function redimensionarFoto(file, tamanho, cb) {
    const reader = new FileReader();
    reader.onload = () => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = tamanho;
            const ctx  = canvas.getContext('2d');
            const lado = Math.min(img.width, img.height);
            const sx = (img.width - lado) / 2;
            const sy = (img.height - lado) / 2;
            ctx.drawImage(img, sx, sy, lado, lado, 0, 0, tamanho, tamanho);
            cb(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => alert('Não foi possível ler esta imagem.');
        img.src = reader.result;
    };
    reader.readAsDataURL(file);
}

el('input-foto').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file || !usuarioAtual) return;
    if (!file.type.startsWith('image/')) { alert('Escolha um arquivo de imagem.'); return; }

    redimensionarFoto(file, 160, (dataURL) => {
        const reg = registroUsuarioAtual();
        if (reg) reg.foto = dataURL;
        usuarioAtual.foto = dataURL;
        persistir();
        aplicarUsuarioNaInterface();
    });
});

el('btn-remover-foto').addEventListener('click', () => {
    if (!usuarioAtual) return;
    const reg = registroUsuarioAtual();
    if (reg) delete reg.foto;
    delete usuarioAtual.foto;
    persistir();
    aplicarUsuarioNaInterface();
});


/* ============================================================
   7. NAVEGAÇÃO — troca de seções e menu mobile
============================================================ */

const itensMenu   = document.querySelectorAll('.sidebar__item');
const secoes      = document.querySelectorAll('.secao');
const tituloSecao = el('titulo-secao');
const sidebar     = el('sidebar');
const overlay     = el('sidebar-overlay');

itensMenu.forEach((item) => {
    item.addEventListener('click', () => {
        itensMenu.forEach((i) => i.classList.remove('is-ativo'));
        item.classList.add('is-ativo');

        const alvo = `secao-${item.dataset.secao}`;
        secoes.forEach((secao) => secao.classList.toggle('is-ativa', secao.id === alvo));
        tituloSecao.textContent = item.textContent.trim();

        if (item.dataset.secao === 'despesas') atualizarGraficoFluxo();
        fecharMenuMobile();
    });
});

el('botao-menu').addEventListener('click', () => {
    sidebar.classList.add('is-aberta');
    overlay.hidden = false;
});
overlay.addEventListener('click', fecharMenuMobile);

function fecharMenuMobile() {
    sidebar.classList.remove('is-aberta');
    overlay.hidden = true;
}


/* ============================================================
   8. ABAS (Receitas e Despesas)
============================================================ */

document.querySelectorAll('.abas').forEach((grupo) => {
    const botoes = grupo.querySelectorAll('.aba');
    const secao  = grupo.closest('.secao');

    botoes.forEach((botao) => {
        botao.addEventListener('click', () => {
            botoes.forEach((b) => b.classList.remove('is-ativa'));
            botao.classList.add('is-ativa');
            secao.querySelectorAll('.painel-aba').forEach((painel) =>
                painel.classList.toggle('is-ativa', painel.id === `aba-${botao.dataset.aba}`));
        });
    });
});


/* ============================================================
   9. MODAIS — abertura, fechamento e máscaras
============================================================ */

document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });
});
document.querySelectorAll('[data-fechar]').forEach((botao) =>
    botao.addEventListener('click', () => botao.closest('dialog').close()));

function aplicarMascaraCnpj(campo) {
    campo.addEventListener('input', () => {
        campo.value = campo.value.replace(/\D/g, '').slice(0, 14)
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2');
    });
}
aplicarMascaraCnpj(el('cliente-cnpj'));
aplicarMascaraCnpj(el('projeto-cnpj'));

function aplicarMascaraCpf(campo) {
    campo.addEventListener('input', () => {
        campo.value = campo.value.replace(/\D/g, '').slice(0, 11)
            .replace(/^(\d{3})(\d)/, '$1.$2')
            .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    });
}
aplicarMascaraCpf(el('colaborador-cpf'));


/* ============================================================
   10. CLIENTES RECORRENTES
============================================================ */

function renderizarClientes() {
    const corpo = el('tabela-clientes');
    if (!estado.clientes.length) {
        corpo.innerHTML = '<tr><td colspan="6" class="tabela__vazia">Nenhum cliente cadastrado. Clique em “+ Novo Cliente” para começar.</td></tr>';
        return;
    }
    corpo.innerHTML = estado.clientes.map((c) => `
        <tr>
            <td><strong>${esc(c.empresa)}</strong><br><small class="texto-suave">${esc(c.gestor || 'Gestor não informado')}</small></td>
            <td>${esc(c.cnpj)}</td>
            <td>${esc(c.recorrencia)} · dia ${c.diaCobranca}</td>
            <td>${c.emiteNF ? '<span class="selo selo--positivo">Emite NF</span>' : '<span class="selo selo--neutro">Recibo</span>'}</td>
            <td class="alinha-direita valor--receita">${formatarMoeda(c.valor)}</td>
            <td class="alinha-direita">
                <button class="botao-icone" data-editar-cliente="${c.id}">Ficha</button>
                <button class="botao-icone botao-icone--perigo" data-excluir-cliente="${c.id}" title="Excluir">✕</button>
            </td>
        </tr>`).join('');
}

function abrirFichaCliente(id) {
    const form = el('form-cliente');
    form.reset();
    const cliente = estado.clientes.find((c) => c.id === id);

    el('titulo-modal-cliente').textContent = cliente ? `Ficha do Cliente — ${cliente.empresa}` : 'Novo Cliente';
    el('cliente-id').value                 = cliente ? cliente.id : '';
    el('cliente-empresa').value            = cliente ? cliente.empresa : '';
    el('cliente-cnpj').value               = cliente ? cliente.cnpj : '';
    el('cliente-inicio').value             = cliente ? cliente.inicio : hojeISO();
    el('cliente-gestor').value             = cliente ? cliente.gestor : '';
    el('cliente-gestor-contato').value     = cliente ? cliente.gestorContato : '';
    el('cliente-financeiro').value         = cliente ? cliente.financeiro : '';
    el('cliente-financeiro-contato').value = cliente ? cliente.financeiroContato : '';
    el('cliente-recorrencia').value        = cliente ? cliente.recorrencia : 'Mensal';
    el('cliente-dia').value                = cliente ? cliente.diaCobranca : 5;
    el('cliente-valor').value              = cliente ? cliente.valor : '';
    el('cliente-nf').checked               = cliente ? cliente.emiteNF : true;
    el('cliente-drive').value              = cliente ? (cliente.drive || '') : '';

    const seletor = el('cliente-responsavel');
    seletor.innerHTML = '<option value="">Sem responsável definido</option>' +
        estado.colaboradores.map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
    seletor.value = cliente ? (cliente.responsavelId || '') : '';
    if (seletor.selectedIndex < 0) seletor.value = '';

    el('modal-cliente').showModal();
}

el('botao-novo-cliente').addEventListener('click', () => abrirFichaCliente(null));

el('tabela-clientes').addEventListener('click', (e) => {
    const editar  = e.target.closest('[data-editar-cliente]');
    const excluir = e.target.closest('[data-excluir-cliente]');
    if (editar) abrirFichaCliente(editar.dataset.editarCliente);
    if (excluir && confirm('Excluir este cliente, seus lembretes e orientações?')) {
        estado.clientes = estado.clientes.filter((c) => c.id !== excluir.dataset.excluirCliente);
        delete estado.mensagens[excluir.dataset.excluirCliente];
        salvar();
        renderizarClientes();
        atualizarNotificacoes();
    }
});

el('form-cliente').addEventListener('submit', (e) => {
    e.preventDefault();
    const dados = {
        id:                el('cliente-id').value || uid(),
        empresa:           el('cliente-empresa').value.trim(),
        cnpj:              el('cliente-cnpj').value.trim(),
        inicio:            el('cliente-inicio').value || hojeISO(),
        gestor:            el('cliente-gestor').value.trim(),
        gestorContato:     el('cliente-gestor-contato').value.trim(),
        financeiro:        el('cliente-financeiro').value.trim(),
        financeiroContato: el('cliente-financeiro-contato').value.trim(),
        recorrencia:       el('cliente-recorrencia').value,
        diaCobranca:       Math.min(28, Math.max(1, Number(el('cliente-dia').value) || 1)),
        valor:             Number(el('cliente-valor').value) || 0,
        emiteNF:           el('cliente-nf').checked,
        drive:             el('cliente-drive').value.trim(),
        responsavelId:     el('cliente-responsavel').value
    };
    const indice = estado.clientes.findIndex((c) => c.id === dados.id);
    if (indice >= 0) estado.clientes[indice] = dados; else estado.clientes.push(dados);

    salvar();
    renderizarClientes();
    atualizarNotificacoes();
    el('modal-cliente').close();
});


/* ============================================================
   11. PROJETOS ÚNICOS — ficha + calculadora de margem (20%)
============================================================ */

function calcularMargem(valor, custo) {
    if (!valor || valor <= 0) return null;
    const margem = (valor - custo) / valor;
    return { margem, ok: margem >= MARGEM_MINIMA, precoMinimo: custo / (1 - MARGEM_MINIMA) };
}

function atualizarCalculoProjeto() {
    const custo = Number(el('projeto-custo').value) || 0;
    const valor = Number(el('projeto-valor').value) || 0;
    const caixa = el('projeto-calculo');
    const calc  = calcularMargem(valor, custo);

    caixa.classList.remove('calculo--ok', 'calculo--ruim');

    if (!calc) {
        el('calculo-percentual').textContent = '—';
        el('calculo-minimo').textContent     = custo > 0 ? formatarMoeda(custo / (1 - MARGEM_MINIMA)) : '—';
        el('calculo-status').textContent     = 'Informe os custos e o valor orçado para calcular.';
        return;
    }
    el('calculo-percentual').textContent = formatarPercentual(calc.margem);
    el('calculo-minimo').textContent     = formatarMoeda(calc.precoMinimo);

    if (calc.ok) {
        caixa.classList.add('calculo--ok');
        el('calculo-status').textContent = '✔ Orçamento dentro da margem mínima de 20%.';
    } else {
        caixa.classList.add('calculo--ruim');
        el('calculo-status').textContent = `✖ Abaixo da margem de 20% — cobre no mínimo ${formatarMoeda(calc.precoMinimo)}.`;
    }
}
el('projeto-custo').addEventListener('input', atualizarCalculoProjeto);
el('projeto-valor').addEventListener('input', atualizarCalculoProjeto);

function renderizarProjetos() {
    const corpo = el('tabela-projetos');
    if (!estado.projetos.length) {
        corpo.innerHTML = '<tr><td colspan="7" class="tabela__vazia">Nenhum projeto registrado. Clique em “+ Novo Projeto” para começar.</td></tr>';
        return;
    }
    corpo.innerHTML = estado.projetos.map((p) => {
        const calc = calcularMargem(p.valor, p.custo);
        const selo = calc
            ? `<span class="selo ${calc.ok ? 'selo--positivo' : 'selo--negativo'}">${formatarPercentual(calc.margem)}</span>`
            : '<span class="selo selo--neutro">—</span>';
        return `
        <tr>
            <td><strong>${esc(p.empresa)}</strong></td>
            <td>${esc(p.servico)}</td>
            <td>${formatarDataISO(p.entrega)}</td>
            <td class="alinha-direita valor--despesa">${formatarMoeda(p.custo)}</td>
            <td class="alinha-direita valor--receita">${formatarMoeda(p.valor)}</td>
            <td>${selo}</td>
            <td class="alinha-direita">
                <button class="botao-icone" data-editar-projeto="${p.id}">Ficha</button>
                <button class="botao-icone botao-icone--perigo" data-excluir-projeto="${p.id}" title="Excluir">✕</button>
            </td>
        </tr>`;
    }).join('');
}

function abrirFichaProjeto(id) {
    const form = el('form-projeto');
    form.reset();
    const projeto = estado.projetos.find((p) => p.id === id);

    el('titulo-modal-projeto').textContent = projeto ? `Ficha do Projeto — ${projeto.empresa}` : 'Novo Projeto Único';
    el('projeto-id').value                 = projeto ? projeto.id : '';
    el('projeto-empresa').value            = projeto ? projeto.empresa : '';
    el('projeto-cnpj').value               = projeto ? projeto.cnpj : '';
    el('projeto-servico').value            = projeto ? projeto.servico : '';
    el('projeto-gestor').value             = projeto ? projeto.gestor : '';
    el('projeto-gestor-contato').value     = projeto ? projeto.gestorContato : '';
    el('projeto-financeiro').value         = projeto ? projeto.financeiro : '';
    el('projeto-financeiro-contato').value = projeto ? projeto.financeiroContato : '';
    el('projeto-entrega').value            = projeto ? projeto.entrega : hojeISO();
    el('projeto-nf').checked               = projeto ? projeto.emiteNF : false;
    el('projeto-custo').value              = projeto ? projeto.custo : '';
    el('projeto-valor').value              = projeto ? projeto.valor : '';

    atualizarCalculoProjeto();
    el('modal-projeto').showModal();
}

el('botao-novo-projeto').addEventListener('click', () => abrirFichaProjeto(null));

el('tabela-projetos').addEventListener('click', (e) => {
    const editar  = e.target.closest('[data-editar-projeto]');
    const excluir = e.target.closest('[data-excluir-projeto]');
    if (editar) abrirFichaProjeto(editar.dataset.editarProjeto);
    if (excluir && confirm('Excluir este projeto?')) {
        estado.projetos = estado.projetos.filter((p) => p.id !== excluir.dataset.excluirProjeto);
        salvar();
        renderizarProjetos();
    }
});

el('form-projeto').addEventListener('submit', (e) => {
    e.preventDefault();
    const dados = {
        id:                el('projeto-id').value || uid(),
        empresa:           el('projeto-empresa').value.trim(),
        cnpj:              el('projeto-cnpj').value.trim(),
        servico:           el('projeto-servico').value.trim(),
        gestor:            el('projeto-gestor').value.trim(),
        gestorContato:     el('projeto-gestor-contato').value.trim(),
        financeiro:        el('projeto-financeiro').value.trim(),
        financeiroContato: el('projeto-financeiro-contato').value.trim(),
        entrega:           el('projeto-entrega').value,
        emiteNF:           el('projeto-nf').checked,
        custo:             Number(el('projeto-custo').value) || 0,
        valor:             Number(el('projeto-valor').value) || 0
    };
    const calc = calcularMargem(dados.valor, dados.custo);
    if (calc && !calc.ok) {
        const continuar = confirm(
            `Atenção: a margem deste projeto é de ${formatarPercentual(calc.margem)}, ` +
            `abaixo do mínimo de 20%.\nPreço mínimo sugerido: ${formatarMoeda(calc.precoMinimo)}.\n\nDeseja salvar mesmo assim?`
        );
        if (!continuar) return;
    }
    const indice = estado.projetos.findIndex((p) => p.id === dados.id);
    if (indice >= 0) estado.projetos[indice] = dados; else estado.projetos.push(dados);

    salvar();
    renderizarProjetos();
    el('modal-projeto').close();
});


/* ============================================================
   12. UPSELLS
============================================================ */

function renderizarUpsells() {
    const corpo = el('tabela-upsells');
    if (!estado.upsells.length) {
        corpo.innerHTML = '<tr><td colspan="5" class="tabela__vazia">Nenhum upsell registrado ainda.</td></tr>';
    } else {
        corpo.innerHTML = estado.upsells.map((u) => `
            <tr>
                <td><strong>${esc(u.cliente)}</strong></td>
                <td>${esc(u.descricao)}</td>
                <td>${formatarDataISO(u.data)}</td>
                <td class="alinha-direita valor--receita">${formatarMoeda(u.valor)}</td>
                <td class="alinha-direita">
                    <button class="botao-icone botao-icone--perigo" data-excluir-upsell="${u.id}" title="Excluir">✕</button>
                </td>
            </tr>`).join('');
    }
    const total = estado.upsells.reduce((soma, u) => soma + u.valor, 0);
    el('total-upsells').textContent = formatarMoeda(total);
}

el('botao-novo-upsell').addEventListener('click', () => {
    if (!estado.clientes.length) { alert('Cadastre um cliente de base antes de registrar um upsell.'); return; }
    const form = el('form-upsell');
    form.reset();
    el('upsell-cliente').innerHTML = estado.clientes.map((c) => `<option value="${c.id}">${esc(c.empresa)}</option>`).join('');
    el('upsell-data').value = hojeISO();
    el('modal-upsell').showModal();
});

el('tabela-upsells').addEventListener('click', (e) => {
    const excluir = e.target.closest('[data-excluir-upsell]');
    if (excluir && confirm('Excluir este upsell?')) {
        estado.upsells = estado.upsells.filter((u) => u.id !== excluir.dataset.excluirUpsell);
        salvar();
        renderizarUpsells();
    }
});

el('form-upsell').addEventListener('submit', (e) => {
    e.preventDefault();
    const cliente = estado.clientes.find((c) => c.id === el('upsell-cliente').value);
    estado.upsells.push({
        id: uid(),
        clienteId: cliente ? cliente.id : '',
        cliente:   cliente ? cliente.empresa : 'Cliente removido',
        descricao: el('upsell-descricao').value.trim(),
        data:      el('upsell-data').value || hojeISO(),
        valor:     Number(el('upsell-valor').value) || 0
    });
    salvar();
    renderizarUpsells();
    el('modal-upsell').close();
});


/* ============================================================
   13. CARTEIRA DE CLIENTES (cards + canal de orientações)
============================================================ */

function nomeResponsavel(cliente) {
    const colaborador = estado.colaboradores.find((c) => c.id === cliente.responsavelId);
    return colaborador ? colaborador.nome : null;
}

function renderizarCarteira() {
    const grade = el('grade-carteira');
    if (!estado.clientes.length) {
        grade.innerHTML = '<p class="carteira__vazia">Nenhum cliente na carteira ainda. Clique em “+ Novo Cliente” para começar.</p>';
        return;
    }
    grade.innerHTML = estado.clientes.map((c) => {
        const responsavel  = nomeResponsavel(c);
        const iniciais     = c.empresa.trim().slice(0, 2).toUpperCase();
        const qtdMensagens = (estado.mensagens[c.id] || []).length;
        const linkDrive    = /^https?:\/\//i.test(c.drive || '') ? c.drive : null;
        return `
        <article class="cliente-card card">
            <header class="cliente-card__topo">
                <span class="avatar" aria-hidden="true">${esc(iniciais)}</span>
                <div class="cliente-card__nome">
                    <strong>${esc(c.empresa)}</strong>
                    <small>${esc(c.cnpj)}</small>
                </div>
                ${c.emiteNF ? '<span class="selo selo--positivo">NF</span>' : '<span class="selo selo--neutro">Recibo</span>'}
            </header>
            <p class="cliente-card__valor">${formatarMoeda(c.valor)}<small> / ${esc(c.recorrencia.toLowerCase())} · dia ${c.diaCobranca}</small></p>
            <ul class="cliente-card__dados">
                <li><span>Gestor do contrato</span>${esc(c.gestor || '—')}${c.gestorContato ? ` · ${esc(c.gestorContato)}` : ''}</li>
                <li><span>Financeiro</span>${esc(c.financeiro || '—')}${c.financeiroContato ? ` · ${esc(c.financeiroContato)}` : ''}</li>
                <li><span>Colaborador responsável</span>${responsavel ? esc(responsavel) : '<em>não definido — abra a ficha</em>'}</li>
            </ul>
            <footer class="cliente-card__acoes">
                ${linkDrive
                    ? `<a class="botao-icone" href="${esc(linkDrive)}" target="_blank" rel="noopener">📁 Contratos no Drive</a>`
                    : '<button class="botao-icone" type="button" disabled title="Cadastre o link da pasta na ficha do cliente">📁 Sem pasta no Drive</button>'}
                <button class="botao-icone" type="button" data-chat-cliente="${c.id}">💬 Orientações${qtdMensagens ? ` (${qtdMensagens})` : ''}</button>
                <button class="botao-icone" type="button" data-ficha-cliente="${c.id}">Ficha</button>
            </footer>
        </article>`;
    }).join('');
}

el('botao-cliente-carteira').addEventListener('click', () => abrirFichaCliente(null));

el('grade-carteira').addEventListener('click', (e) => {
    const ficha = e.target.closest('[data-ficha-cliente]');
    const chat  = e.target.closest('[data-chat-cliente]');
    if (ficha) abrirFichaCliente(ficha.dataset.fichaCliente);
    if (chat)  abrirChat(chat.dataset.chatCliente);
});

function renderizarMensagens(clienteId) {
    const area      = el('chat-mensagens');
    const mensagens = estado.mensagens[clienteId] || [];
    if (!mensagens.length) {
        area.innerHTML = '<p class="chat__vazio">Nenhuma orientação registrada ainda. Escreva a primeira abaixo.</p>';
        return;
    }
    area.innerHTML = mensagens.map((m) => `
        <div class="mensagem">
            <header>
                <strong>${esc(m.autor)}</strong>
                <time>${new Date(m.quando).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
            </header>
            <p>${esc(m.texto)}</p>
        </div>`).join('');
    area.scrollTop = area.scrollHeight;
}

function abrirChat(clienteId) {
    const cliente = estado.clientes.find((c) => c.id === clienteId);
    if (!cliente) return;
    el('chat-cliente-id').value = clienteId;
    el('titulo-modal-chat').textContent = `Orientações — ${cliente.empresa}`;
    const responsavel = nomeResponsavel(cliente);
    el('chat-responsavel').textContent = responsavel
        ? `Canal com ${responsavel} (colaborador responsável pela conta)`
        : 'Nenhum colaborador responsável definido — defina na ficha do cliente.';
    el('chat-texto').value = '';
    renderizarMensagens(clienteId);
    el('modal-chat').showModal();
}

el('form-chat').addEventListener('submit', (e) => {
    e.preventDefault();
    const clienteId = el('chat-cliente-id').value;
    const texto     = el('chat-texto').value.trim();
    if (!clienteId || !texto) return;
    estado.mensagens[clienteId] = estado.mensagens[clienteId] || [];
    estado.mensagens[clienteId].push({
        id: uid(),
        autor: usuarioAtual ? (usuarioAtual.nome || usuarioAtual.email) : 'Admin',
        texto,
        quando: new Date().toISOString()
    });
    salvar();
    el('chat-texto').value = '';
    renderizarMensagens(clienteId);
});


/* ============================================================
   14. NOTIFICAÇÕES — lembretes de NF, recibo e cobrança
============================================================ */

function proximaPendencia(cliente) {
    const passo  = PASSO_RECORRENCIA[cliente.recorrencia] || 1;
    const hoje   = new Date();
    hoje.setHours(0, 0, 0, 0);
    const limite = new Date(hoje);
    limite.setDate(limite.getDate() + DIAS_ANTECEDENCIA);

    const inicio = new Date((cliente.inicio || hojeISO()) + 'T00:00:00');
    let data = new Date(inicio.getFullYear(), inicio.getMonth(), cliente.diaCobranca);
    if (data < inicio) data = new Date(data.getFullYear(), data.getMonth() + passo, cliente.diaCobranca);

    for (let i = 0; i < 120 && data <= limite; i++) {
        const chave = `${cliente.id}:${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        if (!estado.concluidas[chave]) return { data, chave, atrasada: data < hoje };
        data = new Date(data.getFullYear(), data.getMonth() + passo, cliente.diaCobranca);
    }
    return null;
}

function atualizarNotificacoes() {
    const pendencias = [];
    estado.clientes.forEach((cliente) => {
        const pendencia = proximaPendencia(cliente);
        if (pendencia) pendencias.push({ cliente, ...pendencia });
    });
    pendencias.sort((a, b) => a.data - b.data);

    const badge = el('badge-notificacoes');
    badge.hidden      = pendencias.length === 0;
    badge.textContent = pendencias.length;

    el('lista-notificacoes').innerHTML = pendencias.length
        ? pendencias.map((p) => `
            <li class="notificacao ${p.atrasada ? 'notificacao--atrasada' : ''}">
                <div>
                    <strong>${esc(p.cliente.empresa)}</strong>
                    <span>${p.cliente.emiteNF ? 'Emitir e enviar a nota fiscal' : 'Enviar recibo / lembrete de pagamento'}
                        — vence ${p.data.toLocaleDateString('pt-BR')}${p.atrasada ? ' · <em>atrasada</em>' : ''}</span>
                </div>
                <button class="botao-icone" data-concluir="${p.chave}">Concluir</button>
            </li>`).join('')
        : '<li class="notificacao notificacao--vazia">Nenhum lembrete pendente 🎉</li>';

    return pendencias.length;
}

el('lista-notificacoes').addEventListener('click', (e) => {
    const botao = e.target.closest('[data-concluir]');
    if (!botao) return;
    estado.concluidas[botao.dataset.concluir] = true;
    persistir();
    atualizarNotificacoes();
});

const painelNotificacoes = el('painel-notificacoes');
el('botao-notificacoes').addEventListener('click', (e) => {
    e.stopPropagation();
    painelNotificacoes.hidden = !painelNotificacoes.hidden;
});
document.addEventListener('click', (e) => {
    if (!painelNotificacoes.hidden && !painelNotificacoes.contains(e.target)) painelNotificacoes.hidden = true;
});

function notificarDesktop(quantidade) {
    if (quantidade > 0 && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('LUSH. Finance', {
            body: `${quantidade} cobrança(s) aguardando envio de NF, recibo ou lembrete de pagamento.`
        });
    }
}


/* ============================================================
   15. DESPESAS FIXAS
============================================================ */

function renderizarFixas() {
    const corpo = el('tabela-fixas');
    if (!estado.fixas.length) {
        corpo.innerHTML = '<tr><td colspan="5" class="tabela__vazia">Nenhuma despesa fixa cadastrada. Clique em “+ Nova Despesa Fixa”.</td></tr>';
        return;
    }
    corpo.innerHTML = estado.fixas.map((f) => `
        <tr>
            <td><strong>${esc(f.descricao)}</strong></td>
            <td>${esc(f.categoria)}</td>
            <td>Todo dia ${f.diaVencimento}</td>
            <td class="alinha-direita valor--despesa">${formatarMoeda(f.valor)}</td>
            <td class="alinha-direita">
                <button class="botao-icone" data-editar-fixa="${f.id}">Editar</button>
                <button class="botao-icone botao-icone--perigo" data-excluir-fixa="${f.id}" title="Excluir">✕</button>
            </td>
        </tr>`).join('');
}

function abrirFichaFixa(id) {
    el('form-fixa').reset();
    const fixa = estado.fixas.find((f) => f.id === id);
    el('titulo-modal-fixa').textContent = fixa ? `Despesa Fixa — ${fixa.descricao}` : 'Nova Despesa Fixa';
    el('fixa-id').value        = fixa ? fixa.id : '';
    el('fixa-descricao').value = fixa ? fixa.descricao : '';
    el('fixa-categoria').value = fixa ? fixa.categoria : 'Estrutura';
    el('fixa-dia').value       = fixa ? fixa.diaVencimento : 5;
    el('fixa-valor').value     = fixa ? fixa.valor : '';
    el('modal-fixa').showModal();
}

el('botao-nova-fixa').addEventListener('click', () => abrirFichaFixa(null));

el('tabela-fixas').addEventListener('click', (e) => {
    const editar  = e.target.closest('[data-editar-fixa]');
    const excluir = e.target.closest('[data-excluir-fixa]');
    if (editar) abrirFichaFixa(editar.dataset.editarFixa);
    if (excluir && confirm('Excluir esta despesa fixa?')) {
        estado.fixas = estado.fixas.filter((f) => f.id !== excluir.dataset.excluirFixa);
        salvar();
        renderizarFixas();
    }
});

el('form-fixa').addEventListener('submit', (e) => {
    e.preventDefault();
    const dados = {
        id:            el('fixa-id').value || uid(),
        descricao:     el('fixa-descricao').value.trim(),
        categoria:     el('fixa-categoria').value,
        diaVencimento: Math.min(28, Math.max(1, Number(el('fixa-dia').value) || 1)),
        valor:         Number(el('fixa-valor').value) || 0
    };
    const indice = estado.fixas.findIndex((f) => f.id === dados.id);
    if (indice >= 0) estado.fixas[indice] = dados; else estado.fixas.push(dados);
    salvar();
    renderizarFixas();
    el('modal-fixa').close();
});


/* ============================================================
   16. COLABORADORES
============================================================ */

function renderizarColaboradores() {
    const corpo = el('tabela-colaboradores');
    if (!estado.colaboradores.length) {
        corpo.innerHTML = '<tr><td colspan="7" class="tabela__vazia">Nenhum colaborador cadastrado. Clique em “+ Novo Colaborador”.</td></tr>';
        return;
    }
    corpo.innerHTML = estado.colaboradores.map((c) => `
        <tr>
            <td><strong>${esc(c.nome)}</strong><br><small class="texto-suave">${esc(c.funcao || 'Função não informada')}</small></td>
            <td>${esc(c.contato)}</td>
            <td>${esc(c.cpf)}</td>
            <td>${esc(c.chavePix)}</td>
            <td>Todo dia ${c.diaPagamento}</td>
            <td class="alinha-direita valor--despesa">${formatarMoeda(c.valor)}</td>
            <td class="alinha-direita">
                <button class="botao-icone" data-editar-colaborador="${c.id}">Ficha</button>
                <button class="botao-icone botao-icone--perigo" data-excluir-colaborador="${c.id}" title="Excluir">✕</button>
            </td>
        </tr>`).join('');
}

function abrirFichaColaborador(id) {
    el('form-colaborador').reset();
    const colaborador = estado.colaboradores.find((c) => c.id === id);
    el('titulo-modal-colaborador').textContent = colaborador ? `Ficha do Colaborador — ${colaborador.nome}` : 'Novo Colaborador';
    el('colaborador-id').value      = colaborador ? colaborador.id : '';
    el('colaborador-nome').value    = colaborador ? colaborador.nome : '';
    el('colaborador-funcao').value  = colaborador ? colaborador.funcao : '';
    el('colaborador-contato').value = colaborador ? colaborador.contato : '';
    el('colaborador-cpf').value     = colaborador ? colaborador.cpf : '';
    el('colaborador-pix').value     = colaborador ? colaborador.chavePix : '';
    el('colaborador-dia').value     = colaborador ? colaborador.diaPagamento : 5;
    el('colaborador-valor').value   = colaborador ? colaborador.valor : '';
    el('modal-colaborador').showModal();
}

el('botao-novo-colaborador').addEventListener('click', () => abrirFichaColaborador(null));

el('tabela-colaboradores').addEventListener('click', (e) => {
    const editar  = e.target.closest('[data-editar-colaborador]');
    const excluir = e.target.closest('[data-excluir-colaborador]');
    if (editar) abrirFichaColaborador(editar.dataset.editarColaborador);
    if (excluir && confirm('Excluir este colaborador?')) {
        estado.colaboradores = estado.colaboradores.filter((c) => c.id !== excluir.dataset.excluirColaborador);
        salvar();
        renderizarColaboradores();
    }
});

el('form-colaborador').addEventListener('submit', (e) => {
    e.preventDefault();
    const dados = {
        id:           el('colaborador-id').value || uid(),
        nome:         el('colaborador-nome').value.trim(),
        funcao:       el('colaborador-funcao').value.trim(),
        contato:      el('colaborador-contato').value.trim(),
        cpf:          el('colaborador-cpf').value.trim(),
        chavePix:     el('colaborador-pix').value.trim(),
        diaPagamento: Math.min(28, Math.max(1, Number(el('colaborador-dia').value) || 1)),
        valor:        Number(el('colaborador-valor').value) || 0
    };
    const indice = estado.colaboradores.findIndex((c) => c.id === dados.id);
    if (indice >= 0) estado.colaboradores[indice] = dados; else estado.colaboradores.push(dados);
    salvar();
    renderizarColaboradores();
    el('modal-colaborador').close();
});


/* ============================================================
   17. DESPESAS VARIÁVEIS
============================================================ */

function renderizarVariaveis() {
    const corpo = el('tabela-variaveis');
    if (!estado.variaveis.length) {
        corpo.innerHTML = '<tr><td colspan="5" class="tabela__vazia">Nenhuma despesa variável registrada.</td></tr>';
        return;
    }
    const ordenadas = [...estado.variaveis].sort((a, b) => (b.data || '').localeCompare(a.data || ''));
    corpo.innerHTML = ordenadas.map((v) => `
        <tr>
            <td><strong>${esc(v.descricao)}</strong></td>
            <td>${esc(v.categoria)}</td>
            <td>${formatarDataISO(v.data)}</td>
            <td class="alinha-direita valor--despesa">${formatarMoeda(v.valor)}</td>
            <td class="alinha-direita">
                <button class="botao-icone" data-editar-variavel="${v.id}">Editar</button>
                <button class="botao-icone botao-icone--perigo" data-excluir-variavel="${v.id}" title="Excluir">✕</button>
            </td>
        </tr>`).join('');
}

function abrirFichaVariavel(id) {
    el('form-variavel').reset();
    const despesa = estado.variaveis.find((v) => v.id === id);
    el('titulo-modal-variavel').textContent = despesa ? `Despesa — ${despesa.descricao}` : 'Nova Despesa Variável';
    el('variavel-id').value        = despesa ? despesa.id : '';
    el('variavel-descricao').value = despesa ? despesa.descricao : '';
    el('variavel-categoria').value = despesa ? despesa.categoria : 'Tráfego Pago';
    el('variavel-data').value      = despesa ? despesa.data : hojeISO();
    el('variavel-valor').value     = despesa ? despesa.valor : '';
    el('modal-variavel').showModal();
}

el('botao-nova-variavel').addEventListener('click', () => abrirFichaVariavel(null));

el('tabela-variaveis').addEventListener('click', (e) => {
    const editar  = e.target.closest('[data-editar-variavel]');
    const excluir = e.target.closest('[data-excluir-variavel]');
    if (editar) abrirFichaVariavel(editar.dataset.editarVariavel);
    if (excluir && confirm('Excluir esta despesa variável?')) {
        estado.variaveis = estado.variaveis.filter((v) => v.id !== excluir.dataset.excluirVariavel);
        salvar();
        renderizarVariaveis();
    }
});

el('form-variavel').addEventListener('submit', (e) => {
    e.preventDefault();
    const dados = {
        id:        el('variavel-id').value || uid(),
        descricao: el('variavel-descricao').value.trim(),
        categoria: el('variavel-categoria').value,
        data:      el('variavel-data').value || hojeISO(),
        valor:     Number(el('variavel-valor').value) || 0
    };
    const indice = estado.variaveis.findIndex((v) => v.id === dados.id);
    if (indice >= 0) estado.variaveis[indice] = dados; else estado.variaveis.push(dados);
    salvar();
    renderizarVariaveis();
    el('modal-variavel').close();
});


/* ============================================================
   18. CÁLCULOS DE TOTAIS (mês) — usados nos cards e gráficos
============================================================ */

// Um cliente recorrente fatura no mês (ano, mes 0-based)?
function clienteFaturaNoMes(c, ano, mes) {
    const passo  = PASSO_RECORRENCIA[c.recorrencia] || 1;
    const inicio = new Date((c.inicio || hojeISO()) + 'T00:00:00');
    const meses  = (ano - inicio.getFullYear()) * 12 + (mes - inicio.getMonth());
    return meses >= 0 && meses % passo === 0;
}

function totaisDoMes(ano, mes) {
    const prefixo = `${ano}-${String(mes + 1).padStart(2, '0')}`;
    let entradas = 0, nEntradas = 0;

    estado.clientes.forEach((c) => { if (clienteFaturaNoMes(c, ano, mes)) { entradas += c.valor; nEntradas++; } });
    estado.projetos.forEach((p) => { if ((p.entrega || '').startsWith(prefixo)) { entradas += p.valor; nEntradas++; } });
    estado.upsells.forEach((u)  => { if ((u.data    || '').startsWith(prefixo)) { entradas += u.valor; nEntradas++; } });

    const fixas     = estado.fixas.reduce((s, f) => s + f.valor, 0);
    const equipe    = estado.colaboradores.reduce((s, c) => s + c.valor, 0);
    const variaveis = estado.variaveis.filter((v) => (v.data || '').startsWith(prefixo));
    const totalVar  = variaveis.reduce((s, v) => s + v.valor, 0);
    const saidas    = fixas + equipe + totalVar;
    const nSaidas   = estado.fixas.length + estado.colaboradores.length + variaveis.length;

    return { entradas, saidas, nEntradas, nSaidas };
}


/* ============================================================
   19. CARDS DE RESUMO (Visão Geral) + resumo das saídas
============================================================ */

// Data por extenso na topbar
const dataExtenso = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
el('data-atual').textContent = dataExtenso.charAt(0).toUpperCase() + dataExtenso.slice(1);

function definirCard(chave, valor, texto, tipo) {
    const elValor = document.querySelector(`[data-valor="${chave}"]`);
    const elSelo  = document.querySelector(`[data-variacao="${chave}"]`);
    if (elValor) elValor.textContent = formatarMoeda(valor);
    if (elSelo) {
        elSelo.textContent = texto;
        elSelo.classList.remove('selo--positivo', 'selo--negativo', 'selo--neutro');
        elSelo.classList.add(`selo--${tipo}`);
    }
}

function atualizarResumoGeral() {
    if (!estado) return;
    const agora = new Date();
    const { entradas, saidas, nEntradas, nSaidas } = totaisDoMes(agora.getFullYear(), agora.getMonth());
    const resultado = entradas - saidas;

    const fluxo = dadosFluxoCaixa();
    const saldoProjetado = fluxo.saldo.length ? fluxo.saldo[fluxo.saldo.length - 1] : resultado;

    definirCard('saldo',     saldoProjetado, 'projeção p/ fim do mês', saldoProjetado >= 0 ? 'positivo' : 'negativo');
    definirCard('receitas',  entradas,       `${nEntradas} entrada(s) no mês`, 'positivo');
    definirCard('despesas',  saidas,         `${nSaidas} saída(s) no mês`, 'negativo');
    definirCard('resultado', resultado,      'receitas − despesas', resultado >= 0 ? 'positivo' : 'negativo');
}

function atualizarResumoSaidas() {
    const mesAtual = hojeISO().slice(0, 7);
    const totalFixas     = estado.fixas.reduce((soma, f) => soma + f.valor, 0);
    const totalEquipe    = estado.colaboradores.reduce((soma, c) => soma + c.valor, 0);
    const variaveisMes   = estado.variaveis.filter((v) => (v.data || '').startsWith(mesAtual));
    const totalVariaveis = variaveisMes.reduce((soma, v) => soma + v.valor, 0);
    const total          = totalFixas + totalEquipe + totalVariaveis;
    const pct = (valor) => total > 0 ? `${Math.round((valor / total) * 100)}% do total` : '—';

    el('resumo-fixas').textContent         = formatarMoeda(totalFixas);
    el('resumo-fixas-detalhe').textContent = `${estado.fixas.length} lançamento(s) · ${pct(totalFixas)}`;
    el('resumo-colaboradores').textContent         = formatarMoeda(totalEquipe);
    el('resumo-colaboradores-detalhe').textContent = `${estado.colaboradores.length} pessoa(s) · ${pct(totalEquipe)}`;
    el('resumo-variaveis').textContent         = formatarMoeda(totalVariaveis);
    el('resumo-variaveis-detalhe').textContent = `${variaveisMes.length} lançamento(s) no mês · ${pct(totalVariaveis)}`;
    el('resumo-total').textContent = formatarMoeda(total);
}


/* ============================================================
   20. GRÁFICOS — Chart.js
============================================================ */

let graficoBarras = null;
let graficoRosca  = null;
let graficoFluxo  = null;

// Série dos últimos 6 meses (entradas x saídas), calculada dos dados
function serieSeisMeses() {
    const agora  = new Date();
    const meses  = [];
    const entradas = [];
    const saidas   = [];
    const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    for (let i = 5; i >= 0; i--) {
        const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
        const t = totaisDoMes(d.getFullYear(), d.getMonth());
        meses.push(nomes[d.getMonth()]);
        entradas.push(t.entradas);
        saidas.push(t.saidas);
    }
    return { meses, entradas, saidas };
}

// Despesas do mês agrupadas por categoria (para a rosca)
function despesasPorCategoriaMes() {
    const mesAtual = hojeISO().slice(0, 7);
    const mapa = {};
    estado.fixas.forEach((f) => { mapa[f.categoria] = (mapa[f.categoria] || 0) + f.valor; });
    estado.variaveis.filter((v) => (v.data || '').startsWith(mesAtual))
        .forEach((v) => { mapa[v.categoria] = (mapa[v.categoria] || 0) + v.valor; });
    const equipe = estado.colaboradores.reduce((s, c) => s + c.valor, 0);
    if (equipe > 0) mapa['Equipe & Freelas'] = (mapa['Equipe & Freelas'] || 0) + equipe;

    const categorias = Object.keys(mapa);
    const valores    = categorias.map((k) => mapa[k]);
    return { categorias, valores };
}

function iniciarGraficos() {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js não carregou. Verifique a conexão com o CDN.');
        return;
    }
    Chart.defaults.font.family = "'Space Grotesk', system-ui, sans-serif";
    Chart.defaults.color       = CORES.textoSuave;

    const tooltipBase = {
        backgroundColor: CORES.card, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
        titleColor: '#FFFFFF', bodyColor: CORES.textoSuave, padding: 12, cornerRadius: 8
    };

    const serie = serieSeisMeses();
    graficoBarras = new Chart(el('grafico-barras'), {
        type: 'bar',
        data: {
            labels: serie.meses,
            datasets: [
                { label: 'Entradas', data: serie.entradas, backgroundColor: CORES.receita, borderRadius: 6, maxBarThickness: 34 },
                { label: 'Saídas',   data: serie.saidas,   backgroundColor: CORES.despesa, borderRadius: 6, maxBarThickness: 34 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', align: 'end', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8 } },
                tooltip: { ...tooltipBase, callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formatarMoeda(ctx.parsed.y)}` } }
            },
            scales: {
                x: { grid: { display: false }, border: { color: CORES.grade } },
                y: { grid: { color: CORES.grade }, border: { display: false }, ticks: { callback: (v) => `R$ ${(v / 1000).toFixed(0)} mil` } }
            }
        }
    });

    const dist = despesasPorCategoriaMes();
    graficoRosca = new Chart(el('grafico-rosca'), {
        type: 'doughnut',
        data: {
            labels: dist.categorias,
            datasets: [{
                data: dist.valores,
                backgroundColor: [CORES.primaria, CORES.secundaria, CORES.despesa, CORES.alerta, CORES.receita, '#7C4DFF', '#4DD0E1'],
                borderColor: CORES.card, borderWidth: 4, hoverOffset: 8
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '65%',
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, padding: 16 } },
                tooltip: {
                    ...tooltipBase,
                    callbacks: {
                        label: (ctx) => {
                            const total = ctx.dataset.data.reduce((s, v) => s + v, 0);
                            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1).replace('.', ',') : '0';
                            return ` ${formatarMoeda(ctx.parsed)} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

function atualizarGraficoBarras() {
    if (!graficoBarras) return;
    const s = serieSeisMeses();
    graficoBarras.data.labels = s.meses;
    graficoBarras.data.datasets[0].data = s.entradas;
    graficoBarras.data.datasets[1].data = s.saidas;
    graficoBarras.update();
}

function atualizarGraficoRosca() {
    if (!graficoRosca) return;
    const d = despesasPorCategoriaMes();
    graficoRosca.data.labels = d.categorias;
    graficoRosca.data.datasets[0].data = d.valores;
    graficoRosca.update();
}

/* ---------- Fluxo de caixa projetado (área de Despesas) ---------- */

function dadosFluxoCaixa() {
    const agora     = new Date();
    const ano       = agora.getFullYear();
    const mes       = agora.getMonth();
    const totalDias = new Date(ano, mes + 1, 0).getDate();

    const labels   = Array.from({ length: totalDias }, (_, i) => String(i + 1));
    const entradas = new Array(totalDias).fill(0);
    const saidas   = new Array(totalDias).fill(0);

    const somaNoDia = (vetor, dia, valor) => { vetor[Math.min(Math.max(1, dia), totalDias) - 1] += valor; };
    const diaNoMesAtual = (iso) => {
        if (!iso) return null;
        const d = new Date(iso + 'T00:00:00');
        return (d.getFullYear() === ano && d.getMonth() === mes) ? d.getDate() : null;
    };

    estado.clientes.forEach((c) => { if (clienteFaturaNoMes(c, ano, mes)) somaNoDia(entradas, c.diaCobranca, c.valor); });
    estado.projetos.forEach((p) => { const dia = diaNoMesAtual(p.entrega); if (dia) somaNoDia(entradas, dia, p.valor); });
    estado.upsells.forEach((u)  => { const dia = diaNoMesAtual(u.data);    if (dia) somaNoDia(entradas, dia, u.valor); });

    estado.fixas.forEach((f) => somaNoDia(saidas, f.diaVencimento, f.valor));
    estado.colaboradores.forEach((c) => somaNoDia(saidas, c.diaPagamento, c.valor));
    estado.variaveis.forEach((v) => { const dia = diaNoMesAtual(v.data); if (dia) somaNoDia(saidas, dia, v.valor); });

    let acumulado = 0;
    const saldo = entradas.map((e, i) => Number((acumulado += e - saidas[i]).toFixed(2)));
    return { labels, entradas, saidas: saidas.map((v) => -v), saldo };
}

function atualizarGraficoFluxo() {
    if (typeof Chart === 'undefined' || !estado) return;
    const dados = dadosFluxoCaixa();

    if (graficoFluxo) {
        graficoFluxo.data.labels           = dados.labels;
        graficoFluxo.data.datasets[0].data = dados.saldo;
        graficoFluxo.data.datasets[1].data = dados.entradas;
        graficoFluxo.data.datasets[2].data = dados.saidas;
        graficoFluxo.update();
        return;
    }

    graficoFluxo = new Chart(el('grafico-fluxo'), {
        type: 'bar',
        data: {
            labels: dados.labels,
            datasets: [
                { type: 'line', label: 'Saldo acumulado projetado', data: dados.saldo, borderColor: CORES.primaria, backgroundColor: 'rgba(157,20,255,0.12)', fill: true, tension: 0.35, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2 },
                { label: 'Entradas previstas', data: dados.entradas, backgroundColor: CORES.receita, borderRadius: 4, maxBarThickness: 18 },
                { label: 'Saídas previstas',   data: dados.saidas,   backgroundColor: CORES.despesa, borderRadius: 4, maxBarThickness: 18 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', align: 'end', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8 } },
                tooltip: {
                    backgroundColor: CORES.card, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
                    titleColor: '#FFFFFF', bodyColor: CORES.textoSuave, padding: 12, cornerRadius: 8,
                    callbacks: {
                        title: (itens) => `Dia ${itens[0].label}`,
                        label: (ctx) => ` ${ctx.dataset.label}: ${formatarMoeda(Math.abs(ctx.parsed.y))}`
                    }
                }
            },
            scales: {
                x: { grid: { display: false }, border: { color: CORES.grade }, ticks: { maxRotation: 0, autoSkip: true } },
                y: { grid: { color: CORES.grade }, border: { display: false }, ticks: { callback: (v) => `R$ ${(v / 1000).toFixed(0)} mil` } }
            }
        }
    });
}


/* ============================================================
   21. PREFERÊNCIAS (demonstração)
============================================================ */

el('form-configuracoes').addEventListener('submit', (evento) => {
    evento.preventDefault();
    alert('Preferências salvas! (demonstração)');
});


/* ============================================================
   22. RENDERIZAÇÃO E INICIALIZAÇÃO
============================================================ */

function renderTudo() {
    renderizarClientes();
    renderizarProjetos();
    renderizarUpsells();
    renderizarCarteira();
    renderizarFixas();
    renderizarColaboradores();
    renderizarVariaveis();
    atualizarResumoSaidas();
    atualizarResumoGeral();
    atualizarNotificacoes();
}

// Banner de modo e dica de login
function configurarModoNaTela() {
    const banner = el('modo-banner');
    if (MODO === 'supabase') {
        banner.hidden = false;
        banner.classList.add('modo-banner--nuvem');
        banner.textContent = '☁ Conectado ao Supabase — dados compartilhados entre todos os computadores.';
        setTimeout(() => { banner.hidden = true; }, 4000);

        el('login-dica').innerHTML =
            'Use o e-mail e a senha cadastrados no Supabase.';
    } else {
        banner.hidden = false;
        banner.innerHTML = '⚠ Modo local (demonstração) — os dados ficam só neste navegador. Preencha o <strong>config.js</strong> para ativar o Supabase.';
        document.body.style.setProperty('--banner-altura', '34px');

        el('login-dica').innerHTML =
            `Primeiro acesso: <strong>${esc(ADMIN_EMAIL)}</strong> · senha <strong>${SENHA_PADRAO}</strong><br>` +
            'Modo demonstração: os dados ficam salvos neste navegador.';
    }
}

async function iniciar() {
    configurarModoNaTela();

    if (MODO === 'supabase') {
        // Já existe uma sessão ativa? Entra direto.
        try {
            const { data: { session } } = await sb.auth.getSession();
            if (session) await entrarComSessao(session);
        } catch (e) {
            console.error('Erro ao verificar a sessão:', e);
        }
        // Se não houver sessão, a tela de login já está visível.
    } else {
        // Modo local: carrega os dados e já renderiza (o login continua na frente)
        await carregarEstado();
        renderTudo();
        persistir(); // garante que a demonstração fique salva
    }
}

// Espera o DOM e o Chart.js (defer) estarem prontos
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
} else {
    iniciar();
}
