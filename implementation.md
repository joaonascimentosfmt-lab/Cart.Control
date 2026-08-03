# Controle.Cart — Plano de Implementação (Sprints)

Este documento organiza o desenvolvimento do Controle.Cart em sprints incrementais.
Cada sprint entrega funcionalidade testável e publicável. Sprints 1–4 formam o **MVP**
(validar a ideia com dados locais e offline); sprints 5–10 evoluem para o **produto
final** (multiusuário, nuvem, e-mail real).

---

## FASE A — MVP (front-end, offline, localStorage)

### Sprint 0 — Fundação do PWA
- [ ] Estrutura de pastas (`css/`, `js/`, `icons/`).
- [ ] `index.html` — shell da SPA com header, `#view`, navegação inferior.
- [ ] `manifest.webmanifest` + ícones 192/512 + SVG.
- [ ] `sw.js` — cache offline com `stale-while-revalidate`.
- [ ] `app.js` — hash routing (`#/agenda`, `#/planilha`, `#/email`) + badge online/offline.
- **Critério de aceite**: abre localmente, instala como PWA e recarrega offline.

### Sprint 1 — Camada de dados (storage.js)
- [ ] `get/set` genéricos sobre `localStorage`.
- [ ] Helpers de data (`todayISO`, `daysFromNow`, `timeAgo`, formatação pt-BR).
- [ ] Geração de IDs e seed de dados de exemplo por módulo (`*_seeded`).
- **Critério de aceite**: dados sobrevivem ao recarregamento e são limpos ao resetar.

### Sprint 2 — Módulo Agenda
- [ ] Navegação diária de horários (slots livres/ocupados).
- [ ] Modal de novo/editar agendamento (data, hora, parte, documento, telefone,
      tipo de ato, status, observações).
- [ ] Ações rápidas: confirmar, concluir, cancelar e excluir.
- [ ] Resumo do dia (total, disponíveis, concluídos, a confirmar).
- **Critério de aceite**: agendar, editar e mudar status refletem na tela e persistem.

### Sprint 3 — Módulo Planilha (protocolos e prazos)
- [ ] Tabela de protocolos (número, tipo, parte, entrada, prazo, status, responsável).
- [ ] Status **calculado** pela data do prazo: No prazo (> 3 dias), Em risco (≤ 3 dias),
      Vencido; + Finalizado (manual).
- [ ] CRUD completo (modal novo/editar, excluir com confirmação).
- [ ] Busca textual e filtro por status.
- [ ] Cards de resumo (total, no prazo, em risco, vencidos).
- **Critério de aceite**: prazos mudam de status automaticamente conforme a data passa.

### Sprint 4 — Módulo E-mail (monitor de não abertos)
- [ ] Cadastro manual de e-mails enviados (destinatário, assunto, data/hora, status).
- [ ] Status: Sem abertura / Aberto / Respondido (marcado manualmente no MVP).
- [ ] Alerta de **não abertos há mais de X horas** (padrão 48 h, configurável).
- [ ] Ações: marcar aberto, marcar respondido, excluir.
- **Critério de aceite**: e-mails não abertos após o período configurado aparecem em
  destaque e no banner de alerta.

> **Fim do MVP**: entregável demonstrado com dados fictícios, offline, instalável.

---

## FASE B — Base multiusuário e backend

### Sprint 5 — Backend e API
- [ ] API REST (NestJS/Express) com serviços de Agenda, Protocolos, E-mail, Partes,
      Usuários e Configuração.
- [ ] Banco de dados relacional (PostgreSQL/MySQL) com migrações.
- [ ] Autenticação JWT + refresh token, senhas com hash (argon2/bcrypt).
- [ ] Dados segregados por serventia; registros de auditoria.
- **Critério de aceite**: CRUD completo via API com autenticação e isolamento por
  serventia.

### Sprint 6 — Migração da UI e sincronização
- [ ] Portar telas do MVP para o framework escolhido (React/Vue/Svelte).
- [ ] `storage.js` passa a usar a API remota com fallback offline e fila de
      sincronização (quando a conexão voltar).
- [ ] Login/logout e perfil de usuário.
- **Critério de aceite**: dados são criados offline e sincronizam ao reconectar.

## FASE C — E-mail real e automações

### Sprint 7 — Integração de e-mail e tracking
- [ ] Configuração de conta institucional (SMTP/IMAP ou provedor com API).
- [ ] Envio de e-mails pelo sistema com *tracking pixel* único por mensagem.
- [ ] Rastreamento real de abertura (`/track/open?id=...`) e webhooks.
- [ ] Substituição do status manual por status automático de abertura.
- **Critério de aceite**: um e-mail enviado e aberto pelo destinatário muda de status
  automaticamente sem ação manual.

### Sprint 8 — Alertas, reenvio e notificações
- [ ] Job programado (cron) que detecta não abertos após o período configurado.
- [ ] Reenvio com 1 clique e registro de interações por parte.
- [ ] Notificações push/PWA para funcionários (vencimentos e e-mails não abertos).
- **Critério de aceite**: alerta dispara automaticamente e gera notificação push.

## FASE D — Completude do produto

### Sprint 9 — Agenda completa
- [ ] Calendário mensal visual com navegação.
- [ ] Conflito de horário automático e regras de alocação por tabelião.
- [ ] Confirmação automática por SMS/e-mail às partes.
- **Critério de aceite**: impossível duplicar horário; confirmações saem
  automaticamente.

### Sprint 10 — Partes, relatórios e exportação
- [ ] Módulo Partes/Clientes com histórico de atos e e-mails.
- [ ] Exportação CSV/Excel (agenda, protocolos, e-mails).
- [ ] Relatórios gerenciais (taxa de abertura, prazo médio, pendências).
- [ ] Permissões por perfil (tabelião, escrevente, auxiliar, administrador).
- **Critério de aceite**: relatórios exportáveis e permissões aplicadas por rota/ação.

---

## Backlog / Ideias futuras
- Importação de planilhas existentes (Excel/CSV).
- Multiusuário simultâneo com websockets (presença e edição colaborativa).
- Mobile app nativo ou PWA com notificações locais.
- Assinatura eletrônica e integração com e-Notariado.

## Notas de priorização
- **Sprints 2–4 (MVP)** respondem diretamente às três dores do cartório: agenda,
  protocolos/prazos e e-mails não abertos.
- A ordem B → C → D permite validar o uso real antes de automatizar; se a automação de
  e-mail for a prioridade do cliente, os Sprints 5–7 podem ser antecipados.
