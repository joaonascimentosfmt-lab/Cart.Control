(function () {
  function renderDashboard(root) {
    const protos = core.protGetAll();
    const tasks = core.taskGetAll();
    const emails = core.emailGetAll();
    const hoje = store.todayISO();

    const novos = protos.filter((p) => p.status === "novo").length;
    const emAndamento = protos.filter((p) => ["triagem", "em_analise", "aguardando_documentacao", "aguardando_assinatura", "agendado", "em_finalizacao"].includes(p.status)).length;
    const aguardandoCliente = protos.filter((p) => p.status === "aguardando_cliente").length;
    const vencemHoje = protos.filter((p) => core.protSituacaoPrazo(p) === "hoje").length;
    const atrasados = protos.filter((p) => core.protSituacaoPrazo(p) === "atrasado").length;
    const concluidos = protos.filter((p) => p.status === "concluido").length;

    const alerts = [];
    protos.filter((p) => p.status !== "concluido" && p.status !== "cancelado" && p.status !== "arquivado").forEach((p) => {
      const s = core.protSituacaoPrazo(p);
      if (s === "atrasado") alerts.push({ lvl: "crit", msg: `Protocolo ${p.numero} está ATRASADO.`, p });
      else if (s === "hoje") alerts.push({ lvl: "warn", msg: `Protocolo ${p.numero} vence hoje.`, p });
      else if (s === "urgente") alerts.push({ lvl: "warn", msg: `Protocolo ${p.numero} vence em breve (1 dia).`, p });
      else if (s === "atencao") alerts.push({ lvl: "info", msg: `Protocolo ${p.numero} em atenção (até 3 dias).`, p });
    });
    emails.filter((e) => e.statusResposta === "aguardando_resposta").forEach((e) => alerts.push({ lvl: "info", msg: `E-mail aguardando resposta: ${e.assunto}` }));
    tasks.filter((t) => core.taskSituacao(t) === "atrasada").forEach((t) => alerts.push({ lvl: "crit", msg: `Tarefa atrasada: ${t.titulo}` }));

    const pendentes = tasks.filter((t) => ["pendente", "em_andamento"].includes(t.status)).length;
    const tarefasAtrasadas = tasks.filter((t) => core.taskSituacao(t) === "atrasada").length;
    const concluidas = tasks.filter((t) => t.status === "concluida").length;
    const naoLidos = emails.filter((e) => !e.lido).length;
    const agResposta = emails.filter((e) => e.statusResposta === "aguardando_resposta").length;
    const tempoMedio = core.tempoMedioConclusao();

    const user = window.auth ? window.auth.current() : null;
    const perfil = user ? user.perfil : "";
    const mostraProdutividade = perfil === "admin" || perfil === "gestor";

    root.innerHTML = `
      <h2 class="page-title">Dashboard</h2>

      <div class="alert-center">
        <h3 class="section-title">Central de alertas</h3>
        ${alerts.length === 0 ? `<div class="empty">Nenhum alerta no momento.</div>` : alerts.slice(0, 8).map((a) => `
          <div class="alert-item ${a.lvl}">${icon(a.lvl === "crit" ? "alert" : "clock")} ${esc(a.msg)}${a.p ? ` <a class="dash-link" href="#/protocol/${a.p.id}">abrir</a>` : ""}</div>`).join("")}
      </div>

      <div class="section-title">Protocolos</div>
      <div class="stats kpis">
        <div class="stat info"><div class="value">${protos.length}</div><div class="label">Total</div></div>
        <div class="stat info"><div class="value">${novos}</div><div class="label">Novos</div></div>
        <div class="stat info"><div class="value">${emAndamento}</div><div class="label">Em andamento</div></div>
        <div class="stat warn"><div class="value">${aguardandoCliente}</div><div class="label">Aguar. cliente</div></div>
        <div class="stat warn"><div class="value">${vencemHoje}</div><div class="label">Vencem hoje</div></div>
        <div class="stat bad"><div class="value">${atrasados}</div><div class="label">Atrasados</div></div>
        <div class="stat ok"><div class="value">${concluidos}</div><div class="label">Concluídos</div></div>
      </div>

      <div class="section-title">Tarefas & E-mails</div>
      <div class="stats kpis">
        <div class="stat info"><div class="value">${pendentes}</div><div class="label">Tarefas pendentes</div></div>
        <div class="stat bad"><div class="value">${tarefasAtrasadas}</div><div class="label">Tarefas atrasadas</div></div>
        <div class="stat ok"><div class="value">${concluidas}</div><div class="label">Tarefas concluídas</div></div>
        <div class="stat warn"><div class="value">${naoLidos}</div><div class="label">E-mails não lidos</div></div>
        <div class="stat info"><div class="value">${agResposta}</div><div class="label">Aguar. resposta</div></div>
        <div class="stat ok"><div class="value">${tempoMedio}d</div><div class="label">Tempo médio</div></div>
      </div>

      ${mostraProdutividade ? `
      <div class="section-title">Produtividade por funcionário</div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Funcionário</th><th>Protocolos</th><th>Concluídos</th><th>Atrasados</th><th>Tarefas conc.</th><th>Tarefas atras.</th><th>Índice produt.</th></tr></thead>
            <tbody id="prod-body"></tbody>
          </table>
        </div>
      </div>` : ""}`;

    if (mostraProdutividade) {
      const prod = core.prodFuncionario();
      root.querySelector("#prod-body").innerHTML = prod.map((r) => `
        <tr>
          <td><strong>${esc(r.f.nome)}</strong></td>
          <td>${r.protocolos}</td>
          <td>${r.concluidos}</td>
          <td>${r.atrasados}</td>
          <td>${r.tarefasConcluidas}</td>
          <td>${r.tarefasAtrasadas}</td>
          <td><div class="bar"><div class="bar-fill" style="width:${r.indiceProdutividade}%"></div><span class="bar-label">${r.indiceProdutividade}%</span></div></td>
        </tr>`).join("");
    }

    core.checkAlerts();
    ui.renderNotifications();
  }

  window.renderDashboard = renderDashboard;
})();