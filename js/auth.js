(function () {
  function seed() {
    if (window.seedUsuarios) window.seedUsuarios();
  }

  function current() {
    seed();
    const id = store.get("session_user_id", null);
    if (!id) return null;
    return store.get("usuarios", []).find((u) => u.id === id) || null;
  }

  function viewAccess(perfil) {
    const ACCESS = window.ACCESS || {
      admin: ["dashboard", "protocols", "agenda", "emails", "tasks", "clients", "reports", "staff", "audit", "settings"],
      gestor: ["dashboard", "protocols", "agenda", "emails", "tasks", "clients", "reports", "staff"],
      funcionario: ["dashboard", "protocols", "agenda", "emails", "tasks", "clients"],
      visualizacao: ["dashboard", "protocols", "clients", "reports"],
    };
    return ACCESS[perfil] || ACCESS.funcionario;
  }

  function loginView() {
    const el = document.createElement("div");
    el.className = "login-backdrop";
    el.innerHTML = `
      <div class="login-card">
        <form class="login-form" id="login-form" autocomplete="off">
          <img src="icons/icon.svg" alt="CartoMetrics" class="login-logo">
          <h2>CartoMetrics</h2>
          <p class="login-sub">Acesso restrito ao sistema do cartório.</p>
          <div class="form-field full">
            <label>E-mail</label>
            <input type="email" name="email" id="login-email" placeholder="seu@email.com" required>
          </div>
          <div class="form-field full">
            <label>Senha</label>
            <input type="password" name="senha" id="login-senha" placeholder="••••••••" required autocomplete="current-password">
          </div>
          <div id="login-msg" class="login-msg" hidden></div>
          <button type="submit" class="btn primary block" id="login-btn">Entrar</button>
          <div class="login-hint">Demo: admin@carto.com · admin123<br>Funcionários · 123456</div>
        </form>
      </div>`;
    document.body.appendChild(el);
    const msg = el.querySelector("#login-msg");
    el.querySelector("#login-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const email = el.querySelector("#login-email").value.trim().toLowerCase();
      const senha = el.querySelector("#login-senha").value;
      msg.hidden = true;
      const btn = el.querySelector("#login-btn");
      btn.disabled = true;
      btn.textContent = "Entrando...";
      sha256hex(senha).then((hash) => {
        const usuarios = store.get("usuarios", []);
        const user = usuarios.find((u) => (u.email || "").toLowerCase() === email);
        if (!user || user.senha !== hash) {
          btn.disabled = false;
          btn.textContent = "Entrar";
          msg.textContent = "E-mail ou senha inválidos. Credenciais demo: admin@carto.com · admin123 | funcionário · 123456";
          msg.hidden = false;
          return;
        }
        if (user.ativo === false) {
          btn.disabled = false;
          btn.textContent = "Entrar";
          msg.textContent = "Usuário bloqueado. Contate o administrador.";
          msg.hidden = false;
          return;
        }
        store.set("session_user_id", user.id);
        store.set("session_user", user.nome);
        store.set("session_perfil", user.perfil);
        db.audit(user.nome, "login", user.email, null, null);
        el.remove();
        window.__afterLogin();
      }).catch(() => {
        btn.disabled = false;
        btn.textContent = "Entrar";
        msg.textContent = "Erro ao processar a senha. Abra pelo GitHub Pages (HTTPS) e tente novamente.";
        msg.hidden = false;
      });
    });
  }

  function requireLogin(cb) {
    seed();
    const user = current();
    if (user) { cb(user); return; }
    window.__afterLogin = cb;
    loginView();
  }

  function logout() {
    const user = current();
    if (user) db.audit(user.nome, "logout", user.email, null, null);
    store.set("session_user_id", null);
    store.set("session_user", null);
    store.set("session_perfil", null);
    location.hash = "#/dashboard";
    location.reload();
  }

  window.auth = { current, requireLogin, logout, viewAccess };
})(window);