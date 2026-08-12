(function () {
  const view = document.getElementById("view");
  const links = document.querySelectorAll(".side-link");

  function getPerfil() {
    const u = store.get("session_user", "Admin");
    const usuarios = store.get("usuarios", null);
    if (usuarios) {
      const found = usuarios.find((x) => x.nome === u || x.email === u);
      if (found) return found.perfil;
    }
    return "admin";
  }

  const ACCESS = {
    admin: ["dashboard", "protocols", "agenda", "emails", "tasks", "clients", "reports", "staff", "audit", "settings"],
    gestor: ["dashboard", "protocols", "agenda", "emails", "tasks", "clients", "reports", "staff"],
    funcionario: ["dashboard", "agenda", "emails", "tasks"],
    visualizacao: ["dashboard", "protocols", "clients", "reports"],
  };

  function applyMenu(perfil) {
    links.forEach((l) => {
      const ok = ACCESS[perfil] && ACCESS[perfil].includes(l.dataset.route);
      l.style.display = ok ? "" : "none";
    });
  }

  function navigate() {
    let hash = location.hash.replace("#/", "").split("?")[0];
    const perfil = getPerfil();
    links.forEach((b) => b.classList.toggle("is-active", b.dataset.route === hash));
    if (hash.startsWith("protocol/")) {
      const id = hash.split("/")[1];
      return renderProtocolDetail(view, id);
    }
    const map = {
      dashboard: () => renderDashboard(view),
      protocols: () => renderProtocolos(view),
      agenda: () => renderAgenda(view, store.todayISO()),
      emails: () => renderEmails(view),
      tasks: () => renderTasks(view),
      clients: () => renderClients(view),
      reports: () => renderReports(view),
      staff: () => renderStaff(view),
      audit: () => renderAudit(view),
      settings: () => renderSettings(view),
    };
    const handler = map[hash] || map.dashboard;
    handler();
  }

  window.addEventListener("hashchange", navigate);

  function setUser() {
    const name = store.get("session_user", "Admin");
    const perfil = window.PERFIL_LABEL ? window.PERFIL_LABEL[getPerfil()] : "";
    document.getElementById("user-name").textContent = perfil ? `${name} · ${perfil}` : name;
    applyMenu(getPerfil());
  }

  document.getElementById("user-chip").addEventListener("click", () => {
    const perfis = ["admin", "gestor", "funcionario", "visualizacao"];
    const atual = getPerfil();
    const prox = perfis[(perfis.indexOf(atual) + 1) % perfis.length];
    store.set("session_perfil", prox);
    db.audit("manual", "trocar_perfil_demo", "perfil", atual, prox);
    location.reload();
  });

  document.getElementById("bell-btn").addEventListener("click", () => document.getElementById("notif-panel").hidden = false);

  window.addEventListener("online", () => ui.toast("Conectado"));
  window.addEventListener("offline", () => ui.toast("Offline — dados locais", "warn"));

  if (navigator.serviceWorker) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  ui.setupSearch();
  setUser();
  navigate();
})();