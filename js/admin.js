(function () {
  function seed() {
    if (store.get("admin_seeded", false)) return;
    const setores = [
      { id: store.uid(), nome: "Protocolo" },
      { id: store.uid(), nome: "Registros Gerais" },
      { id: store.uid(), nome: "Tabelionato" },
    ];
    const funcs = [
      { id: store.uid(), nome: "Tabelião A", setor: setores[2].id, cargo: "Tabelião" },
      { id: store.uid(), nome: "Escrevente B", setor: setores[0].id, cargo: "Escrevente" },
      { id: store.uid(), nome: "Escrevente C", setor: setores[1].id, cargo: "Escrevente" },
    ];
    store.set("setores", setores);
    store.set("funcionarios", funcs);
    store.set("admin_seeded", true);
  }

  function getSetores() {
    seed();
    return store.get("setores", []);
  }

  function getFuncionarios() {
    seed();
    return store.get("funcionarios", []);
  }

  function upsertFuncionario(f) {
    const all = getFuncionarios();
    const idx = all.findIndex((x) => x.id === f.id);
    if (idx >= 0) all[idx] = f;
    else all.push(f);
    store.set("funcionarios", all);
  }

  function removeFuncionario(id) {
    store.set("funcionarios", getFuncionarios().filter((x) => x.id !== id));
  }

  function upsertSetor(s) {
    const all = getSetores();
    const idx = all.findIndex((x) => x.id === s.id);
    if (idx >= 0) all[idx] = s;
    else all.push(s);
    store.set("setores", all);
  }

  function removeSetor(id) {
    store.set("setores", getSetores().filter((x) => x.id !== id));
  }

  function setorNome(id) {
    const s = getSetores().find((x) => x.id === id);
    return s ? s.nome : "-";
  }

  function renderAdmin(root) {
    const setores = getSetores();
    const funcs = getFuncionarios();
    root.innerHTML = `
      <h2 class="page-title">Gestão — Funcionários e Setores</h2>

      <div class="card">
        <div class="card-head">
          <h2>Setores</h2>
          <button class="btn primary small" id="add-setor">${icon("plus")} Novo setor</button>
        </div>
        <ul class="list" id="setores-list">
          ${setores.map((s) => `
            <li class="list-item">
              <span>${esc(s.nome)}</span>
              <div class="row-actions">
                <button class="icon-btn" data-esetor="${s.id}" title="Editar">${icon("edit")}</button>
                <button class="icon-btn" data-dsetor="${s.id}" title="Excluir">${icon("trash")}</button>
              </div>
            </li>`).join("")}
        </ul>
      </div>

      <div class="card">
        <div class="card-head">
          <h2>Funcionários</h2>
          <button class="btn primary small" id="add-func">${icon("plus")} Novo funcionário</button>
        </div>
        <ul class="list" id="funcs-list">
          ${funcs.map((f) => `
            <li class="list-item">
              <div>
                <div class="who">${esc(f.nome)}</div>
                <div class="detail">${esc(f.cargo)} &middot; ${esc(setorNome(f.setor))}</div>
              </div>
              <div class="row-actions">
                <button class="icon-btn" data-efunc="${f.id}" title="Editar">${icon("edit")}</button>
                <button class="icon-btn" data-dfunc="${f.id}" title="Excluir">${icon("trash")}</button>
              </div>
            </li>`).join("")}
        </ul>
      </div>

      <div class="card">
        <div class="card-head">
          <h2>Relatório de performance</h2>
        </div>
        <div id="report"></div>
      </div>`;

    root.querySelector("#add-setor").addEventListener("click", () => setorModal(null));
    root.querySelector("#add-func").addEventListener("click", () => funcModal(null));

    root.querySelector("#setores-list").addEventListener("click", (e) => {
      const ed = e.target.closest("[data-esetor]");
      const del = e.target.closest("[data-dsetor]");
      if (ed) setorModal(setores.find((s) => s.id === ed.dataset.esetor));
      if (del) {
        if (confirm("Excluir este setor?")) {
          removeSetor(del.dataset.dsetor);
          renderAdmin(root);
          toast("Setor excluído");
        }
      }
    });

    root.querySelector("#funcs-list").addEventListener("click", (e) => {
      const ed = e.target.closest("[data-efunc]");
      const del = e.target.closest("[data-dfunc]");
      if (ed) funcModal(funcs.find((f) => f.id === ed.dataset.efunc));
      if (del) {
        if (confirm("Excluir este funcionário?")) {
          removeFuncionario(del.dataset.dfunc);
          renderAdmin(root);
          toast("Funcionário excluído");
        }
      }
    });

    renderReports(root);
  }

  function renderReports(root) {
    const funcs = getFuncionarios();
    const setores = getSetores();
    const planilhas = window.getAllPlanilha ? window.getAllPlanilha() : [];
    const agendas = window.getAllAgenda ? window.getAllAgenda() : [];
    const emails = window.getAllEmail ? window.getAllEmail() : [];

    const byFunc = funcs.map((f) => {
      const protos = planilhas.filter((p) => (p.responsavel || "").toLowerCase() === f.nome.toLowerCase());
      const concluidos = protos.filter((p) => p.status === "finalizado").length;
      const ativos = protos.length - concluidos;
      const atendimentos = agendas.filter((a) => a.status === "concluido" && (a.name || "").toLowerCase().includes(f.nome.toLowerCase())).length;
      return { f, protos: protos.length, concluidos, ativos, atendimentos };
    });

    const bySetor = setores.map((s) => {
      const sFuncs = funcs.filter((f) => f.setor === s.id);
      const protos = planilhas.filter((p) => sFuncs.some((f) => (p.responsavel || "").toLowerCase() === f.nome.toLowerCase()));
      const concluidos = protos.filter((p) => p.status === "finalizado").length;
      return { s, funcionarios: sFuncs.length, protos: protos.length, concluidos };
    });

    root.querySelector("#report").innerHTML = `
      <h3 class="sub">Por funcionário</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Funcionário</th><th>Setor</th><th>Protocolos</th><th>Finalizados</th><th>Ativos</th><th>Atendimentos</th></tr></thead>
          <tbody>
            ${byFunc.map((r) => `
              <tr>
                <td><strong>${esc(r.f.nome)}</strong></td>
                <td>${esc(setorNome(r.f.setor))}</td>
                <td>${r.protos}</td>
                <td>${r.concluidos}</td>
                <td>${r.ativos}</td>
                <td>${r.atendimentos}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>

      <h3 class="sub">Por setor</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Setor</th><th>Funcionários</th><th>Protocolos</th><th>Finalizados</th></tr></thead>
          <tbody>
            ${bySetor.map((r) => `
              <tr>
                <td><strong>${esc(r.s.nome)}</strong></td>
                <td>${r.funcionarios}</td>
                <td>${r.protos}</td>
                <td>${r.concluidos}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
  }

  function setorModal(existing) {
    const s = existing || { id: store.uid(), nome: "" };
    const isNew = !existing;
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>${isNew ? "Novo setor" : "Editar setor"}</h3>
        <form class="form-grid" id="setor-form">
          <input type="hidden" name="id" value="${s.id}">
          <div class="form-field full">
            <label>Nome do setor</label>
            <input type="text" name="nome" value="${esc(s.nome)}" required>
          </div>
          <div class="form-field full actions">
            <button type="button" class="btn ghost" data-close>Cancelar</button>
            <button type="submit" class="btn primary">Salvar</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
    backdrop.querySelector("[data-close]").addEventListener("click", close);
    backdrop.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const nome = fd.get("nome").trim();
      if (!nome) return;
      upsertSetor({ id: fd.get("id"), nome });
      close();
      renderAdmin(document.getElementById("view"));
      toast("Setor salvo");
    });
  }

  function funcModal(existing) {
    const f = existing || { id: store.uid(), nome: "", setor: "", cargo: "" };
    const isNew = !existing;
    const setores = getSetores();
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>${isNew ? "Novo funcionário" : "Editar funcionário"}</h3>
        <form class="form-grid" id="func-form">
          <input type="hidden" name="id" value="${f.id}">
          <div class="form-field full">
            <label>Nome</label>
            <input type="text" name="nome" value="${esc(f.nome)}" required>
          </div>
          <div class="form-field">
            <label>Cargo</label>
            <input type="text" name="cargo" value="${esc(f.cargo)}" required>
          </div>
          <div class="form-field">
            <label>Setor</label>
            <select name="setor" required>
              <option value="">Selecione...</option>
              ${setores.map((s) => `<option value="${s.id}" ${s.id === f.setor ? "selected" : ""}>${esc(s.nome)}</option>`).join("")}
            </select>
          </div>
          <div class="form-field full actions">
            <button type="button" class="btn ghost" data-close>Cancelar</button>
            <button type="submit" class="btn primary">Salvar</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
    backdrop.querySelector("[data-close]").addEventListener("click", close);
    backdrop.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const nome = fd.get("nome").trim();
      const cargo = fd.get("cargo").trim();
      const setor = fd.get("setor");
      if (!nome || !cargo || !setor) return;
      upsertFuncionario({ id: fd.get("id"), nome, cargo, setor });
      close();
      renderAdmin(document.getElementById("view"));
      toast("Funcionário salvo");
    });
  }

  window.renderAdmin = renderAdmin;
})();