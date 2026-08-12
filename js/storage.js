(function () {
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    },
    uid() {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    },
    todayISO() {
      const d = new Date();
      return toISODate(d);
    },
    daysFromNow(days) {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return toISODate(d);
    },
    hoursFromNow(hours) {
      const d = new Date(Date.now() + hours * 3600 * 1000);
      return d.toISOString();
    },
    parseISO(iso) {
      const d = new Date(iso);
      return isNaN(d) ? null : d;
    },
    timeAgo(iso) {
      const d = this.parseISO(iso);
      if (!d) return "-";
      const diff = Date.now() - d.getTime();
      const mins = Math.round(diff / 60000);
      if (mins < 1) return "agora";
      if (mins < 60) return `${mins} min`;
      const hours = Math.round(mins / 60);
      if (hours < 24) return `${hours} h`;
      const days = Math.round(hours / 24);
      if (days < 30) return `${days} dia${days > 1 ? "s" : ""}`;
      const months = Math.round(days / 30);
      return `${months} mês(es)`;
    },
  };

  function toISODate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function formatDate(iso) {
    if (!iso) return "-";
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("pt-BR");
  }

  function esc(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function addBusinessDays(startISO, days) {
    let d = parseISO(startISO + "T00:00:00");
    let added = 0;
    while (added < days) {
      d.setDate(d.getDate() + 1);
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) added++;
    }
    return toISODate(d);
  }

  const db = {
    tables: ["protocols", "clients", "tasks", "emails", "appointments", "history", "audit", "notifications"],
    seedMark: "cartometrics_seeded_v1",
    table(name) {
      return store.get(name, []);
    },
    write(name, rows) {
      store.set(name, rows);
    },
    all(name) {
      return this.table(name);
    },
    byId(name, id) {
      return this.table(name).find((r) => r.id === id);
    },
    insert(name, row) {
      const rows = this.table(name);
      rows.push(row);
      this.write(name, rows);
      return row;
    },
    update(name, id, patch) {
      const rows = this.table(name);
      const idx = rows.findIndex((r) => r.id === id);
      if (idx >= 0) {
        rows[idx] = Object.assign({}, rows[idx], patch);
        this.write(name, rows);
        return rows[idx];
      }
      return null;
    },
    remove(name, id) {
      this.write(name, this.table(name).filter((r) => r.id !== id));
    },
    audit(user, action, target, from, to) {
      this.insert("audit", {
        id: store.uid(), user: user || "sistema", action, target,
        from: from != null ? from : null, to: to != null ? to : null,
        at: nowISO(),
      });
    },
  };

  const prazo = {
    NORMAL: "normal",
    ATENCAO: "atencao",
    URGENTE: "urgente",
    HOJE: "hoje",
    ATRASADO: "atrasado",
    CONCLUIDO: "concluido",
    status(prazoISO, concluido) {
      if (concluido) return this.CONCLUIDO;
      if (!prazoISO) return this.NORMAL;
      const today = new Date(this._today() + "T00:00:00");
      const d = new Date(prazoISO + "T00:00:00");
      const diff = (d - today) / 86400000;
      if (diff < 0) return this.ATRASADO;
      if (diff === 0) return this.HOJE;
      if (diff <= 1) return this.URGENTE;
      if (diff <= 3) return this.ATENCAO;
      return this.NORMAL;
    },
    diasRestantes(prazoISO) {
      if (!prazoISO) return null;
      const today = new Date(this._today() + "T00:00:00");
      const d = new Date(prazoISO + "T00:00:00");
      return Math.round((d - today) / 86400000);
    },
    label(s) {
      return {
        normal: "Normal", atencao: "Atenção", urgente: "Urgente",
        hoje: "Vence hoje", atrasado: "Atrasado", concluido: "Concluído",
      }[s] || s;
    },
    css(s) {
      return { normal: "ok", atencao: "risco", urgente: "urgente", hoje: "urgente", atrasado: "vencido", concluido: "finalizado" }[s] || "ok";
    },
    _today() { return store.todayISO(); },
  };

  window.db = db;
  window.prazo = prazo;
  window.nowISO = nowISO;
  window.addBusinessDays = addBusinessDays;
  window.store = store;
  window.toISODate = toISODate;
  window.formatDate = formatDate;
  window.esc = esc;
})();