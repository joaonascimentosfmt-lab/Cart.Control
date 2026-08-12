(function () {
  function toast(msg, type) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.className = "toast show" + (type ? " " + type : "");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.className = "toast"; }, 2800);
  }

  function confirmDialog(msg) {
    return window.confirm(msg);
  }

  function modal(html, onOK) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
    const form = backdrop.querySelector("form");
    if (form) {
      backdrop.querySelector("[data-close]").addEventListener("click", close);
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        onOK(fd, close);
      });
    } else if (backdrop.querySelector("[data-close]")) {
      backdrop.querySelector("[data-close]").addEventListener("click", close);
    }
    return { backdrop, close };
  }

  function fieldError(input, ok) {
    if (ok) input.classList.remove("is-error");
    else input.classList.add("is-error");
  }

  function renderNotifications() {
    const list = core.notifGetAll();
    const panel = document.getElementById("notif-panel");
    const count = document.getElementById("notif-count");
    const naoLidas = list.filter((n) => !n.lida).length;
    if (count) {
      count.hidden = naoLidas === 0;
      count.textContent = naoLidas > 99 ? "99+" : naoLidas;
    }
    if (panel) {
      panel.innerHTML = `
        <div class="notif-head"><strong>Notificações</strong><button class="btn small ghost" id="notif-close">Fechar</button></div>
        <div class="notif-list">
          ${list.length === 0 ? `<div class="empty">Sem notificações.</div>`
            : list.slice(0, 40).map((n) => `
              <div class="notif-item ${n.lida ? "" : "unread"} ${n.nivel}">
                <div class="notif-msg">${esc(n.msg)}</div>
                <div class="notif-time">${store.timeAgo(n.data)}</div>
              </div>`).join("")}
        </div>
        <button class="btn small block" id="notif-markall">Marcar todas como lidas</button>`;
      const btn = document.getElementById("bell-btn");
      if (btn) {
        btn.addEventListener("click", () => {
          panel.hidden = !panel.hidden;
        });
      }
      panel.querySelector("#notif-close").addEventListener("click", () => { panel.hidden = true; });
      panel.querySelector("#notif-markall").addEventListener("click", () => {
        list.forEach((n) => core.notifMarcarLida(n.id));
        renderNotifications();
      });
    }
  }

  function setupSearch() {
    const input = document.getElementById("global-search");
    const box = document.getElementById("search-results");
    if (!input) return;
    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      if (q.length < 2) { box.hidden = true; return; }
      const protos = core.protGetAll().filter((p) =>
        (p.numero || "").toLowerCase().includes(q) ||
        (p.clienteNome || "").toLowerCase().includes(q) ||
        (p.clienteDoc || "").toLowerCase().includes(q) ||
        (p.tipoAto || "").toLowerCase().includes(q));
      const clients = core.clientGetAll().filter((c) =>
        (c.nome || "").toLowerCase().includes(q) ||
        (c.doc || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q));
      const tasks = core.taskGetAll().filter((t) => (t.titulo || "").toLowerCase().includes(q));
      box.innerHTML = `
        <div class="search-section"><strong>Protocolos</strong>
          ${protos.length ? protos.slice(0, 6).map((p) => `<a class="search-item" href="#/protocol/${p.id}"><span class="num">${esc(p.numero)}</span> ${esc(p.clienteNome)} · ${esc(p.tipoAto)}</a>`).join("") : "<div class='empty small'>Nada</div>"}
        </div>
        <div class="search-section"><strong>Clientes</strong>
          ${clients.length ? clients.slice(0, 6).map((c) => `<a class="search-item" href="#/clients"><span class="num">${esc(c.nome)}</span> ${esc(c.doc)}</a>`).join("") : "<div class='empty small'>Nada</div>"}
        </div>
        <div class="search-section"><strong>Tarefas</strong>
          ${tasks.length ? tasks.slice(0, 6).map((t) => `<a class="search-item" href="#/tasks"><span class="num">#${t.id.slice(0, 6)}</span> ${esc(t.titulo)}</a>`).join("") : "<div class='empty small'>Nada</div>"}
        </div>`;
      box.hidden = false;
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#global-search") && !e.target.closest("#search-results")) box.hidden = true;
    });
  }

  window.ui = { toast, confirmDialog, modal, fieldError, renderNotifications, setupSearch };
})();