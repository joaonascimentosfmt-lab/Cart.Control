import { store, formatDate, esc } from "./storage.js";
import { toast } from "./agenda.js";

const TIPOS = ["Certidão", "Escritura", "Reconhecimento de Firma", "Autenticação", "Procuração", "Registro Civil", "Registro de Imóveis", "Outro"];
const STATUS = ["no_prazo", "risco", "vencido", "finalizado"];
const STATUS_LABEL = { no_prazo: "No prazo", risco: "Em risco", vencido: "Vencido", finalizado: "Finalizado" };

function seed() {
  if (store.get("planilha_seeded", false)) return;
  const data = [
    { protocolo: "2026/0012", tipo: "Escritura", parte: "Maria Silva", entrada: store.daysFromNow(-4), prazo: store.daysFromNow(6), responsavel: "Tabelião A", status: "no_prazo", obs: "" },
    { protocolo: "2026/0013", tipo: "Registro de Imóveis", parte: "João Souza", entrada: store.daysFromNow(-10), prazo: store.daysFromNow(1), responsavel: "Escrevente B", status: "risco", obs: "Documentação incompleta" },
    { protocolo: "2026/0014", tipo: "Certidão", parte: "Ana Pereira", entrada: store.daysFromNow(-20), prazo: store.daysFromNow(-3), responsavel: "Escrevente C", status: "vencido", obs: "Aguardando parte retornar" },
    { protocolo: "2026/0015", tipo: "Autenticação", parte: "Carlos Lima", entrada: store.daysFromNow(-30), prazo: store.daysFromNow(-10), responsavel: "Tabelião A", status: "finalizado", obs: "Entregue" },
  ];
  store.set("planilha", data.map((r) => ({ id: store.uid(), ...r })));
  store.set("planilha_seeded", true);
}

export function getAll() {
  seed();
  return store.get("planilha", []);
}

export function upsert(record) {
  const all = getAll();
  const idx = all.findIndex((a) => a.id === record.id);
  if (idx >= 0) all[idx] = record;
  else all.push(record);
  store.set("planilha", all);
}

export function remove(id) {
  store.set("planilha", getAll().filter((a) => a.id !== id));
}

export function renderPlanilha(root) {
  const rows = getAll();
  const today = new Date(store.todayISO() + "T00:00:00");
  const active = rows.filter((r) => r.status !== "finalizado");
  const nowPrazo = active.filter((r) => {
    const d = new Date(r.prazo + "T00:00:00");
    return (d - today) / 86400000 > 3;
  }).length;
  const emRisco = active.filter((r) => {
    const d = new Date(r.prazo + "T00:00:00");
    const diff = (d - today) / 86400000;
    return diff >= 0 && diff <= 3;
  }).length;
  const vencidos = active.filter((r) => new Date(r.prazo + "T00:00:00") < today).length;

  root.innerHTML = `
    <h2 class="page-title">Planilha de Protocolos</h2>
    <div class="stats">
      <div class="stat info"><div class="value">${rows.length}</div><div class="label">Total de protocolos</div></div>
      <div class="stat ok"><div class="value">${nowPrazo}</div><div class="label">No prazo</div></div>
      <div class="stat warn"><div class="value">${emRisco}</div><div class="label">Em risco</div></div>
      <div class="stat bad"><div class="value">${vencidos}</div><div class="label">Vencidos</div></div>
    </div>

    <div class="card">
      <div class="toolbar">
        <input type="search" id="planilha-search" placeholder="Buscar protocolo, parte ou responsável..." aria-label="Buscar">
        <select id="planilha-filter">
          <option value="">Todos os status</option>
          ${STATUS.map((s) => `<option value="${s}">${STATUS_LABEL[s]}</option>`).join("")}
        </select>
        <button class="btn primary" id="planilha-add">+ Novo protocolo</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Protocolo</th><th>Tipo</th><th>Parte</th><th>Entrada</th><th>Prazo</th><th>Status</th><th>Responsável</th><th></th>
            </tr>
          </thead>
          <tbody id="planilha-tbody"></tbody>
        </table>
      </div>
    </div>`;

  const tbody = root.querySelector("#planilha-tbody");
  const search = root.querySelector("#planilha-search");
  const filter = root.querySelector("#planilha-filter");

  function draw() {
    const q = search.value.toLowerCase().trim();
    const f = filter.value;
    const filtered = rows.filter((r) => {
      const matchQ = !q || `${r.protocolo} ${r.parte} ${r.responsavel} ${r.tipo}`.toLowerCase().includes(q);
      const matchF = !f || r.status === f;
      return matchQ && matchF;
    }).sort((a, b) => b.protocolo.localeCompare(a.protocolo));

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty"><span class="big">&#128203;</span>Nenhum protocolo encontrado.</div></td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map((r) => {
      const diff = (new Date(r.prazo + "T00:00:00") - today) / 86400000;
      const cls = r.status === "finalizado" ? "finalizado" : diff < 0 ? "vencido" : diff <= 3 ? "risco" : "ok";
      const pillLabel = r.status === "finalizado" ? "Finalizado" : diff < 0 ? `Vencido há ${Math.abs(diff)}d` : diff <= 3 ? `Em risco (${Math.abs(diff)}d)` : "No prazo";
      return `
        <tr data-id="${r.id}">
          <td><strong>${esc(r.protocolo)}</strong></td>
          <td>${esc(r.tipo)}</td>
          <td>${esc(r.parte)}</td>
          <td>${formatDate(r.entrada)}</td>
          <td>${formatDate(r.prazo)}</td>
          <td><span class="pill ${cls}">${pillLabel}</span></td>
          <td>${esc(r.responsavel)}</td>
          <td><div class="row-actions">
            <button class="icon-btn" data-edit="${r.id}" title="Editar">&#9998;</button>
            <button class="icon-btn" data-del="${r.id}" title="Excluir">&#128465;</button>
          </div></td>
        </tr>`;
    }).join("");
  }

  draw();

  search.addEventListener("input", draw);
  filter.addEventListener("change", draw);

  root.querySelector("#planilha-add").addEventListener("click", () => showModal(null));
  tbody.addEventListener("click", (e) => {
    const edit = e.target.closest("[data-edit]");
    const del = e.target.closest("[data-del]");
    if (edit) showModal(rows.find((r) => r.id === edit.dataset.edit));
    if (del) {
      if (confirm("Excluir este protocolo?")) {
        remove(del.dataset.del);
        renderPlanilha(root);
        toast("Protocolo excluído");
      }
    }
  });
}

function showModal(existing) {
  const r = existing || { id: store.uid(), protocolo: "", tipo: TIPOS[0], parte: "", entrada: store.todayISO(), prazo: store.daysFromNow(5), responsavel: "", status: "no_prazo", obs: "" };
  const isNew = !existing;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <h3>${isNew ? "Novo protocolo" : "Editar protocolo"}</h3>
      <form class="form-grid" id="planilha-form">
        <input type="hidden" name="id" value="${r.id}">
        <div class="form-field">
          <label>Nº do protocolo</label>
          <input type="text" name="protocolo" value="${esc(r.protocolo)}" required placeholder="2026/0016">
        </div>
        <div class="form-field">
          <label>Tipo de ato</label>
          <select name="tipo">
            ${TIPOS.map((t) => `<option value="${t}" ${t === r.tipo ? "selected" : ""}>${t}</option>`).join("")}
          </select>
        </div>
        <div class="form-field full">
          <label>Parte / Interessado</label>
          <input type="text" name="parte" value="${esc(r.parte)}" required>
        </div>
        <div class="form-field">
          <label>Data de entrada</label>
          <input type="date" name="entrada" value="${r.entrada}" required>
        </div>
        <div class="form-field">
          <label>Prazo final</label>
          <input type="date" name="prazo" value="${r.prazo}" required>
        </div>
        <div class="form-field">
          <label>Responsável</label>
          <input type="text" name="responsavel" value="${esc(r.responsavel)}" placeholder="Escrevente / Tabelião">
        </div>
        <div class="form-field">
          <label>Status</label>
          <select name="status">
            ${STATUS.map((s) => `<option value="${s}" ${s === r.status ? "selected" : ""}>${STATUS_LABEL[s]}</option>`).join("")}
          </select>
        </div>
        <div class="form-field full">
          <label>Observações</label>
          <textarea name="obs" rows="2" placeholder="Observações">${esc(r.obs)}</textarea>
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
      protocolo: fd.get("protocolo").trim(),
      tipo: fd.get("tipo"),
      parte: fd.get("parte").trim(),
      entrada: fd.get("entrada"),
      prazo: fd.get("prazo"),
      responsavel: fd.get("responsavel").trim(),
      status: fd.get("status"),
      obs: fd.get("obs").trim(),
    };
    if (!record.protocolo || !record.parte) return;
    upsert(record);
    close();
    renderPlanilha(document.getElementById("view"));
    toast("Protocolo salvo");
  });
}
