import { store, toISODate, formatDate, esc } from "./storage.js";

const SLOTS = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
const ACT_TYPES = ["Certidão", "Escritura", "Reconhecimento de Firma", "Autenticação", "Procuração", "Testamento", "Outro"];
const STATUS = ["agendado", "confirmado", "concluido", "cancelado"];
const STATUS_LABEL = { agendado: "Agendado", confirmado: "Confirmado", concluido: "Concluído", cancelado: "Cancelado" };

function seed() {
  if (store.get("agenda_seeded", false)) return;
  const base = store.todayISO();
  const data = [
    { date: base, time: "09:00", name: "Maria Silva", phone: "(11) 99999-0001", document: "123.456.789-01", act: "Escritura", status: "confirmado", notes: "Compra e venda de imóvel" },
    { date: base, time: "10:00", name: "João Souza", phone: "(11) 98888-0002", document: "987.654.321-00", act: "Procuração", status: "agendado", notes: "" },
    { date: store.daysFromNow(1), time: "14:00", name: "Ana Pereira", phone: "(11) 97777-0003", document: "111.222.333-44", act: "Reconhecimento de Firma", status: "agendado", notes: "Assinatura de contrato" },
    { date: store.daysFromNow(-1), time: "15:00", name: "Carlos Lima", phone: "(11) 96666-0004", document: "555.666.777-88", act: "Autenticação", status: "concluido", notes: "" },
  ];
  store.set("agenda", data.map((a) => ({ id: store.uid(), ...a })));
  store.set("agenda_seeded", true);
}

export function getAll() {
  seed();
  return store.get("agenda", []);
}

export function getByDate(dateISO) {
  return getAll().filter((a) => a.date === dateISO && a.status !== "cancelado");
}

export function getSlotMap(dateISO) {
  const map = {};
  getAll().forEach((a) => {
    if (a.date === dateISO && a.status !== "cancelado") {
      map[a.time] = a;
    }
  });
  return map;
}

export function upsert(record) {
  const all = getAll();
  const idx = all.findIndex((a) => a.id === record.id);
  if (idx >= 0) all[idx] = record;
  else all.push(record);
  store.set("agenda", all);
}

export function remove(id) {
  store.set("agenda", getAll().filter((a) => a.id !== id));
}

export function setStatus(id, status) {
  const all = getAll();
  const idx = all.findIndex((a) => a.id === id);
  if (idx >= 0) {
    all[idx].status = status;
    store.set("agenda", all);
  }
}

export function shiftDay(iso, delta) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

export function weekdayLabel(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

export function renderAgenda(root, dateISO) {
  const map = getSlotMap(dateISO);
  const list = getByDate(dateISO).sort((a, b) => a.time.localeCompare(b.time));

  root.innerHTML = `
    <h2 class="page-title">Agenda de Atendimento</h2>
    <div class="stats">
      <div class="stat info"><div class="value">${list.length}</div><div class="label">Agendamentos do dia</div></div>
      <div class="stat info"><div class="value">${SLOTS.length}</div><div class="label">Horários disponíveis</div></div>
      <div class="stat ok"><div class="value">${list.filter(a => a.status === "concluido").length}</div><div class="label">Concluídos</div></div>
      <div class="stat warn"><div class="value">${list.filter(a => a.status === "agendado").length}</div><div class="label">A confirmar</div></div>
    </div>

    <div class="card">
      <div class="date-nav">
        <button data-nav="-1" aria-label="Dia anterior">&#8249;</button>
        <div class="date-label">${esc(weekdayLabel(dateISO))}</div>
        <button data-nav="1" aria-label="Próximo dia">&#8250;</button>
      </div>
      <div class="slots">
        ${SLOTS.map((time) => {
          const a = map[time];
          if (!a) {
            return `<div class="slot free" data-time="${time}" role="button" tabindex="0"><span class="time">${time}</span><span class="meta">Livre</span></div>`;
          }
          const cls = a.status === "concluido" ? "done" : a.status === "cancelado" ? "cancelled" : "booked";
          return `<div class="slot ${cls}" data-id="${a.id}" role="button" tabindex="0"><span class="time">${time}</span><span class="meta">${esc(a.name)}</span><span class="tag">${STATUS_LABEL[a.status]}</span></div>`;
        }).join("")}
      </div>
    </div>

    <div class="card">
      <h2>Agendamentos do dia</h2>
      ${list.length === 0
        ? `<div class="empty"><span class="big">&#128197;</span>Nenhum agendamento para esta data.<br>Toque em um horário livre para agendar.</div>`
        : `<div class="appointments">
            ${list.map((a) => `
              <div class="appointment ${a.status}">
                <div>
                  <div class="who">${esc(a.time)} — ${esc(a.name)}</div>
                  <div class="detail">${esc(a.act)} &middot; ${esc(a.document)} ${a.phone ? "&middot; " + esc(a.phone) : ""}${a.notes ? " &middot; " + esc(a.notes) : ""}</div>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
                  <span class="badge ${a.status}">${STATUS_LABEL[a.status]}</span>
                  <div class="row-actions">
                    <button class="icon-btn" data-edit="${a.id}" title="Editar">&#9998;</button>
                    <button class="icon-btn" data-confirm="${a.id}" title="Confirmar">&#10003;</button>
                    <button class="icon-btn" data-done="${a.id}" title="Concluir">&#128211;</button>
                    <button class="icon-btn" data-cancel="${a.id}" title="Cancelar">&#10005;</button>
                  </div>
                </div>
              </div>`).join("")}
          </div>`}
    </div>`;

  root.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = shiftDay(dateISO, Number(btn.dataset.nav));
      renderAgenda(root, next);
    });
  });

  root.querySelectorAll(".slot.free").forEach((slot) => {
    slot.addEventListener("click", () => openModal(null, dateISO, slot.dataset.time));
    slot.addEventListener("keydown", (e) => { if (e.key === "Enter") openModal(null, dateISO, slot.dataset.time); });
  });

  root.querySelectorAll(".slot[data-id]").forEach((slot) => {
    slot.addEventListener("click", () => editModal(slot.dataset.id));
    slot.addEventListener("keydown", (e) => { if (e.key === "Enter") editModal(slot.dataset.id); });
  });

  root.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => editModal(b.dataset.edit)));
  root.querySelectorAll("[data-confirm]").forEach((b) => b.addEventListener("click", () => { setStatus(b.dataset.confirm, "confirmado"); renderAgenda(root, dateISO); toast("Agendamento confirmado"); }));
  root.querySelectorAll("[data-done]").forEach((b) => b.addEventListener("click", () => { setStatus(b.dataset.done, "concluido"); renderAgenda(root, dateISO); toast("Agendamento concluído"); }));
  root.querySelectorAll("[data-cancel]").forEach((b) => b.addEventListener("click", () => { setStatus(b.dataset.cancel, "cancelado"); renderAgenda(root, dateISO); toast("Agendamento cancelado"); }));
}

function openModal(existing, dateISO, time) {
  const a = existing || { id: store.uid(), date: dateISO, time: time || "08:00", name: "", phone: "", document: "", act: ACT_TYPES[0], status: "agendado", notes: "" };
  showModal(a);
}

function editModal(id) {
  const a = getAll().find((x) => x.id === id);
  if (a) showModal(a);
}

function showModal(a) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="Agendamento">
      <h3>${a.id && getAll().some(x => x.id === a.id) ? "Editar agendamento" : "Novo agendamento"}</h3>
      <form class="form-grid" id="agenda-form">
        <input type="hidden" name="id" value="${a.id}">
        <input type="hidden" name="date" value="${a.date}">
        <div class="form-field">
          <label>Data</label>
          <input type="date" name="dateInput" value="${a.date}" required>
        </div>
        <div class="form-field">
          <label>Horário</label>
          <select name="time">
            ${SLOTS.map((t) => `<option value="${t}" ${t === a.time ? "selected" : ""}>${t}</option>`).join("")}
          </select>
        </div>
        <div class="form-field full">
          <label>Nome da parte</label>
          <input type="text" name="name" value="${esc(a.name)}" required placeholder="Nome completo">
        </div>
        <div class="form-field">
          <label>Documento</label>
          <input type="text" name="document" value="${esc(a.document)}" placeholder="CPF / RG">
        </div>
        <div class="form-field">
          <label>Telefone</label>
          <input type="tel" name="phone" value="${esc(a.phone)}" placeholder="(11) 99999-0000">
        </div>
        <div class="form-field">
          <label>Tipo de ato</label>
          <select name="act">
            ${ACT_TYPES.map((t) => `<option value="${t}" ${t === a.act ? "selected" : ""}>${t}</option>`).join("")}
          </select>
        </div>
        <div class="form-field">
          <label>Status</label>
          <select name="status">
            ${STATUS.map((s) => `<option value="${s}" ${s === a.status ? "selected" : ""}>${STATUS_LABEL[s]}</option>`).join("")}
          </select>
        </div>
        <div class="form-field full">
          <label>Observações</label>
          <textarea name="notes" rows="2" placeholder="Observações do atendimento">${esc(a.notes)}</textarea>
        </div>
        <div class="form-field full actions">
          <button type="button" class="btn ghost" data-close>Cancelar</button>
          <button type="submit" class="btn primary">Salvar</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(backdrop);

  const close = () => backdrop.remove();
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector("[data-close]").addEventListener("click", close);

  backdrop.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const record = {
      id: fd.get("id"),
      date: fd.get("dateInput"),
      time: fd.get("time"),
      name: fd.get("name").trim(),
      document: fd.get("document").trim(),
      phone: fd.get("phone").trim(),
      act: fd.get("act"),
      status: fd.get("status"),
      notes: fd.get("notes").trim(),
    };
    if (!record.name) return;
    upsert(record);
    close();
    renderAgenda(document.getElementById("view"), record.date);
    toast("Agendamento salvo");
  });
}

let toastTimer;
export function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
}
