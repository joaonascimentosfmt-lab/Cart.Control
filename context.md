# CartoMetrics — Contexto e Arquitetura

## 1. Contexto

O **CartoMetrics** é uma plataforma de gestão interna para cartórios. A necessidade nasceu do
cotidiano operacional de uma serventia extrajudicial, que convive com três tarefas recorrentes
e, hoje, executadas de forma manual e dispersa:

1. **Agenda de assinatura de atos** — agendar horários para que as partes compareçam ao
   cartório para assinar o ato (escrituras, procurações, reconhecimento de firma etc.).
2. **Planilha de protocolos e prazos** — controlar os protocolos (números de acompanhamento)
   e seus prazos legais/regimentais, evitando que processos vençam sem tratamento.
3. **Monitoramento de e-mails** — saber se um e-mail enviado foi ou não aberto, para detectar
   mensagens que "passaram despercebidas" e disparar um novo contato (telefone ou reenvio).

O objetivo do MVP é substituir as planilhas soltas, os cadernos de agenda e a dependência de
memória humana por uma ferramenta única, acessível no navegador, instalável como aplicativo
(PWA), utilizável **offline** e com dados locais (sem servidor no MVP).

## 2. Visão do produto final

Plataforma web completa para gestão da serventia, com:

- **Módulo Agenda**: calendário de atendimento com slots por dia, status (agendado,
  confirmado, concluído, cancelado), tipos de ato, controle de tabeliães/escreventes e
  notificações de confirmação (SMS/e-mail).
- **Módulo Planilha/Protocolos**: cadastro de protocolos, prazos, responsáveis e status
  automático (no prazo / em risco / vencido), exportação para Excel/CSV, importação e
  relatórios gerenciais.
- **Módulo E-mail**: integração com caixa real (SMTP/IMAP) e rastreamento de abertura por
  *tracking pixel*, alertas automáticos de não abertura após um período configurável,
  reenvio com 1 clique e histórico de interações por parte.
- **Módulo Partes/Clientes**: cadastro de pessoas físicas e jurídicas com histórico de atos.
- **Usuários e permissões**: perfil de tabelião, escrevente, auxiliar e administrador.
- **Backend e multiusuário**: sincronização em nuvem com banco de dados relacional,
  autenticação e dados por serventia.

## 3. Arquitetura do MVP

Stack exclusivamente **front-end** para validar o produto com rapidez:

| Camada | Tecnologia |
|---|---|
| Interface | HTML5 semântico + CSS3 (variáveis, grid, responsivo) |
| Lógica | JavaScript clássico (IIFE por módulo, sem framework, sem bundler) |
| Ícones | SVG inline via sprite (`<symbol>` + `<use>`) no `index.html` e helper `js/icons.js` |
| Persistência | `localStorage` (camada relacional `db` + helpers de data) |
| PWA | `manifest.webmanifest` + Service Worker (`sw.js`) + ícones PNG/SVG |
| Roteamento | Hash routing (`#/dashboard`, `#/protocols`, `#/agenda`, ...) |

### Estrutura de arquivos

```
Controle.Cart/
├── index.html            # Shell (sidebar + topbar + view + sprite SVG)
├── manifest.webmanifest  # Metadados PWA (instalação)
├── sw.js                 # Service Worker (cache offline + atualização)
├── icons/
│   ├── icon.svg          # Ícone vetorial (favicon/browser)
│   ├── icon-192.png      # Ícone PWA 192x192
│   └── icon-512.png      # Ícone PWA 512x512
├── css/
│   └── style.css         # Design system corporativo (sidebar + telas)
└── js/
    ├── icons.js          # Helper `icon()` → `<svg><use>` da sprite
    ├── storage.js        # store (`localStorage`) + `db` (tabelas) + helpers de data/prazo
    ├── core.js           # Regra de negócio: protocolos, tarefas, clientes, e-mails, indicadores, alertas, auditoria (camada de serviço)
    ├── ui.js             # Helpers de UI: modal, toast, confirma, notificações, busca global
    ├── app.js            # Bootstrap, roteamento, sidebar, permissões (RBAC)
    ├── dashboard.js      # Dashboard + central de alertas + produtividade
    ├── protocols.js      # Protocolos (lista + detalhe + tarefas + histórico + e-mails vinculados)
    ├── tasks.js          # Tarefas (visão global)
    ├── clients.js        # Clientes / Partes
    ├── emails.js         # Central de e-mails (categorias + vínculo a protocolo)
    ├── agenda.js         # Agenda (slots diários)
    ├── reports.js        # Relatórios + exportação CSV
    ├── audit.js          # Auditoria do sistema
    └── admin.js          # Gestão (funcionários, setores, usuários/permissões, configurações)
```

### Decisões de arquitetura

- **SPA com hash routing**: cada módulo é uma função de render sobre a mesma `#view`,
  trocando o conteúdo conforme a rota — simples e compatível com o Service Worker.
- **Scripts clássicos (IIFE) em vez de ES Modules**: permite abrir o `index.html`
  diretamente pelo sistema de arquivos (`file://`) sem servidor — ES Modules são bloqueados
  nesse cenário. Cada módulo envolto em IIFE e expõe apenas o necessário em `window`
  (evita colisão de nomes globais, ex.: `seed`). A ordem de carregamento em `index.html`
  importa: `icons.js` → `storage.js` → `core.js` → `ui.js` → módulos → `app.js`.
- **Ícones como sprite SVG**: símbolos (`<symbol>`) definidos no `index.html` e reutilizados
  via `<svg><use>` — sem emojis, com cor herdada de `currentColor` e helper `icon()` em
  `js/icons.js` para uso nos templates.
- **Camada de dados relacional `db`**: `storage.js` expõe `db` com tabelas
  (`protocols`, `tasks`, `clients`, `emails`, `appointments`, `history`, `audit`,
  `notifications`) persistidas em `localStorage`, preparando a futura migração para
  PostgreSQL/Supabase.
- **Regra de negócio isolada em `core.js`** (camada de serviços): criação de protocolo
  gera histórico + tarefa inicial + alerta; conclusão encerra tarefas e atualiza
  indicadores; fiscalização automática (`checkAlerts`) e escalonamento; auditoria de ações
  (`db.audit`). A interface apenas consome essa camada.
- **Status de prazo calculado**: situação (`normal/atenção/urgente/vence hoje/atrasado/
  concluído`) derivada da data-limite na hora da consulta, nunca armazenada como valor fixo.
- **Dados de exemplo (seed)**: na primeira execução cada módulo popula dados fictícios
  marcados com flag `*_seeded`, para demonstração imediata.
- **Status calculado vs. armazenado**: na Planilha o status de prazo é **calculado** a partir
  da data do prazo (recomenda-se que seja regra de negócio única); no E-mail o status de
  abertura é **armazenado** (no MVP é marcado manualmente; no produto final virá do
  *tracking pixel*).
- **Offline-first**: todos os ativos são pré-cacheados no `install`; o Service Worker usa a
  estratégia *cache-first com atualização em segundo plano* (`stale-while-revalidate`).

## 4. Arquitetura do produto final

```
                    ┌────────────────────────────┐
                    │        Cliente PWA         │
                    │  (HTML/CSS/JS → framework) │
                    └─────────────┬──────────────┘
                                  │ HTTPS / REST (JSON) / WebSocket
                    ┌─────────────▼──────────────┐
                    │       API Gateway          │
                    │  Autenticação (JWT) +       │
                    │  validação + rate limit     │
                    └──────┬──────┬──────┬───────┘
                           │      │      │
              ┌────────────▼──┐ ┌─▼──────────┐ ┌─▼────────────┐
              │ Serviço       │ │ Serviço    │ │ Serviço      │
              │ Agenda +      │ │ Protocolos │ │ E-mail       │
              │ Atendimentos  │ │ e Prazos   │ │ + Tracking   │
              └──────┬────────┘ └─┬──────────┘ └─┬────────────┘
                     │            │              │
              ┌──────▼────────────▼──────────────▼──────┐
              │          Banco de Dados Relacional       │
              │  (dados por serventia + auditoria)       │
              └─────────────────────────────────────────┘
```

### Componentes propostos

1. **Front-end PWA** — evolução do MVP para framework de componentes (React/Vue/Svelte),
   com roteamento real, design system, acessibilidade e notificações push.
2. **API REST** — Node.js (NestJS/Express) ou outra linguagem da equipe, com serviços
   isolados (Agenda, Protocolos, E-mail, Partes, Usuários).
3. **Banco de dados** — PostgreSQL/MySQL com as entidades: `serventia`, `usuario`, `parte`,
   `ato`, `protocolo`, `agendamento`, `email`, `email_leitura`, `configuracao`.
4. **Integração de e-mail** — servidor de envio (SMTP) e captura de abertura via
   *tracking pixel* (`/track/open?id=...`) ou *webhook* de provedores (SendGrid, Resend,
   Gmail API). O status de abertura deixa de ser manual.
5. **Fila de tarefas** — para disparo de alertas de não abertura e lembretes de prazo
   (cron/jobs).
6. **Notificações** — push/PWA para avisar funcionários sobre vencimentos e e-mails não
   abertos.
7. **Relatórios** — exportação CSV/Excel e gráficos (prazo médio, taxa de abertura etc.).

## 5. Segurança e privacidade (produto final)

- Dados de partes (nome, CPF, telefone) são **dados pessoais** — aplicar LGPD: minimização,
  consentimento, registro de tratamento e controle de acesso.
- Autenticação com **JWT + refresh token**, senhas com hash (argon2/bcrypt) e MFA opcional.
- Comunicação exclusivamente **HTTPS**; CSP e sanitização de entrada em todas as camadas.
- Backup automatizado do banco e trilha de auditoria das alterações.
- Configuração de e-mail com credenciais armazenadas criptografadas; e-mails monitorados
  apenas de contas institucionais da serventia.

## 6. Limitações conhecidas do MVP

- Dados ficam **no dispositivo** (sem multiusuário nem sincronização).
- Abertura de e-mail é **marcada manualmente** (não há rastreio automático real).
- Agenda sem calendário mensal visual e sem conflito/notificação automática.
- Sem autenticação, permissões, relatórios ou exportação.
- Planilha sem importação e sem histórico/auditoria.
