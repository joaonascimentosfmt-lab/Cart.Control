(function () {
  function renderEmails(root) {
    const emails = core.emailGetAll();
    const protos = core.protGetAll();

    root.innerHTML = `
      <div class="page-head">
        <h2 class="page-title">Central de E-mails</h2>
        <button class="btn primary" id="email-add">${icon("plus")} Registrar e-mail</button>
      </div>

      <div class="card">
        <div class="toolbar">
          <select id="e-cat">
            <option value="">Caixa de entrada</option>
            <option value="naolido">Não lidos</option>
            <option value="lido">Lidos</option>
            <option value="enviado">Enviados</option>
            <option value="favorito">Favoritos</option>
            <option value="arquivado">Arquivados</option>
            <option value="aguardando">Aguardando resposta</option>
          </select>
          <input type="search" id="e-search" placeholder="Buscar por assunto ou remetente..." aria-label="Buscar e-mail">
        </div>
        <div class="email-list" id="e-list"></div>
      </div>`;

    const list = root.querySelector("#e-list");
    const cat = root.querySelector("#e-cat");
    const search = root.querySelector("#e-search");

    function draw() {
      const q = search.value.toLowerCase().trim();
      const c = cat.value;
      const rows = emails.filter((e) => {
        if (q && !`${e.assunto} ${e.de} ${e.para}`.toLowerCase().includes(q)) return false;
        if (c === "naolido" && e.lido) return false;
        if (c === "lido" && !e.lido) return false;
        if (c === "enviado" && e.tipo !== "enviado") return false;
        if (c === "favorito" && !e.favorito) return false;
        if (c === "arquivado" && !e.arquivado) return false;
        if (c === "aguardando" && e.statusResposta !== "aguardando_resposta") return false;
        return true;
      }).sort((a, b) => (a.data < b.data ? 1 : -1));

      if (!rows.length) { list.innerHTML = `<div class="empty">Nenhum e-mail nesta categoria.</div>`; return; }
      list.innerHTML = rows.map((e) => {
        const proto = e.protocoloId ? protos.find((p) => p.id === e.protocoloId) : null;
        return `<div class="email-item ${!e.lido ? "unread" : ""}">
          <div class="head">
            <div>
              <div class="subject">${!e.lido ? "● " : ""}${esc(e.assunto)}</div>
              <div class="recipient">${esc(e.tipo === "recebido" ? "De: " + e.de : "Para: " + e.para)} · ${store.timeAgo(e.data)}</div>
            </div>
            <button class="icon-btn" data-edit="${e.id}" title="Editar">${icon("edit")}</button>
          </div>
          ${e.corpo ? `<div class="recipient">${esc(e.corpo)}</div>` : ""}
          <div class="foot">
            <span class="status-dot e-${e.statusResposta}">${emailStatusLabel(e.statusResposta)}</span>
            ${proto ? `<a class="dash-link" href="#/protocol/${proto.id}">Protocolo ${esc(proto.numero)}</a>` : `<span class="recipient">sem protocolo</span>`}
          </div>
          <div class="row-actions">
            ${!e.lido ? `<button class="btn small ghost" data-lido="${e.id}">${icon("check")} Marcar lido</button>` : ""}
            ${e.statusResposta !== "aguardando_resposta" ? `<button class="btn small ghost" data-resp="${e.id}">Aguardar resposta</button>` : `<button class="btn small ghost" data-resp2="${e.id}">Respondido</button>`}
            <button class="btn small ghost" data-vinc="${e.id}" title="Vincular a protocolo">${icon("link", "")} Vincular</button>
            <button class="icon-btn" data-del="${e.id}" title="Excluir">${icon("trash")}</button>
          </div>
        </div>`;
      }).join("");
    }
    draw();
    cat.addEventListener("change", draw);
    search.addEventListener("input", draw);

    root.querySelector("#email-add").addEventListener("click", () => emailModal(null));
    list.addEventListener("click", (e) => {
      const ed = e.target.closest("[data-edit]");
      const lido = e.target.closest("[data-lido]");
      const resp = e.target.closest("[data-resp]");
      const resp2 = e.target.closest("[data-resp2]");
      const vinc = e.target.closest("[data-vinc]");
      const del = e.target.closest("[data-del]");
      if (ed) emailModal(emails.find((x) => x.id === ed.dataset.edit));
      if (lido) { core.emailMarcarLido(lido.dataset.lido, window.currentUser()); renderEmails(root); }
      if (resp) { core.emailSetResposta(resp.dataset.resp, "aguardando_resposta", window.currentUser()); renderEmails(root); ui.toast("Marcado como aguardando resposta"); }
      if (resp2) { core.emailSetResposta(resp2.dataset.resp2, "respondido", window.currentUser()); renderEmails(root); ui.toast("Marcado como respondido"); }
      if (del) { if (ui.confirmDialog("Excluir e-mail?")) { db.remove("emails", del.dataset.del); renderEmails(root); } }
      if (vinc) vincModal(vinc.dataset.vinc);
    });
  }

  function vincModal(emailId) {
    const protos = core.protGetAll();
    const e = db.byId("emails", emailId);
    ui.modal(`
      <h3>Vincular e-mail a protocolo</h3>
      <form class="form-grid" id="vinc-form">
        <div class="form-field full">
          <label>Protocolo</label>
          <select name="protocoloId" required>
            <option value="">Selecione...</option>
            ${protos.map((p) => `<option value="${p.id}" ${p.id === e.protocoloId ? "selected" : ""}>${esc(p.numero)} · ${esc(p.clienteNome)}</option>`).join("")}
          </select>
        </div>
        <div class="form-field full actions"><button type="button" class="btn ghost" data-close>Cancelar</button><button type="submit" class="btn primary">Vincular</button></div>
      </form>`,
      (fd, close) => {
        db.update("emails", emailId, { protocoloId: fd.get("protocoloId") });
        db.audit(window.currentUser(), "vincular_email_protocolo", e.assunto, e.protocoloId, fd.get("protocoloId"));
        close(); renderEmails(document.getElementById("view"));
        ui.toast("E-mail vinculado ao protocolo");
      });
  }

  function emailModal(existing) {
    const isNew = !existing;
    const e = existing || { tipo: "recebido", de: "", para: "serventia@carto.com", assunto: "", corpo: "", data: nowISO(), protocoloId: "", statusResposta: "novo" };
    const protos = core.protGetAll();
    ui.modal(`
      <h3>${isNew ? "Registrar e-mail" : "Editar e-mail"}</h3>
      <form class="form-grid" id="email-form">
        <div class="form-field"><label>Tipo</label>
          <select name="tipo"><option value="recebido" ${e.tipo === "recebido" ? "selected" : ""}>Recebido</option><option value="enviado" ${e.tipo === "enviado" ? "selected" : ""}>Enviado</option></select>
        </div>
        <div class="form-field"><label>Status de resposta</label>
          <select name="statusResposta">
            <option value="novo" ${e.statusResposta === "novo" ? "selected" : ""}>Novo</option>
            <option value="lido" ${e.statusResposta === "lido" ? "selected" : ""}>Lido</option>
            <option value="em_analise" ${e.statusResposta === "em_analise" ? "selected" : ""}>Em análise</option>
            <option value="respondido" ${e.statusResposta === "respondido" ? "selected" : ""}>Respondido</option>
            <option value="aguardando_resposta" ${e.statusResposta === "aguardando_resposta" ? "selected" : ""}>Aguardando resposta</option>
          </select>
        </div>
        <div class="form-field"><label>De</label><input type="email" name="de" value="${esc(e.de)}"></div>
        <div class="form-field"><label>Para</label><input type="email" name="para" value="${esc(e.para)}"></div>
        <div class="form-field full"><label>Assunto</label><input type="text" name="assunto" value="${esc(e.assunto)}" required></div>
        <div class="form-field full"><label>Corpo</label><textarea name="corpo" rows="3">${esc(e.corpo)}</textarea></div>
        <div class="form-field full"><label>Protocolo vinculado</label>
          <select name="protocoloId"><option value="">—</option>${protos.map((p) => `<option value="${p.id}" ${p.id === e.protocoloId ? "selected" : ""}>${esc(p.numero)}</option>`).join("")}</select>
        </div>
        <div class="form-field full actions"><button type="button" class="btn ghost" data-close>Cancelar</button><button type="submit" class="btn primary">Salvar</button></div>
      </form>`,
      (fd, close) => {
        core.emailUpsert({
          id: isNew ? null : e.id,
          tipo: fd.get("tipo"), de: fd.get("de").trim(), para: fd.get("para").trim(),
          assunto: fd.get("assunto").trim(), corpo: fd.get("corpo").trim(),
          data: e.data || nowISO(), lido: !!e.lido, statusResposta: fd.get("statusResposta"),
          protocoloId: fd.get("protocoloId") || null,
        }, window.currentUser());
        close(); renderEmails(document.getElementById("view"));
        ui.toast("E-mail salvo");
      });
  }

  function emailStatusLabel(s) {
    return { novo: "Novo", lido: "Lido", em_analise: "Em análise", respondido: "Respondido", aguardando_resposta: "Aguardando resposta" }[s] || s;
  }

  window.renderEmails = renderEmails;
})();