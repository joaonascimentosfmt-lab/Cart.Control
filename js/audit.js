(function () {
  function renderAudit(root) {
    const audit = db.all("audit").slice().sort((a, b) => (a.at < b.at ? 1 : -1));
    root.innerHTML = `
      <h2 class="page-title">Auditoria do sistema</h2>
      <div class="card">
        <div class="toolbar">
          <input type="search" id="audit-search" placeholder="Buscar usuário, ação ou alvo..." aria-label="Buscar auditoria">
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Data/Hora</th><th>Usuário</th><th>Ação</th><th>Alvo</th><th>De</th><th>Para</th></tr></thead>
            <tbody id="audit-tbody"></tbody>
          </table>
        </div>
      </div>`;

    const tbody = root.querySelector("#audit-tbody");
    const search = root.querySelector("#audit-search");
    function draw() {
      const q = search.value.toLowerCase().trim();
      const rows = audit.filter((a) => !q || `${a.user} ${a.action} ${a.target}`.toLowerCase().includes(q));
      if (!rows.length) { tbody.innerHTML = `<tr><td colspan="6"><div class="empty">Nenhum registro.</div></td></tr>`; return; }
      tbody.innerHTML = rows.slice(0, 200).map((a) => `
        <tr>
          <td>${new Date(a.at).toLocaleString("pt-BR")}</td>
          <td>${esc(a.user)}</td>
          <td>${esc(a.action)}</td>
          <td>${esc(a.target || "-")}</td>
          <td>${esc(a.from || "-")}</td>
          <td>${esc(a.to || "-")}</td>
        </tr>`).join("");
    }
    draw();
    search.addEventListener("input", draw);
  }

  window.renderAudit = renderAudit;
})();