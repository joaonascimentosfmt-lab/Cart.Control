(function () {
  const DEFAULT_ALERT_HOURS = 48;
  const STATUS = ["enviado", "aberto", "respondido"];
  const STATUS_LABEL = { enviado: "Sem abertura", aberto: "Aberto", respondido: "Respondido" };

  function getAlertHours() {
    const v = Number(store.get("email_alert_hours", DEFAULT_ALERT_HOURS));
    return Number.isFinite(v) && v > 0 ? v : DEFAULT_ALERT_HOURS;
  }

  function toLocalInput(iso) {
    const d = store.parseISO(iso);
    if (!d) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function seed() {
    if (store.get("email_seeded", false)) return;
    const data = [
      { to: "maria.silva@exemplo.com", subject: "Notificação de protesto nº 2026/012", sentAt: store.hoursFromNow(-26), status: "enviado", obs: "" },
      { to: "joao.souza@exemplo.com", subject: "Confirmação de assinatura de escritura", sentAt: store.hoursFromNow(-2), status: "enviado", obs: "Aguardando abertura" },
      { to: "ana.pereira@exemplo.com", subject: "Certidão pronta para retirada", sentAt: store.hoursFromNow(-72), status: "aberto", obs: "" },
      { to: "carlos.lima@exemplo.com", subject: "Renovação de procuração", sentAt: store.hoursFromNow(-50), status: "enviado", obs: "" },
      { to: "advocacia.santos@exemplo.com", subject: "Ofício respondido — escritura 2026/014", sentAt: store.hoursFromNow(-8), status: "respondido", obs: "Parte respondeu" },
    ];
    store.set("emails", data.map((e) => ({ id: store.uid(), ...e })));
    store.set("email_seeded", true);
  }

  function getAll() {
    seed();
    return store.get("emails", []);
  }

  function upsert(record) {
    const all = getAll();
    const idx = all.findIndex((a) => a.id === record.id);
    if (idx >= 0) all[idx] = record;
    else all.push(record);
    store.set("emails", all);
  }

  function remove(id) {
    store.set("emails", getAll().filter((a) => a.id !== id));
  }

  function setStatus(id, status) {
    const all = getAll();
    const idx = all.findIndex((a) => a.id === id);
    if (idx >= 0) {
      all[idx].status = status;
      store.set("emails", all);
    }
  }

  function isAlert(e) {
    if (e.status !== "enviado") return false;
    const sent = store.parseISO(e.sentAt);
    if (!sent) return false;
    return (Date.now() - sent.getTime()) > getAlertHours() * 3600 * 1000;
  }

  function renderEmail(root) {
    const all = getAll();
    const alertHours = getAlertHours();
    const alerts = all.filter(isAlert);
    const unopened = all.filter((e) => e.status === "enviado");

    root.innerHTML = `
    <h2 class="page-title">Monitoramento de E-mails</h2>
    <div class="stats">
      <div class="stat info"><div class="value">${all.length}</div><div class="label">Total de e-mails</div></div>
      <div class="stat warn"><div class="value">${unopened.length}</div><div class="label">Sem abertura</div></div>
      <div class="stat bad"><div class="value">${alerts.length}</div><div class="label">Não abertos (alertas)</div></div>
      <div class="stat ok"><div class="value">${all.filter(e => e.status === "respondido").length}</div><div class="label">Respondidos</div></div>
    </div>

    ${alerts.length > 0
      ? `<div class="alert-banner">${icon("alert")} ${alerts.length} e-mail(s) sem abertura há mais de ${alertHours} horas.<span>Pode ter passado despercebido — verifique abaixo e considere reenviar ou contato por telefone.</span></div>`
      : ""}

    <div class="card">
      <div class="toolbar">
        <label class="toolbar-label">Alerta após
          <input type="number" id="email-alert-hours" min="1" value="${alertHours}" aria-label="Horas para alerta de não abertura"> h sem abertura
        </label>
        <button class="btn primary" id="email-add">${icon("plus")} Registrar e-mail enviado</button>
      </div>
      <div class="email-list" id="email-list"></div>
    </div>`;

    const list = root.querySelector("#email-list");
    function draw() {
      const sorted = [...all].sort((a, b) => b.sentAt.localeCompare(a.sentAt));
      if (sorted.length === 0) {
        list.innerHTML = `<div class="empty"><span class="big">${icon("mail")}</span>Nenhum e-mail registrado.</div>`;
        return;
      }
      list.innerHTML = sorted.map((e) => {
        const alert = isAlert(e);
        const cls = alert ? "sent alert" : e.status;
        const timeAgo = store.timeAgo(e.sentAt);
        return `
        <div class="email-item ${alert ? "alert" : ""}" data-id="${e.id}">
          <div class="head">
            <div>
              <div class="subject">${esc(e.subject)}</div>
              <div class="recipient">Para: ${esc(e.to)}</div>
            </div>
            <button class="icon-btn" data-edit="${e.id}" title="Editar">${icon("edit")}</button>
          </div>
          ${e.obs ? `<div class="recipient">${esc(e.obs)}</div>` : ""}
          <div class="foot">
            <span class="status-dot ${cls}">
              ${alert ? `${icon("alert")} Não aberto há ${timeAgo}` : STATUS_LABEL[e.status]}
            </span>
            <span>Enviado ${formatDate(e.sentAt.slice(0, 10))} (${timeAgo})</span>
          </div>
          <div class="row-actions">
            <button class="btn small ghost" data-open="${e.id}" ${e.status !== "enviado" ? "disabled" : ""}>Marcar aberto</button>
            <button class="btn small ghost" data-answered="${e.id}" ${e.status === "respondido" ? "disabled" : ""}>Marcar respondido</button>
            <button class="btn small danger" data-del="${e.id}">Excluir</button>
          </div>
        </div>`;
      }).join("");
    }
    draw();

    root.querySelector("#email-add").addEventListener("click", () => showModal(null));
    root.querySelector("#email-alert-hours").addEventListener("change", (e) => {
      const v = Number(e.target.value);
      if (!Number.isFinite(v) || v <= 0) {
        e.target.value = getAlertHours();
        return;
      }
      store.set("email_alert_hours", v);
      renderEmail(root);
      toast("Período de alerta atualizado");
    });
    list.addEventListener("click", (e) => {
      const edit = e.target.closest("[data-edit]");
      const open = e.target.closest("[data-open]");
      const answered = e.target.closest("[data-answered]");
      const del = e.target.closest("[data-del]");
      if (edit) showModal(all.find((x) => x.id === edit.dataset.edit));
      if (open) { setStatus(open.dataset.open, "aberto"); renderEmail(root); toast("Marcado como aberto"); }
      if (answered) { setStatus(answered.dataset.answered, "respondido"); renderEmail(root); toast("Marcado como respondido"); }
      if (del) {
        if (confirm("Excluir este e-mail?")) {
          remove(del.dataset.del);
          renderEmail(root);
          toast("E-mail excluído");
        }
      }
    });
  }

  function showModal(existing) {
    const e = existing || { id: store.uid(), to: "", subject: "", sentAt: store.hoursFromNow(-1), status: "enviado", obs: "" };
    const isNew = !existing;
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <h3>${isNew ? "Registrar e-mail enviado" : "Editar e-mail"}</h3>
      <form class="form-grid" id="email-form">
        <input type="hidden" name="id" value="${e.id}">
        <div class="form-field full">
          <label>Destinatário</label>
          <input type="email" name="to" value="${esc(e.to)}" required placeholder="email@exemplo.com">
        </div>
        <div class="form-field full">
          <label>Assunto</label>
          <input type="text" name="subject" value="${esc(e.subject)}" required>
        </div>
        <div class="form-field">
          <label>Data e hora de envio</label>
          <input type="datetime-local" name="sentAt" value="${toLocalInput(e.sentAt)}" required>
        </div>
        <div class="form-field">
          <label>Status</label>
          <select name="status">
            ${STATUS.map((s) => `<option value="${s}" ${s === e.status ? "selected" : ""}>${STATUS_LABEL[s]}</option>`).join("")}
          </select>
        </div>
        <div class="form-field full">
          <label>Observações</label>
          <textarea name="obs" rows="2">${esc(e.obs)}</textarea>
        </div>
        <div class="form-field full actions">
          <button type="button" class="btn ghost" data-close>Cancelar</button>
          <button type="submit" class="btn primary">Salvar</button>
        </div>
      </form>
    </div>`;
    document.body.appendChild(backdrop);

    const close = () => backdrop.remove();
    backdrop.addEventListener("click", (ev) => { if (ev.target === backdrop) close(); });
    backdrop.querySelector("[data-close]").addEventListener("click", close);

    backdrop.querySelector("form").addEventListener("submit", (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const record = {
        id: fd.get("id"),
        to: fd.get("to").trim(),
        subject: fd.get("subject").trim(),
        sentAt: new Date(fd.get("sentAt")).toISOString(),
        status: fd.get("status"),
        obs: fd.get("obs").trim(),
      };
      if (!record.to || !record.subject) return;
      upsert(record);
      close();
      renderEmail(document.getElementById("view"));
      toast("E-mail salvo");
    });
  }

  window.renderEmail = renderEmail;
})();