(function () {
  const view = document.getElementById("view");
  const links = document.querySelectorAll(".side-link");

  const ACCESS = {
    admin: ["dashboard", "protocols", "agenda", "emails", "tasks", "clients", "reports", "staff", "audit", "settings"],
    gestor: ["dashboard", "protocols", "agenda", "emails", "tasks", "clients", "reports", "staff"],
    funcionario: ["dashboard", "protocols", "agenda", "emails", "tasks", "clients"],
    visualizacao: ["dashboard", "protocols", "clients", "reports"],
  };
  window.ACCESS = ACCESS;

  function perfilAtual() {
    return (store.get("session_perfil", "funcionario")) || "funcionario";
  }

  function applyMenu(perfil) {
    links.forEach((l) => {
      const ok = ACCESS[perfil] && ACCESS[perfil].includes(l.dataset.route);
      l.style.display = ok ? "" : "none";
    });
  }

  function navigate() {
    const user = auth.current();
    const perfil = user ? user.perfil : perfilAtual();
    const allow = ACCESS[perfil] || ACCESS.funcionario;

    let hash = location.hash.replace("#/", "").split("?")[0];
    links.forEach((b) => b.classList.toggle("is-active", b.dataset.route === hash));

    if (hash.startsWith("protocol/")) {
      if (!allow.includes("protocols")) { location.hash = "#/dashboard"; return; }
      const id = hash.split("/")[1];
      return renderProtocolDetail(view, id);
    }
    if (!allow.includes(hash)) {
      location.hash = "#/dashboard";
      return;
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
    (map[hash] || map.dashboard)();
  }

  window.addEventListener("hashchange", navigate);

  function setUser() {
    const user = auth.current();
    if (!user) return;
    const perfil = window.PERFIL_LABEL ? window.PERFIL_LABEL[user.perfil] : "";
    document.getElementById("user-name").textContent = `${user.nome} · ${perfil}`;
    applyMenu(user.perfil);
  }

  function boot() {
    setUser();
    ui.setupSearch();
    navigate();
    document.getElementById("logout-btn").addEventListener("click", () => auth.logout());
    const bell = document.getElementById("bell-btn");
    if (bell) bell.addEventListener("click", () => document.getElementById("notif-panel").hidden = false);
    window.addEventListener("online", () => ui.toast("Conectado"));
    window.addEventListener("offline", () => ui.toast("Offline — dados locais", "warn"));
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }

  auth.requireLogin(boot);
})();