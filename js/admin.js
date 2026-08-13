(function () {
  const PERFIS = [
    { v: "admin", l: "Administrador" },
    { v: "gestor", l: "Gestor" },
    { v: "funcionario", l: "Funcionário" },
    { v: "visualizacao", l: "Somente leitura" },
  ];
  const PERFIL_LABEL = Object.fromEntries(PERFIS.map((p) => [p.v, p.l]));

  const HASH_ADMIN = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9"; // admin123
  const HASH_FUNC = "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92"; // 123456

  function seedUsuarios() {
    if (window.core && window.core.protGetAll) window.core.protGetAll();
    const staff = store.get("funcionarios", []);
    const emp = (nome, email, perfil, senha) => ({ id: store.uid(), nome, email, perfil, ativo: true, senha });
    const defaults = [
      emp("Administrador", "admin@carto.com", "admin", HASH_ADMIN),
      ...staff.map((f) => emp(f.nome, f.email || "", f.cargo === "Tabelião" ? "gestor" : "funcionario", HASH_FUNC)),
    ];
    const existing = store.get("usuarios", []);
    if (!Array.isArray(existing) || existing.length === 0) {
      store.set("usuarios", defaults);
      return;
    }
    const porNome = new Map(existing.map((u) => [String(u.nome || "").trim().toLowerCase(), u]));
    const reconstruidos = [];
    staff.forEach((f) => {
      const chave = String(f.nome || "").trim().toLowerCase();
      const base = porNome.get(chave) || {};
      reconstruidos.push({
        id: base.id || "u" + f.id,
        nome: f.nome,
        email: f.email || "",
        perfil: f.cargo === "Tabelião" ? "gestor" : "funcionario",
        ativo: base.ativo !== undefined ? base.ativo : true,
        senha: HASH_FUNC,
      });
    });
    const adminOld = existing.find((u) => u.email === "admin@carto.com");
    const lista = [];
    if (adminOld) lista.push({ ...adminOld, perfil: "admin", senha: HASH_ADMIN });
    else lista.push(emp("Administrador", "admin@carto.com", "admin", HASH_ADMIN));
    const nomesStaff = new Set(staff.map((f) => String(f.nome || "").trim().toLowerCase()));
    existing.forEach((u) => {
      if (u.email === "admin@carto.com") return;
      const chave = String(u.nome || "").trim().toLowerCase();
      if (!nomesStaff.has(chave)) lista.push({ ...u, senha: u.perfil === "admin" ? HASH_ADMIN : HASH_FUNC });
    });
    lista.push(...reconstruidos);
    store.set("usuarios", lista);
  }

  function renderStaff(root) {
    const funcs = store.get("funcionarios", []);
    const deps = db.all("departments");
    root.innerHTML = `
      <h2 class="page-title">Funcionários e Setores</h2>

      <div class="card">
        <div class="card-head"><h2>Setores</h2><button class="btn primary small" id="add-setor">${icon("plus")} Novo setor</button></div>
        <ul class="list" id="setores-list">
          ${deps.map((s) => `<li class="list-item"><span>${esc(s.nome)}</span><div class="row-actions">
            <button class="icon-btn" data-esetor="${s.id}">${icon("edit")}</button>
            <button class="icon-btn" data-dsetor="${s.id}">${icon("trash")}</button></div></li>`).join("")}
        </ul>
      </div>

      <div class="card">
        <div class="card-head"><h2>Funcionários</h2><button class="btn primary small" id="add-func">${icon("plus")} Novo funcionário</button></div>
        <ul class="list" id="funcs-list">
          ${funcs.length === 0 ? `<div class="empty">Nenhum funcionário.</div>` : funcs.map((f) => {
            const s = deps.find((d) => d.id === f.setor);
            const prod = window.core.prodFuncionario().find((r) => r.f.id === f.id);
            return `<li class="list-item">
              <div>
                <div class="who">${esc(f.nome)} <span class="pill pill-sm">${esc(f.cargo)}</span></div>
                <div class="detail">${esc(s ? s.nome : "-")}${prod ? " · Produtividade " + prod.indiceProdutividade + "%" : ""}</div>
              </div>
              <div class="row-actions">
                <button class="icon-btn" data-efunc="${f.id}">${icon("edit")}</button>
                <button class="icon-btn" data-dfunc="${f.id}">${icon("trash")}</button>
              </div>
            </li>`;
          }).join("")}
        </ul>
      </div>

      <div class="card"><h2>Produtividade por setor</h2><div id="setor-prod"></div></div>`;

    root.querySelector("#add-setor").addEventListener("click", () => setorModal(null));
    root.querySelector("#add-func").addEventListener("click", () => funcModal(null));
    root.querySelector("#setores-list").addEventListener("click", (e) => {
      const ed = e.target.closest("[data-esetor]");
      const del = e.target.closest("[data-dsetor]");
      if (ed) setorModal(deps.find((d) => d.id === ed.dataset.esetor));
      if (del && ui.confirmDialog("Excluir setor?")) {
        db.remove("departments", del.dataset.dsetor);
        db.write("funcionarios", store.get("funcionarios", [])); renderStaff(root);
        ui.toast("Setor excluído");
      }
    });
    root.querySelector("#funcs-list").addEventListener("click", (e) => {
      const ed = e.target.closest("[data-efunc]");
      const del = e.target.closest("[data-dfunc]");
      if (ed) funcModal(funcs.find((f) => f.id === ed.dataset.efunc));
      if (del && ui.confirmDialog("Excluir funcionário?")) {
        store.set("funcionarios", funcs.filter((f) => f.id !== del.dataset.dfunc));
        ui.toast("Funcionário excluído"); renderStaff(root);
      }
    });

    const setorProd = core.prodSetor();
    root.querySelector("#setor-prod").innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Setor</th><th>Funcionários</th><th>Protocolos</th><th>Concluídos</th><th>Atrasados</th></tr></thead>
      <tbody>${setorProd.map((r) => `<tr><td><strong>${esc(r.d.nome)}</strong></td><td>${r.funcionarios}</td><td>${r.protocolos}</td><td>${r.concluidos}</td><td>${r.atrasados}</td></tr>`).join("")}</tbody>
    </table></div>`;
  }

  function setorModal(existing) {
    const isNew = !existing;
    const s = existing || { nome: "" };
    ui.modal(`
      <h3>${isNew ? "Novo setor" : "Editar setor"}</h3>
      <form class="form-grid" id="setor-form">
        <div class="form-field full"><label>Nome</label><input type="text" name="nome" value="${esc(s.nome)}" required></div>
        <div class="form-field full actions"><button type="button" class="btn ghost" data-close>Cancelar</button><button type="submit" class="btn primary">Salvar</button></div>
      </form>`,
      (fd, close) => {
        if (isNew) { db.insert("departments", { id: store.uid(), nome: fd.get("nome").trim() }); db.audit(window.currentUser(), "criar_setor", fd.get("nome"), null, null); }
        else { db.update("departments", s.id, { nome: fd.get("nome").trim() }); db.audit(window.currentUser(), "editar_setor", fd.get("nome"), null, null); }
        close(); renderStaff(document.getElementById("view")); ui.toast("Setor salvo");
      });
  }

  function funcModal(existing) {
    const isNew = !existing;
    const f = existing || { nome: "", cargo: "", setor: "", email: "" };
    const deps = db.all("departments");
    ui.modal(`
      <h3>${isNew ? "Novo funcionário" : "Editar funcionário"}</h3>
      <form class="form-grid" id="func-form">
        <div class="form-field full"><label>Nome</label><input type="text" name="nome" value="${esc(f.nome)}" required></div>
        <div class="form-field"><label>Cargo</label><input type="text" name="cargo" value="${esc(f.cargo)}" required></div>
        <div class="form-field"><label>Setor</label><select name="setor"><option value="">—</option>${deps.map((d) => `<option value="${d.id}" ${d.id === f.setor ? "selected" : ""}>${esc(d.nome)}</option>`).join("")}</select></div>
        <div class="form-field full"><label>E-mail</label><input type="email" name="email" value="${esc(f.email)}"></div>
        <div class="form-field full actions"><button type="button" class="btn ghost" data-close>Cancelar</button><button type="submit" class="btn primary">Salvar</button></div>
      </form>`,
      (fd, close) => {
        const rec = { id: f.id || store.uid(), nome: fd.get("nome").trim(), cargo: fd.get("cargo").trim(), setor: fd.get("setor") || null, email: fd.get("email").trim(), status: "ativo" };
        const all = store.get("funcionarios", []);
        const idx = all.findIndex((x) => x.id === rec.id);
        if (idx >= 0) all[idx] = rec; else all.push(rec);
        store.set("funcionarios", all);
        db.audit(window.currentUser(), isNew ? "criar_funcionario" : "editar_funcionario", rec.nome, null, null);
        close(); renderStaff(document.getElementById("view")); ui.toast("Funcionário salvo");
      });
  }

  function renderSettings(root) {
    seedUsuarios();
    const usuarios = store.get("usuarios", []);
    const cfg = store.get("config", { nome: "Cartório Modelo", diasUteis: ["1", "2", "3", "4", "5"], feriados: [] });
    root.innerHTML = `
      <h2 class="page-title">Configurações</h2>

      <div class="card">
        <h2>Cartório</h2>
        <form class="form-grid" id="cfg-form">
          <div class="form-field full"><label>Nome do cartório</label><input type="text" name="nome" value="${esc(cfg.nome)}" required></div>
          <div class="form-field full"><label>Dias de expediente</label>
            <div class="chips">
              ${["1|Seg", "2|Ter", "3|Qua", "4|Qui", "5|Sex", "6|Sáb", "0|Dom"].map((p) => { const [v, l] = p.split("|"); const on = cfg.diasUteis.includes(v); return `<label><input type="checkbox" name="dia" value="${v}" ${on ? "checked" : ""}> ${l}</label>`; }).join("")}
            </div>
          </div>
          <div class="form-field full actions"><button type="submit" class="btn primary">Salvar</button></div>
        </form>
      </div>

      <div class="card">
        <div class="card-head"><h2>Usuários e permissões</h2><button class="btn primary small" id="user-add">${icon("plus")} Novo usuário</button></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th></th></tr></thead>
            <tbody id="user-tbody"></tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <h2>Perfis e permissões</h2>
        <div class="perm-grid">
          ${PERFIS.map((p) => `
            <div class="perm-card">
              <strong>${p.l}</strong>
              <div class="detail">
                ${p.v === "admin" ? "Acesso total: todos os módulos, auditoria e configurações."
                : p.v === "gestor" ? "Todos os protocolos, tarefas, relatórios e acompanhamento."
                : p.v === "funcionario" ? "Protocolos/tarefas atribuídos, própria agenda e e-mails permitidos."
                : "Somente leitura em módulos liberados."}
              </div>
            </div>`).join("")}
        </div>
      </div>`;

    root.querySelector("#cfg-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const dias = fd.getAll("dia");
      store.set("config", { ...cfg, nome: fd.get("nome").trim(), diasUteis: dias });
      store.set("serventia_nome", fd.get("nome").trim());
      db.audit(window.currentUser(), "configuracao", "cartorio", null, fd.get("nome"));
      ui.toast("Configurações salvas");
    });

    const tbody = root.querySelector("#user-tbody");
    tbody.innerHTML = usuarios.map((u) => `<tr>
      <td><strong>${esc(u.nome)}</strong></td>
      <td>${esc(u.email)}</td>
      <td>${PERFIL_LABEL[u.perfil] || u.perfil}</td>
      <td><span class="badge ${u.ativo ? "ok" : "st-cancelado"}">${u.ativo ? "Ativo" : "Bloqueado"}</span></td>
      <td><div class="row-actions">
        <button class="icon-btn" data-uedit="${u.id}">${icon("edit")}</button>
        <button class="icon-btn" data-ublock="${u.id}">${u.ativo ? icon("alert") : icon("check")}</button>
      </div></td>
    </tr>`).join("");

    root.querySelector("#user-add").addEventListener("click", () => userModal(null));
    tbody.addEventListener("click", (e) => {
      const ed = e.target.closest("[data-uedit]");
      const bl = e.target.closest("[data-ublock]");
      if (ed) userModal(usuarios.find((u) => u.id === ed.dataset.uedit));
      if (bl) {
        const u = usuarios.find((x) => x.id === bl.dataset.ublock);
        u.ativo = !u.ativo;
        store.set("usuarios", usuarios);
        db.audit(window.currentUser(), u.ativo ? "desbloquear_usuario" : "bloquear_usuario", u.nome, null, null);
        renderSettings(root);
      }
    });
  }

  function userModal(existing) {
    const isNew = !existing;
    const u = existing || { nome: "", email: "", perfil: "funcionario", ativo: true, senha: "" };
    ui.modal(`
      <h3>${isNew ? "Novo usuário" : "Editar usuário"}</h3>
      <form class="form-grid" id="user-form">
        <div class="form-field full"><label>Nome</label><input type="text" name="nome" value="${esc(u.nome)}" required></div>
        <div class="form-field full"><label>E-mail</label><input type="email" name="email" value="${esc(u.email)}" required></div>
        <div class="form-field full"><label>Perfil</label><select name="perfil">${PERFIS.map((p) => `<option value="${p.v}" ${p.v === u.perfil ? "selected" : ""}>${p.l}</option>`).join("")}</select></div>
        <div class="form-field full"><label>Senha</label><input type="password" name="senha" ${isNew ? "required" : ""} placeholder="${isNew ? "Defina uma senha" : "Deixe em branco para manter a atual"}" autocomplete="new-password"></div>
        <div class="form-field full actions"><button type="button" class="btn ghost" data-close>Cancelar</button><button type="submit" class="btn primary">Salvar</button></div>
      </form>`,
      (fd, close) => {
        const senha = fd.get("senha").toString();
        const rec = { id: u.id || store.uid(), nome: fd.get("nome").trim(), email: fd.get("email").trim(), perfil: fd.get("perfil"), ativo: u.ativo !== undefined ? u.ativo : true };
        const all = store.get("usuarios", []);
        const idx = all.findIndex((x) => x.id === rec.id);
        const save = (novo) => {
          if (idx >= 0) all[idx] = novo; else all.push(novo);
          store.set("usuarios", all);
          db.audit(window.currentUser(), isNew ? "criar_usuario" : "editar_usuario", rec.nome, null, rec.perfil);
          close(); renderSettings(document.getElementById("view")); ui.toast("Usuário salvo");
        };
        if (senha) {
          sha256hex(senha).then((hash) => save({ ...rec, senha: hash }));
        } else {
          const prev = idx >= 0 ? all[idx] : null;
          save(prev ? { ...rec, senha: prev.senha } : rec);
        }
      });
  }

  window.renderStaff = renderStaff;
  window.renderSettings = renderSettings;
  window.seedUsuarios = seedUsuarios;
  window.PERFIL_LABEL = PERFIL_LABEL;
})();