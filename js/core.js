(function () {
  // ===== MOCK SEED (demonstração, NÃO substituto de banco) =====
  // No produto final estes dados virão do PostgreSQL/Supabase.
  function seed() {
    if (store.get(db.seedMark, false)) return;
    const md = "mock-seed";
    const hoje = store.todayISO();
    const dias = (n) => store.daysFromNow(n);

    const deps = [
      { id: store.uid(), nome: "Protocolo" },
      { id: store.uid(), nome: "Registros Gerais" },
      { id: store.uid(), nome: "Tabelionato" },
    ];
    const staff = [
      { id: store.uid(), nome: "Maria Silva", cargo: "Escrevente", setor: deps[0].id, email: "maria@carto.com", status: "ativo" },
      { id: store.uid(), nome: "João Souza", cargo: "Tabelião", setor: deps[2].id, email: "joao@carto.com", status: "ativo" },
      { id: store.uid(), nome: "Ana Pereira", cargo: "Auxiliar", setor: deps[1].id, email: "ana@carto.com", status: "ativo" },
    ];
    const clients = [
      { id: store.uid(), nome: "João da Silva", doc: "123.456.789-01", email: "joao.silva@exemplo.com", fone: "(11) 99999-0001" },
      { id: store.uid(), nome: "Maria Souza", doc: "987.654.321-00", email: "maria.souza@exemplo.com", fone: "(11) 98888-0002" },
      { id: store.uid(), nome: "Pedro Santos", doc: "11.222.333/0001-44", email: "pedro.santos@exemplo.com", fone: "(11) 97777-0003" },
    ];

    const p1 = protocolRow({ num: "2026-001245", cliente: clients[0], tipo: "Escritura", entrada: "2026-08-12", prazo: dias(6), resp: staff[1], dept: deps[2], prioridade: "alta", status: "em_analise", desc: "Escritura de compra e venda" });
    const p2 = protocolRow({ num: "2026-001246", cliente: clients[1], tipo: "Procuração", entrada: dias(-10), prazo: dias(1), resp: staff[0], dept: deps[0], prioridade: "media", status: "aguardando_documentacao", desc: "Procuração pública" });
    const p3 = protocolRow({ num: "2026-001247", cliente: clients[2], tipo: "Autenticação", entrada: dias(-20), prazo: dias(-3), resp: staff[2], dept: deps[1], prioridade: "baixa", status: "aguardando_cliente", desc: "Autenticação de cópias" });
    const p4 = protocolRow({ num: "2026-001244", cliente: clients[1], tipo: "Escritura", entrada: dias(-30), prazo: dias(-8), resp: staff[0], dept: deps[0], prioridade: "alta", status: "concluido", desc: "Escritura de inventário", concluidoEm: dias(-2) });

    function protocolRow(o) {
      return {
        id: store.uid(),
        numero: o.num,
        clienteId: o.cliente.id,
        clienteNome: o.cliente.nome,
        clienteDoc: o.cliente.doc,
        tipoAto: o.tipo,
        descricao: o.desc,
        entrada: o.entrada,
        prazo: o.prazo,
        responsavelId: o.resp.id,
        responsavelNome: o.resp.nome,
        setorId: o.dept.id,
        setorNome: o.dept.nome,
        prioridade: o.prioridade,
        status: o.status,
        concluidoEm: o.concluidoEm || null,
        arquivado: false,
      };
    }

    const tasks = [
      { id: store.uid(), protocoloId: p1.id, titulo: "Conferir documentação", desc: "Validar documentos da parte", responsavelId: staff[0].id, prazo: dias(2), status: "concluida", prioridade: "alta", criador: md, concluidaEm: hoje },
      { id: store.uid(), protocoloId: p1.id, titulo: "Elaborar minuta", desc: "Minuta da escritura", responsavelId: staff[1].id, prazo: dias(4), status: "em_andamento", prioridade: "alta", criador: md, concluidaEm: null },
      { id: store.uid(), protocoloId: p2.id, titulo: "Solicitar assinatura", desc: "Agendar assinatura com a parte", responsavelId: staff[0].id, prazo: dias(1), status: "pendente", prioridade: "media", criador: md, concluidaEm: null },
      { id: store.uid(), protocoloId: p3.id, titulo: "Confirmar retirada", desc: "Aguardando cliente retornar", responsavelId: staff[2].id, prazo: dias(-1), status: "atrasada", prioridade: "baixa", criador: md, concluidaEm: null },
    ];

    const emails = [
      { id: store.uid(), tipo: "recebido", de: clients[0].email, para: "serventia@carto.com", assunto: "Dúvidas sobre a escritura 2026-001245", corpo: "Preciso de mais informações sobre o protocolo 2026-001245.", data: store.hoursFromNow(-5), lido: false, statusResposta: "novo", protocoloId: p1.id, arquivado: false, favorito: false, responsavelId: staff[1].id },
      { id: store.uid(), tipo: "recebido", de: clients[1].email, para: "serventia@carto.com", assunto: "Procuração - documentos", corpo: "Envio a documentação pendente.", data: store.hoursFromNow(-30), lido: true, statusResposta: "aguardando_resposta", protocoloId: p2.id, arquivado: false, favorito: false, responsavelId: staff[0].id },
      { id: store.uid(), tipo: "enviado", de: "serventia@carto.com", para: clients[2].email, assunto: "Certidão pronta", corpo: "A certidão está pronta para retirada.", data: store.hoursFromNow(-72), lido: true, statusResposta: "respondido", protocoloId: p3.id, arquivado: false, favorito: true, responsavelId: staff[2].id },
    ];

    db.write("departments", deps);
    store.set("funcionarios", staff);
    db.write("clients", clients);
    db.write("protocols", [p1, p2, p3, p4]);
    db.write("tasks", tasks);
    db.write("emails", emails);
    db.write("appointments", []);
    db.write("history", []);
    db.write("notifications", []);
    db.write("audit", []);
    store.set(db.seedMark, true);
  }

  // ===== SERVIÇO DE PROTOCOLOS =====
  function protGetAll() {
    seed();
    return db.all("protocols");
  }
  function protById(id) {
    seed();
    return db.byId("protocols", id);
  }
  function protCreate(o, user) {
    seed();
    if (!o.numero || !o.clienteId || !o.prazo) throw new Error("Número, cliente e prazo são obrigatórios.");
    const dept = db.byId("departments", o.setorId);
    const emp = db.byId("funcionarios", o.responsavelId);
    const client = db.byId("clients", o.clienteId);
    const rec = {
      id: store.uid(),
      numero: o.numero,
      clienteId: o.clienteId,
      clienteNome: (client && client.nome) || "",
      clienteDoc: (client && client.doc) || "",
      tipoAto: o.tipoAto || "Outro",
      descricao: o.descricao || "",
      entrada: o.entrada || store.todayISO(),
      prazo: o.prazo,
      responsavelId: o.responsavelId || null,
      responsavelNome: (emp && emp.nome) || "",
      setorId: o.setorId || null,
      setorNome: (dept && dept.nome) || "",
      prioridade: o.prioridade || "media",
      status: "novo",
      concluidoEm: null,
      arquivado: false,
      assinaturaPrevista: o.assinaturaPrevista || null,
    };
    db.insert("protocols", rec);
    histProtocolo(rec.id, user || "sistema", "Protocolo criado", null, rec.status);
    db.audit(user || "sistema", "criar_protocolo", rec.numero, null, "novo");
    if (o.statusInicial === "triagem") {
      protUpdateStatus(rec.id, "triagem", user || "sistema");
    }
    return rec;
  }
  function protUpdateStatus(id, status, user) {
    const p = protById(id);
    if (!p) return null;
    const from = p.status;
    const upd = { status };
    if (status === "concluido") {
      upd.concluidoEm = store.todayISO();
      db.all("tasks").filter((t) => t.protocoloId === id).forEach((t) => db.update("tasks", t.id, { status: "concluida", concluidaEm: store.todayISO() }));
      db.write("notifications", db.all("notifications").filter((n) => n.protocoloId !== id));
    }
    const updated = db.update("protocols", id, upd);
    histProtocolo(id, user || "sistema", `Status alterado: ${from} → ${status}`, from, status);
    db.audit(user || "sistema", "alterar_status", p.numero, from, status);
    return updated;
  }
  function protArquivar(id, user) {
    const p = protById(id);
    if (!p) return null;
    if (p.status !== "concluido") throw new Error("Somente protocolos concluídos podem ser arquivados.");
    const upd = db.update("protocols", id, { arquivado: true });
    histProtocolo(id, user || "sistema", "Protocolo arquivado", p.status, "arquivado");
    db.audit(user || "sistema", "arquivar_protocolo", p.numero, null, "arquivado");
    return upd;
  }
  function histProtocolo(protocoloId, user, action, from, to) {
    db.insert("history", { id: store.uid(), protocoloId, user, action, from, to, at: nowISO() });
  }
  function protHist(id) {
    return db.all("history").filter((h) => h.protocoloId === id).sort((a, b) => (a.at < b.at ? 1 : -1));
  }
  function protDias(p) {
    if (!p) return null;
    return prazo.diasRestantes(p.prazo);
  }
  function protSituacaoPrazo(p) {
    if (!p) return "normal";
    const concluido = p.status === "concluido" || p.status === "arquivado";
    return prazo.status(p.prazo, concluido);
  }
  function protSituacaoLabel(p) {
    return prazo.label(protSituacaoPrazo(p));
  }
  function protSituacaoCss(p) {
    return prazo.css(protSituacaoPrazo(p));
  }

  // ===== SERVIÇO DE TAREFAS =====
  function taskGetAll() {
    seed();
    return db.all("tasks");
  }
  function taskByProtocolo(id) {
    return taskGetAll().filter((t) => t.protocoloId === id);
  }
  function taskCreate(o, user) {
    seed();
    if (!o.titulo || !o.protocoloId) throw new Error("Título e protocolo são obrigatórios.");
    const t = { id: store.uid(), protocoloId: o.protocoloId, titulo: o.titulo, desc: o.desc || "", responsavelId: o.responsavelId || null, prazo: o.prazo || null, status: "pendente", prioridade: o.prioridade || "media", criador: user || "sistema", concluidaEm: null };
    db.insert("tasks", t);
    db.audit(user || "sistema", "criar_tarefa", t.titulo, null, "pendente");
    return t;
  }
  function taskUpdateStatus(id, status, user) {
    const t = db.byId("tasks", id);
    if (!t) return null;
    const upd = { status };
    if (status === "concluida") upd.concluidaEm = store.todayISO();
    const r = db.update("tasks", id, upd);
    db.audit(user || "sistema", "tarefa_status", t.titulo, null, status);
    return r;
  }
  function taskRemove(id, user) {
    const t = db.byId("tasks", id);
    db.remove("tasks", id);
    if (t) db.audit(user || "sistema", "excluir_tarefa", t.titulo, null, null);
  }
  function taskSituacao(t) {
    if (t.status === "concluida") return "concluida";
    if (t.status !== "pendente" && t.status !== "em_andamento") return t.status;
    if (prazo.status(t.prazo, false) === "atrasado") return "atrasada";
    return t.status;
  }

  // ===== SERVIÇO DE CLIENTES =====
  function clientGetAll() {
    seed();
    return db.all("clients");
  }
  function clientUpsert(c, user) {
    seed();
    if (!c.nome) throw new Error("Nome é obrigatório.");
    const exists = c.id ? db.byId("clients", c.id) : null;
    const rec = { id: c.id || store.uid(), nome: c.nome, doc: c.doc || "", email: c.email || "", fone: c.fone || "" };
    if (exists) {
      db.update("clients", rec.id, rec);
      db.audit(user || "sistema", "editar_cliente", rec.nome, null, null);
    } else {
      db.insert("clients", rec);
      db.audit(user || "sistema", "criar_cliente", rec.nome, null, null);
    }
    return rec;
  }
  function clientRemove(id, user) {
    const c = db.byId("clients", id);
    db.remove("clients", id);
    if (c) db.audit(user || "sistema", "excluir_cliente", c.nome, null, null);
  }

  // ===== SERVIÇO DE E-MAILS =====
  function emailGetAll() {
    seed();
    return db.all("emails");
  }
  function emailUpsert(e, user) {
    seed();
    const exists = e.id ? db.byId("emails", e.id) : null;
    const rec = { id: e.id || store.uid(), tipo: e.tipo || "recebido", de: e.de || "", para: e.para || "", assunto: e.assunto || "", corpo: e.corpo || "", data: e.data || nowISO(), lido: !!e.lido, statusResposta: e.statusResposta || "novo", protocoloId: e.protocoloId || null, arquivado: !!e.arquivado, favorito: !!e.favorito, responsavelId: e.responsavelId || null };
    if (exists) {
      db.update("emails", rec.id, rec);
      if (rec.protocoloId && exists.protocoloId !== rec.protocoloId) db.audit(user || "sistema", "vincular_email_protocolo", rec.assunto, exists.protocoloId, rec.protocoloId);
    } else {
      db.insert("emails", rec);
      if (rec.protocoloId) db.audit(user || "sistema", "vincular_email_protocolo", rec.assunto, null, rec.protocoloId);
    }
    return rec;
  }
  function emailMarcarLido(id, user) {
    db.update("emails", id, { lido: true });
    db.audit(user || "sistema", "marcar_email_lido", db.byId("emails", id) && db.byId("emails", id).assunto, null, "lido");
  }
  function emailSetResposta(id, status, user) {
    db.update("emails", id, { statusResposta: status });
    db.audit(user || "sistema", "email_status_resposta", db.byId("emails", id) && db.byId("emails", id).assunto, null, status);
  }

  // ===== NOTIFICAÇÕES =====
  function checkAlerts() {
    seed();
    const now = new Date();
    const added = [];
    protGetAll().forEach((p) => {
      if (p.arquivado || p.status === "concluido" || p.status === "cancelado") return;
      const st = protSituacaoPrazo(p);
      if (st === "atrasado" || st === "hoje" || st === "urgente") {
        const titulo = st === "atrasado" ? `ATRASADO: Protocolo ${p.numero} está atrasado` : `Protocolo ${p.numero} vence ${st === "hoje" ? "hoje" : "em breve"}`;
        if (!db.all("notifications").some((n) => n.protocoloId === p.id && n.msg === titulo)) {
          db.insert("notifications", { id: store.uid(), protocoloId: p.id, msg: titulo, nivel: st === "atrasado" ? "critico" : "aviso", data: nowISO(), lida: false });
          added.push(titulo);
        }
      }
    });
    emailGetAll().forEach((e) => {
      if (e.statusResposta === "aguardando_resposta" && !db.all("notifications").some((n) => n.msg === `E-mail aguardando resposta: ${e.assunto}`)) {
        db.insert("notifications", { id: store.uid(), protocoloId: e.protocoloId, msg: `E-mail aguardando resposta: ${e.assunto}`, nivel: "aviso", data: nowISO(), lida: false });
      }
    });
    return added;
  }
  function notifGetAll() {
    seed();
    return db.all("notifications");
  }
  function notifMarcarLida(id) {
    db.update("notifications", id, { lida: true });
  }

  // ===== INDICADORES =====
  function prodFuncionario() {
    seed();
    const funcs = store.get("funcionarios", []);
    return funcs.map((f) => {
      const meusProtos = protGetAll().filter((p) => p.responsavelId === f.id);
      const minhasTasks = taskGetAll().filter((t) => t.responsavelId === f.id);
      const concluida = minhasTasks.filter((t) => t.status === "concluida").length;
      const atrasada = minhasTasks.filter((t) => taskSituacao(t) === "atrasada").length;
      const concluidos = meusProtos.filter((p) => p.status === "concluido").length;
      const atrasados = meusProtos.filter((p) => protSituacaoPrazo(p) === "atrasado").length;
      return {
        f, protocolos: meusProtos.length, concluidos, atrasados,
        tarefasConcluidas: concluida, tarefasAtribuidas: minhasTasks.length, tarefasAtrasadas: atrasada,
        indiceProdutividade: minhasTasks.length ? Math.round((concluida / minhasTasks.length) * 100) : 0,
      };
    });
  }
  function prodSetor() {
    seed();
    const deps = db.all("departments");
    const funcs = store.get("funcionarios", []);
    return deps.map((d) => {
      const ids = funcs.filter((f) => f.setor === d.id).map((f) => f.id);
      const protos = protGetAll().filter((p) => ids.includes(p.responsavelId));
      const concluidos = protos.filter((p) => p.status === "concluido").length;
      return { d, funcionarios: ids.length, protocolos: protos.length, concluidos, atrasados: protos.filter((p) => protSituacaoPrazo(p) === "atrasado").length };
    });
  }
  function tempoMedioConclusao() {
    const concluidos = protGetAll().filter((p) => p.status === "concluido" && p.concluidoEm && p.entrada);
    if (!concluidos.length) return 0;
    const total = concluidos.reduce((acc, p) => acc + Math.max(0, Math.round((new Date(p.concluidoEm) - new Date(p.entrada)) / 86400000)), 0);
    return Math.round(total / concluidos.length);
  }

  window.core = {
    protGetAll, protById, protCreate, protUpdateStatus, protArquivar, protHist, protDias,
    protSituacaoPrazo, protSituacaoLabel, protSituacaoCss,
    taskGetAll, taskByProtocolo, taskCreate, taskUpdateStatus, taskRemove, taskSituacao,
    clientGetAll, clientUpsert, clientRemove,
    emailGetAll, emailUpsert, emailMarcarLido, emailSetResposta,
    checkAlerts, notifGetAll, notifMarcarLida,
    prodFuncionario, prodSetor, tempoMedioConclusao,
  };
})();