(function () {
  function renderClients(root) {
    const clients = core.clientGetAll();
    root.innerHTML = `
      <div class="page-head">
        <h2 class="page-title">Clientes / Partes</h2>
        <button class="btn primary" id="client-add">${icon("plus")} Novo cliente</button>
      </div>
      <div class="card">
        <div class="toolbar">
          <input type="search" id="c-search" placeholder="Buscar por nome, CPF/CNPJ ou e-mail..." aria-label="Buscar cliente">
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Nome</th><th>CPF/CNPJ</th><th>E-mail</th><th>Telefone</th><th>Protocolos</th><th></th></tr></thead>
            <tbody id="c-tbody"></tbody>
          </table>
        </div>
      </div>`;

    const tbody = root.querySelector("#c-tbody");
    const search = root.querySelector("#c-search");
    function draw() {
      const q = search.value.toLowerCase().trim();
      const rows = clients.filter((c) => !q || `${c.nome} ${c.doc} ${c.email}`.toLowerCase().includes(q));
      if (!rows.length) { tbody.innerHTML = `<tr><td colspan="6"><div class="empty">Nenhum cliente.</div></td></tr>`; return; }
      tbody.innerHTML = rows.map((c) => {
        const n = core.protGetAll().filter((p) => p.clienteId === c.id).length;
        return `<tr>
          <td><strong>${esc(c.nome)}</strong></td>
          <td>${esc(c.doc || "-")}</td>
          <td>${esc(c.email || "-")}</td>
          <td>${esc(c.fone || "-")}</td>
          <td>${n}</td>
          <td><div class="row-actions">
            <button class="icon-btn" data-edit="${c.id}" title="Editar">${icon("edit")}</button>
            <button class="icon-btn" data-del="${c.id}" title="Excluir">${icon("trash")}</button>
          </div></td>
        </tr>`;
      }).join("");
    }
    draw();
    search.addEventListener("input", draw);

    root.querySelector("#client-add").addEventListener("click", () => clientModal(null));
    tbody.addEventListener("click", (e) => {
      const ed = e.target.closest("[data-edit]");
      const del = e.target.closest("[data-del]");
      if (ed) clientModal(clients.find((c) => c.id === ed.dataset.edit));
      if (del) {
        if (ui.confirmDialog("Excluir cliente?")) { core.clientRemove(del.dataset.del, window.currentUser()); renderClients(root); ui.toast("Cliente excluído"); }
      }
    });
  }

  function clientModal(existing) {
    const isNew = !existing;
    const c = existing || { nome: "", doc: "", email: "", fone: "" };
    ui.modal(`
      <h3>${isNew ? "Novo cliente" : "Editar cliente"}</h3>
      <form class="form-grid" id="client-form">
        <div class="form-field full"><label>Nome</label><input type="text" name="nome" value="${esc(c.nome)}" required></div>
        <div class="form-field"><label>CPF/CNPJ</label><input type="text" name="doc" value="${esc(c.doc)}"></div>
        <div class="form-field"><label>Telefone</label><input type="tel" name="fone" value="${esc(c.fone)}"></div>
        <div class="form-field full"><label>E-mail</label><input type="email" name="email" value="${esc(c.email)}"></div>
        <div class="form-field full actions"><button type="button" class="btn ghost" data-close>Cancelar</button><button type="submit" class="btn primary">Salvar</button></div>
      </form>`,
      (fd, close) => {
        try {
          core.clientUpsert({ id: isNew ? null : c.id, nome: fd.get("nome").trim(), doc: fd.get("doc").trim(), email: fd.get("email").trim(), fone: fd.get("fone").trim() }, window.currentUser());
          close(); renderClients(document.getElementById("view"));
          ui.toast(isNew ? "Cliente criado" : "Cliente atualizado");
        } catch (err) { ui.toast(err.message, "error"); }
      });
  }

  window.renderClients = renderClients;
})();