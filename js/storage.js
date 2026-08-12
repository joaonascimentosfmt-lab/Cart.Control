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

  window.store = store;
  window.toISODate = toISODate;
  window.formatDate = formatDate;
  window.esc = esc;
})();