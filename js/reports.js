(function () {
  function renderReports(root) {
    const protos = core.protGetAll();
    const hoje = store.todayISO();
    const de = hoje; const ate = hoje;

    root.innerHTML = `
      <h2 class="page-title">Relatórios</h2>
      <div class="card">
        <div class="toolbar">
          <label class="toolbar-label">De <input type="date" id="r-de" value="${store.daysFromNow(-30)}"></label>
          <label class="toolbar-label">Até <input type="date" id="r-ate" value="${hoje}"></label>
          <select id="r-grupo">
            <option value="todos">Todos os protocolos</option>
            <option value="concluidos">Concluídos</option>
            <option value="atrasados">Atrasados</option>
            <option value="periodo">Concluídos no período</option>
          </select>
          <button class="btn ghost" id="r-csv">${icon("download")} Exportar CSV</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Número</th><th>Cliente</th><th>Tipo</th><th>Entrada</th><th>Prazo</th><th>Status</th><th>Situação prazo</th><th>Priorid.</th><th>Resp.</th><th>Concluído em</th></tr></thead>
            <tbody id="r-tbody"></tbody>
          </table>
        </div>
      </div>`;

    const tbody = root.querySelector("#r-tbody");
    const deInp = root.querySelector("#r-de");
    const ateInp = root.querySelector("#r-ate");
    const grupo = root.querySelector("#r-grupo");

    function current() {
      let list = protos.slice();
      if (grupo.value === "concluidos") list = list.filter((p) => p.status === "concluido");
      if (grupo.value === "atrasados") list = list.filter((p) => core.protSituacaoPrazo(p) === "atrasado");
      if (grupo.value === "periodo") list = list.filter((p) => p.concluidoEm && p.concluidoEm >= deInp.value && p.concluidoEm <= ateInp.value);
      return list;
    }
    function draw() {
      const list = current().sort((a, b) => (a.numero < b.numero ? 1 : -1));
      if (!list.length) { tbody.innerHTML = `<tr><td colspan="10"><div class="empty">Nenhum registro.</div></td></tr>`; return; }
      tbody.innerHTML = list.map((p) => `
        <tr>
          <td><strong>${esc(p.numero)}</strong></td>
          <td>${esc(p.clienteNome)}</td>
          <td>${esc(p.tipoAto)}</td>
          <td>${formatDate(p.entrada)}</td>
          <td>${formatDate(p.prazo)}</td>
          <td><span class="badge st-${p.status}">${p.status}</span></td>
          <td><span class="pill ${core.protSituacaoCss(p)}">${core.protSituacaoLabel(p)}</span></td>
          <td>${p.prioridade}</td>
          <td>${esc(p.responsavelNome || "-")}</td>
          <td>${formatDate(p.concluidoEm)}</td>
        </tr>`).join("");
    }
    draw();
    deInp.addEventListener("change", draw);
    ateInp.addEventListener("change", draw);
    grupo.addEventListener("change", draw);

    root.querySelector("#r-csv").addEventListener("click", () => {
      const list = current();
      const head = ["numero", "cliente", "tipo", "entrada", "prazo", "status", "situacao", "prioridade", "responsavel", "concluido_em"];
      const rows = list.map((p) => [p.numero, p.clienteNome, p.tipoAto, p.entrada, p.prazo, p.status, core.protSituacaoLabel(p), p.prioridade, p.responsavelNome || "", p.concluidoEm || ""]);
      const csv = "\uFEFF" + [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "relatorio-protocolos.csv";
      a.click();
      URL.revokeObjectURL(a.href);
      ui.toast("CSV exportado");
    });
  }

  window.renderReports = renderReports;
})();