(function () {
  function renderTasks(root) {
    const tasks = core.taskGetAll();
    const funcs = store.get("funcionarios", []);
    const statusLabel = currentUser ? null : null;

    root.innerHTML = `
      <div class="page-head">
        <h2 class="page-title">Tarefas</h2>
      </div>
      <div class="card">
        <div class="toolbar">
          <input type="search" id="t-search" placeholder="Buscar tarefa..." aria-label="Buscar tarefa">
          <select id="t-filter"><option value="">Todos os status</option>
            <option value="pendente">Pendente</option><option value="em_andamento">Em andamento</option>
            <option value="concluida">Concluída</option><option value="atrasada">Atrasada</option><option value="cancelada">Cancelada</option>
          </select>
          <select id="t-filter-resp"><option value="">Todos os responsáveis</option>${funcs.map((f) => `<option value="${f.id}">${esc(f.nome)}</option>`).join("")}</select>
        </div>
        <div class="list" id="t-list"></div>
      </div>`;

    const list = root.querySelector("#t-list");
    const search = root.querySelector("#t-search");
    const filtro = root.querySelector("#t-filter");
    const filtroResp = root.querySelector("#t-filter-resp");

    function draw() {
      const q = search.value.toLowerCase().trim();
      const f = filtro.value;
      const fr = filtroResp.value;
      const rows = tasks.filter((t) => {
        const sit = core.taskSituacao(t);
        if (q && !t.titulo.toLowerCase().includes(q)) return false;
        if (f && !(sit === f || t.status === f)) return false;
        if (fr && t.responsavelId !== fr) return false;
        return true;
      }).sort((a, b) => (a.id < b.id ? 1 : -1));

      if (!rows.length) { list.innerHTML = `<div class="empty">Nenhuma tarefa.</div>`; return; }
      list.innerHTML = rows.map((t) => {
        const sit = core.taskSituacao(t);
        const proto = core.protById(t.protocoloId);
        const resp = funcs.find((f) => f.id === t.responsavelId);
        return `<div class="list-item">
          <div>
            <div class="who">${esc(t.titulo)}</div>
            <div class="detail">${proto ? `Protocolo <a href="#/protocol/${proto.id}">${esc(proto.numero)}</a> · ` : ""}${resp ? esc(resp.nome) : "-"}${t.prazo ? " · Prazo " + formatDate(t.prazo) : ""}</div>
          </div>
          <div class="row-actions">
            <span class="badge st-${sit}">${window.taskStatusLabel ? window.taskStatusLabel(sit) : sit}</span>
            ${sit !== "concluida" ? `<button class="icon-btn" data-tdone="${t.id}" title="Concluir">${icon("check")}</button>` : ""}
            <button class="icon-btn" data-tdel="${t.id}" title="Excluir">${icon("trash")}</button>
          </div>
        </div>`;
      }).join("");
    }

    draw();
    search.addEventListener("input", draw);
    filtro.addEventListener("change", draw);
    filtroResp.addEventListener("change", draw);

    list.addEventListener("click", (e) => {
      const done = e.target.closest("[data-tdone]");
      const del = e.target.closest("[data-tdel]");
      if (done) { core.taskUpdateStatus(done.dataset.tdone, "concluida", window.currentUser()); ui.toast("Tarefa concluída"); renderTasks(root); }
      if (del) { if (ui.confirmDialog("Excluir tarefa?")) { core.taskRemove(del.dataset.tdel, window.currentUser()); ui.toast("Tarefa excluída"); renderTasks(root); } }
    });
  }

  window.renderTasks = renderTasks;
})();