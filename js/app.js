(function () {
  const view = document.getElementById("view");
  const navItems = document.querySelectorAll(".nav-item");
  const offlineBadge = document.getElementById("offline-badge");

  const routes = {
    agenda: () => renderAgenda(view, store.todayISO()),
    planilha: () => renderPlanilha(view),
    email: () => renderEmail(view),
    admin: () => renderAdmin(view),
  };

  function navigate() {
    const route = (location.hash.replace("#/", "") || "agenda").split("?")[0];
    const handler = routes[route] || routes.agenda;
    navItems.forEach((b) => b.classList.toggle("is-active", b.dataset.route === route));
    handler();
  }

  navItems.forEach((b) => b.addEventListener("click", () => {
    location.hash = "#/" + b.dataset.route;
  }));

  window.addEventListener("hashchange", navigate);

  function setOnline(online) {
    offlineBadge.hidden = online;
    if (!online) {
      offlineBadge.textContent = "Offline — dados salvos localmente";
    }
  }

  window.addEventListener("online", () => setOnline(true));
  window.addEventListener("offline", () => setOnline(false));

  if (navigator.serviceWorker) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  navigate();
})();