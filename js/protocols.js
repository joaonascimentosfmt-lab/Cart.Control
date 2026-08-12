(function () {
  const STATUS = [
    { v: "novo", l: "Novo" },
    { v: "triagem", l: "Triagem" },
    { v: "em_analise", l: "Em análise" },
    { v: "aguardando_documentacao", l: "Aguardando documentação" },
    { v: "aguardando_cliente", l: "Aguardando cliente" },
    { v: "aguardando_assinatura", l: "Aguardando assinatura" },
    { v: "agendado", l: "Agendado" },
    { v: "em_finalizacao", l: "Em finalização" },
    { v: "concluido", l: "Concluído" },
    { v: "cancelado", l: "Cancelado" },
    { v: "arquivado", l: "Arquivado" },
  ];
  const STATUS_LABEL = Object.fromEntries(STATUS.map((s) => [s.v, s.l]));
  const PRIORIDADE = [
    { v: "baixa", l: "Baixa" },
    { v: "media", l: "Média" },
    { v: "alta", l: "Alta" },
    { v: "critica", l: "Crítica" },
  ];
  const PRIO_LABEL = Object.fromEntries(PRIORIDADE.map((p) => [p.v, p.l]));
  const ATOS = ["Escritura", "Procuração", "Reconhecimento de Firma", "Autenticação", "Certidão", "Registro Civil", "Registro de Imóveis", "Testamento", "Outro"];

  function renderProtocolos(root) {
    const protos = core.protGetAll();
    const funcs = store.get("funcionarios", []);
    const deps = db.all("departments");

    root.innerHTML = `
      <div class="page-head">
        <h2 class="page-title">Protocolos</h2>
        <button class="btn primary" id="proto-add">${icon("plus")} Novo protocolo</button>
      </div>

      <div class="card">
        <div class="toolbar">
          <input type="search" id="p-search" placeholder="Buscar número, cliente, CPF/CNPJ..." aria-label="Buscar protocolo">
          <select id="p-filter-status"><option value="">Todos os status</option>${STATUS.map((s) => `<option value="${s.v}">${s.l}</option>`).join("")}</select>
          <select id="p-filter-prazo"><option value="">Toda situação de prazo</option>
            <option value="atrasado">Atrasado</option><option value="hoje">Vence hoje</option><option value="urgente">Urgente</option><option value="atencao">Atenção</option><option value="normal">Normal</option>
          </select>
          <select id="p-filter-resp"><option value="">Todos os responsáveis</option>${funcs.map((f) => `<option value="${f.id}">${esc(f.nome)}</option>`).join("")}</select>
          <select id="p-filter-setor"><option value="">Todos os setores</option>${deps.map((d) => `<option value="${d.id}">${esc(d.nome)}</option>`).join("")}</select>
          <select id="p-filter-prio"><option value="">Todas as prioridades</option>${PRIORIDADE.map((p) => `<option value="${p.v}">${p.l}</option>`).join("")}</select>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Número</th><th>Cliente</th><th>Tipo ato</th><th>Entrada</th><th>Prazo</th><th>Status</th><th>Priorid.</th><th>Prazo situação</th><th>Resp.</th><th></th></tr></thead>
            <tbody id="p-tbody"></tbody>
          </table>
        </div>
      </div>`;

    const tbody = root.querySelector("#p-tbody");
    const els = {
      q: root.querySelector("#p-search"),
      st: root.querySelector("#p-filter-status"),
      pr: root.querySelector("#p-filter-prazo"),
      rs: root.querySelector("#p-filter-resp"),
      se: root.querySelector("#p-filter-setor"),
      pi: root.querySelector("#p-filter-prio"),
    };

    function draw() {
      const q = els.q.value.toLowerCase().trim();
      const st = els.st.value, pr = els.pr.value, rs = els.rs.value, se = els.se.value, pi = els.pi.value;
      let list = protos.filter((p) => {
        if (q && !(`${p.numero} ${p.clienteNome} ${p.clienteDoc}`.toLowerCase().includes(q))) return false;
        if (st && p.status !== st) return false;
        if (rs && p.responsavelId !== rs) return false;
        if (se && p.setorId !== se) return false;
        if (pi && p.prioridade !== pi) return false;
        if (pr) {
          const s = core.protSituacaoPrazo(p);
          const want = pr === "concluido" || pr === "arquivado" || pr === "cancelado" ? s : s;
          const map = { atrasado: "atrasado", hoje: "hoje", urgente: "urgente", atencao: "atencao", normal: "normal" };
          if (map[pr] && map[pr] !== s && !(pr === s && pr !== undefined)) {
            if (pr !== s) return false;
          }
        }
        return true;
      }).sort((a, b) => (a.numero < b.numero ? 1 : -1));

      if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="10"><div class="empty">Nenhum protocolo encontrado.</div></td></tr>`;
        return;
      }
      tbody.innerHTML = list.map((p) => {
        const s = core.protSituacaoPrazo(p);
        return `
          <tr class="clickable" data-link="#/protocol/${p.id}">
            <td><strong>${esc(p.numero)}</strong></td>
            <td>${esc(p.clienteNome)}</td>
            <td>${esc(p.tipoAto)}</td>
            <td>${formatDate(p.entrada)}</td>
            <td>${formatDate(p.prazo)}</td>
            <td><span class="badge st-${p.status}">${STATUS_LABEL[p.status] || p.status}</span></td>
            <td><span class="prio prio-${p.prioridade}">${PRIO_LABEL[p.prioridade] || p.prioridade}</span></td>
            <td><span class="pill ${core.protSituacaoCss(p)}">${core.protSituacaoLabel(p)}${core.protDias(p) != null && s !== "concluido" ? ` (${core.protDias(p) > 0 ? "+" : ""}${core.protDias(p)}d)` : ""}</span></td>
            <td>${esc(p.responsavelNome || "-")}</td>
            <td><div class="row-actions">
              <a class="icon-btn" href="#/protocol/${p.id}" title="Abrir">${icon("chevron-right")}</a>
            </div></td>
          </tr>`;
      }).join("");
    }

    draw();
    ["q", "st", "pr", "rs", "se", "pi"].forEach((k) => els[k].addEventListener(k === "q" ? "input" : "change", draw));
    tbody.addEventListener("click", (e) => {
      const link = e.target.closest("[data-link]");
      if (link) location.hash = link.dataset.link;
    });

    root.querySelector("#proto-add").addEventListener("click", () => protoModal(null));
  }

  function protoModal(existing) {
    const funcs = store.get("funcionarios", []);
    const deps = db.all("departments");
    const clients = core.clientGetAll();
    const isNew = !existing;
    const e = existing || { numero: "", clienteId: "", tipoAto: ATOS[0], descricao: "", entrada: store.todayISO(), prazo: store.daysFromNow(5), responsavelId: "", setorId: "", prioridade: "media", assinaturaPrevista: "" };
    ui.modal(`
      <h3>${isNew ? "Novo protocolo" : `Protocolo ${esc(e.numero)}`}</h3>
      <form class="form-grid" id="proto-form">
        <div class="form-field">
          <label>Número do protocolo</label>
          <input type="text" name="numero" value="${esc(e.numero)}" required placeholder="2026-001245">
        </div>
        <div class="form-field">
          <label>Cliente</label>
          <select name="clienteId" required>
            <option value="">Selecione...</option>
            ${clients.map((c) => `<option value="${c.id}" ${c.id === e.clienteId ? "selected" : ""}>${esc(c.nome)}${c.doc ? " · " + esc(c.doc) : ""}</option>`).join("")}
          </select>
        </div>
        <div class="form-field">
          <label>Tipo de ato</label>
          <select name="tipoAto">${ATOS.map((a) => `<option ${a === e.tipoAto ? "selected" : ""}>${a}</option>`).join("")}</select>
        </div>
        <div class="form-field">
          <label>Prioridade</label>
          <select name="prioridade">${PRIORIDADE.map((p) => `<option value="${p.v}" ${p.v === e.prioridade ? "selected" : ""}>${p.l}</option>`).join("")}</select>
        </div>
        <div class="form-field">
          <label>Data de entrada</label>
          <input type="date" name="entrada" value="${e.entrada}" required>
        </div>
        <div class="form-field">
          <label>Prazo para conclusão</label>
          <input type="date" name="prazo" value="${e.prazo}" required>
        </div>
        <div class="form-field">
          <label>Data prevista p/ assinatura</label>
          <input type="date" name="assinaturaPrevista" value="${e.assinaturaPrevista || ""}">
        </div>
        <div class="form-field">
          <label>Responsável</label>
          <select name="responsavelId"><option value="">—</option>${funcs.map((f) => `<option value="${f.id}" ${f.id === e.responsavelId ? "selected" : ""}>${esc(f.nome)}</option>`).join("")}</select>
        </div>
        <div class="form-field">
          <label>Setor</label>
          <select name="setorId"><option value="">—</option>${deps.map((d) => `<option value="${d.id}" ${d.id === e.setorId ? "selected" : ""}>${esc(d.nome)}</option>`).join("")}</select>
        </div>
        <div class="form-field full">
          <label>Descrição</label>
          <textarea name="descricao" rows="2" placeholder="Objeto do ato">${esc(e.descricao || "")}</textarea>
        </div>
        <div class="form-field full actions">
          <button type="button" class="btn ghost" data-close>Cancelar</button>
          <button type="submit" class="btn primary">Salvar</button>
        </div>
      </form>`,
      (fd, close) => {
        try {
          if (isNew) {
            core.protCreate({
              numero: fd.get("numero").trim(),
              clienteId: fd.get("clienteId"),
              tipoAto: fd.get("tipoAto"),
              descricao: fd.get("descricao").trim(),
              entrada: fd.get("entrada"),
              prazo: fd.get("prazo"),
              responsavelId: fd.get("responsavelId") || null,
              setorId: fd.get("setorId") || null,
              prioridade: fd.get("prioridade"),
              assinaturaPrevista: fd.get("assinaturaPrevista") || null,
              statusInicial: "triagem",
            }, currUser());
            ui.toast("Protocolo criado");
          } else {
            const updated = { ...e, descricao: fd.get("descricao").trim(), prazo: fd.get("prazo"), assinaturaPrevista: fd.get("assinaturaPrevista") || null };
            db.update("protocols", e.id, updated);
            db.audit(currUser(), "editar_protocolo", e.numero, null, null);
            ui.toast("Protocolo atualizado");
          }
          close();
          renderProtocolos(document.getElementById("view"));
        } catch (err) { ui.toast(err.message, "error"); }
      });
  }

  function renderProtocolDetail(root, id) {
    const p = core.protById(id);
    if (!p) { root.innerHTML = `<div class="empty">Protocolo não encontrado.</div><a class="btn ghost" href="#/protocols">Voltar</a>`; return; }
    const tab = (location.hash.split("?"))[1] ? new URLSearchParams(location.hash.split("?")[1]).get("tab") || "detalhes" : "detalhes";
    const tipo = tab === "tarefas" ? renderTarefasTab : tab === "historico" ? renderHistoricoTab : tab === "emails" ? renderEmailsTab : renderDetalheTab;

    root.innerHTML = `
      <div class="page-head">
        <a class="btn ghost small" href="#/protocols">${icon("chevron-left")} Protocolos</a>
        <h2 class="page-title">Protocolo ${esc(p.numero)}</h2>
        <div class="row-actions">
          <button class="btn small ghost" id="p-edit">${icon("edit")} Editar</button>
          ${p.status !== "concluido" ? `<button class="btn small" id="p-concluir">${icon("check")} Concluir</button>` : `<button class="btn small ghost" id="p-arquivar">${icon("archive")} Arquivar</button>`}
        </div>
      </div>

      <div class="tabs" id="detail-tabs">
        <button class="tab ${tab === "detalhes" ? "active" : ""}" data-tab="detalhes">Detalhes</button>
        <button class="tab ${tab === "tarefas" ? "active" : ""}" data-tab="tarefas">Tarefas</button>
        <button class="tab ${tab === "historico" ? "active" : ""}" data-tab="historico">Histórico</button>
        <button class="tab ${tab === "emails" ? "active" : ""}" data-tab="emails">E-mails</button>
      </div>
      <div id="detail-body">${tipo(id, p)}</div>`;

    root.querySelector("#detail-tabs").addEventListener("click", (e) => {
      const t = e.target.closest("[data-tab]");
      if (t) location.hash = `#/protocol/${id}?tab=${t.dataset.tab}`;
    });
    const editBtn = root.querySelector("#p-edit");
    if (editBtn) editBtn.addEventListener("click", () => protoModal(p));
    const concluir = root.querySelector("#p-concluir");
    if (concluir) concluir.addEventListener("click", () => {
      if (ui.confirmDialog(`Concluir o protocolo ${p.numero}?`)) {
        core.protUpdateStatus(p.id, "concluido", currUser());
        ui.toast("Protocolo concluído");
        renderProtocolDetail(root, id);
      }
    });
    const arquivar = root.querySelector("#p-arquivar");
    if (arquivar) arquivar.addEventListener("click", () => {
      if (ui.confirmDialog(`Arquivar o protocolo ${p.numero}?`)) {
        try { core.protArquivar(p.id, currUser()); ui.toast("Protocolo arquivado"); renderProtocolDetail(root, id); } catch (err) { ui.toast(err.message, "error"); }
      }
    });

    if (tab === "detalhes") bindStatusChange(root, id, () => renderProtocolDetail(root, id));
    if (tab === "tarefas") bindTaskActions(root, id, () => renderProtocolDetail(root, id));
  }

  function renderDetalheTab(id, p) {
    const s = core.protSituacaoPrazo(p);
    const emails = core.emailGetAll().filter((e) => e.protocoloId === id);
    return `
      <div class="card">
        <div class="detail-grid">
          <div><label class="lbl">Número</label><div>${esc(p.numero)}</div></div>
          <div><label class="lbl">Cliente</label><div>${esc(p.clienteNome)}${p.clienteDoc ? " · " + esc(p.clienteDoc) : ""}</div></div>
          <div><label class="lbl">Tipo de ato</label><div>${esc(p.tipoAto)}</div></div>
          <div><label class="lbl">Prioridade</label><div><span class="prio prio-${p.prioridade}">${PRIO_LABEL[p.prioridade]}</span></div></div>
          <div><label class="lbl">Status</label><div><span class="badge st-${p.status}">${STATUS_LABEL[p.status]}</span></div></div>
          <div><label class="lbl">Situação do prazo</label><div><span class="pill ${core.protSituacaoCss(p)}">${core.protSituacaoLabel(p)}</span></div></div>
          <div><label class="lbl">Entrada</label><div>${formatDate(p.entrada)}</div></div>
          <div><label class="lbl">Prazo</label><div>${formatDate(p.prazo)}${s !== "concluido" && p.prazo ? ` (${core.protDias(p) > 0 ? "+" : ""}${core.protDias(p)}d)` : ""}</div></div>
          <div><label class="lbl">Responsável</label><div>${esc(p.responsavelNome || "-")}</div></div>
          <div><label class="lbl">Setor</label><div>${esc(p.setorNome || "-")}</div></div>
          <div><label class="lbl">Assinatura prevista</label><div>${formatDate(p.assinaturaPrevista)}</div></div>
          ${p.concluidoEm ? `<div><label class="lbl">Concluído em</label><div>${formatDate(p.concluidoEm)}</div></div>` : ""}
        </div>
        ${p.descricao ? `<div class="mt"><label class="lbl">Descrição</label><p>${esc(p.descricao)}</p></div>` : ""}
      </div>
      <div class="card">
        <h2>Mudar status</h2>
        <select id="change-status"><option value="">Selecione...</option>${STATUS.map((s) => `<option value="${s.v}">${s.l}</option>`).join("")}</select>
        <button class="btn primary mt" id="apply-status">Aplicar</button>
      </div>`;
  }

  function bindStatusChange(root, id, cb) {
    const sel = root.querySelector("#change-status");
    const btn = root.querySelector("#apply-status");
    if (!btn) return;
    btn.addEventListener("click", () => {
      if (!sel.value) return;
      if (ui.confirmDialog(`Alterar status para "${STATUS_LABEL[sel.value]}"?`)) {
        core.protUpdateStatus(id, sel.value, currUser());
        ui.toast("Status atualizado");
        cb();
      }
    });
  }

  function renderTarefasTab(id, p) {
    const tasks = core.taskByProtocolo(id);
    const funcs = store.get("funcionarios", []);
    return `
      <div class="card">
        <div class="card-head"><h2>Tarefas do protocolo</h2><button class="btn primary small" id="task-add">${icon("plus")} Nova tarefa</button></div>
        <div class="list">
          ${tasks.length === 0 ? `<div class="empty">Nenhuma tarefa.</div>` : tasks.map((t) => {
            const sit = core.taskSituacao(t);
            return `<div class="list-item">
              <div>
                <div class="who">${esc(t.titulo)}</div>
                <div class="detail">${esc(t.desc || "")}${t.prazo ? " · Prazo " + formatDate(t.prazo) : ""}${t.responsavelId ? " · " + esc(funcs.find((f) => f.id === t.responsavelId)?.nome || "") : ""}</div>
              </div>
              <div class="row-actions">
                <span class="badge st-${sit}">${taskStatusLabel(sit)}</span>
                ${sit !== "concluida" ? `<button class="icon-btn" data-tdone="${t.id}" title="Concluir">${icon("check")}</button>` : ""}
                <button class="icon-btn" data-tdel="${t.id}" title="Excluir">${icon("trash")}</button>
              </div>
            </div>`;
          }).join("")}
        </div>
      </div>`;
  }

  function bindTaskActions(root, id, cb) {
    const add = root.querySelector("#task-add");
    if (add) add.addEventListener("click", () => taskModal(id));
    root.querySelectorAll("[data-tdone]").forEach((b) => b.addEventListener("click", () => {
      core.taskUpdateStatus(b.dataset.tdone, "concluida", currUser());
      ui.toast("Tarefa concluída"); cb();
    }));
    root.querySelectorAll("[data-tdel]").forEach((b) => b.addEventListener("click", () => {
      if (ui.confirmDialog("Excluir tarefa?")) { core.taskRemove(b.dataset.tdel, currUser()); ui.toast("Tarefa excluída"); cb(); }
    }));
  }

  function taskModal(protocoloId) {
    const funcs = store.get("funcionarios", []);
    ui.modal(`
      <h3>Nova tarefa</h3>
      <form class="form-grid" id="task-form">
        <div class="form-field full"><label>Título</label><input type="text" name="titulo" required></div>
        <div class="form-field full"><label>Descrição</label><textarea name="desc" rows="2"></textarea></div>
        <div class="form-field"><label>Responsável</label><select name="responsavelId"><option value="">—</option>${funcs.map((f) => `<option value="${f.id}">${esc(f.nome)}</option>`).join("")}</select></div>
        <div class="form-field"><label>Prazo</label><input type="date" name="prazo"></div>
        <div class="form-field"><label>Prioridade</label><select name="prioridade"><option value="baixa">Baixa</option><option value="media" selected>Média</option><option value="alta">Alta</option><option value="critica">Crítica</option></select></div>
        <div class="form-field full actions"><button type="button" class="btn ghost" data-close>Cancelar</button><button type="submit" class="btn primary">Salvar</button></div>
      </form>`,
      (fd, close) => {
        core.taskCreate({ protocoloId, titulo: fd.get("titulo").trim(), desc: fd.get("desc").trim(), responsavelId: fd.get("responsavelId") || null, prazo: fd.get("prazo") || null, prioridade: fd.get("prioridade") }, currUser());
        close(); ui.toast("Tarefa criada");
        renderProtocolDetail(document.getElementById("view"), protocoloId);
        core.checkAlerts();
      });
  }

  function renderHistoricoTab(id, p) {
    const hist = core.protHist(id);
    return `<div class="card">
      <h2>Histórico de movimentações</h2>
      <div class="timeline">
        ${hist.length === 0 ? `<div class="empty">Sem movimentações.</div>` : hist.map((h) => `
          <div class="tl-item">
            <div class="tl-dot"></div>
            <div>
              <div>${esc(h.action)}</div>
              <div class="detail">${esc(h.user)} · ${new Date(h.at).toLocaleString("pt-BR")}${h.from && h.to ? ` · ${esc(h.from)} → ${esc(h.to)}` : ""}</div>
            </div>
          </div>`).join("")}
      </div>
    </div>`;
  }

  function renderEmailsTab(id, p) {
    const emails = core.emailGetAll().filter((e) => e.protocoloId === id);
    return `<div class="card">
      <h2>E-mails vinculados</h2>
      <div class="email-list">
        ${emails.length === 0 ? `<div class="empty">Nenhum e-mail vinculado. Vincule na central de e-mails.</div>` : emails.map((e) => `
          <div class="email-item">
            <div class="head"><div><div class="subject">${esc(e.assunto)}</div><div class="recipient">${esc(e.tipo === "recebido" ? e.de : "para " + e.para)} · ${store.timeAgo(e.data)}</div></div></div>
            <div class="recipient">${esc(e.corpo || "")}</div>
          </div>`).join("")}
      </div>
    </div>`;
  }

  function taskStatusLabel(s) {
    return { pendente: "Pendente", em_andamento: "Em andamento", concluida: "Concluída", cancelada: "Cancelada", atrasada: "Atrasada" }[s] || s;
  }

  function currUser() {
    return (store.get("session_user", "Admin")) || "Admin";
  }

  window.renderProtocolos = renderProtocolos;
  window.renderProtocolDetail = renderProtocolDetail;
  window.bindStatusChange = bindStatusChange;
  window.bindTaskActions = bindTaskActions;
  window.taskStatusLabel = taskStatusLabel;
  window.currentUser = currUser;
})();