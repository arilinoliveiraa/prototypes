/* ==========================================================================
   RD Station — Equipes · protótipo navegável
   Escopo: as 6 telas da seção "Telas para protótipo navegável".
     1. Equipes (listagem)
     2. Criar equipe (modal)
     3. Criar equipe > selecionar produtos (modal + dropdown)
     4. Configurar equipe (multi-produto)
     5. Configurar equipe apenas RD Vendas
     6. Configurar equipe > adicionar usuários
   ========================================================================== */

/* ------------------------------------------------------------- constantes -- */

const PRODUCTS = { VENDAS: "RD Vendas", ATENDIMENTO: "RD Atendimento" };

const TAGS = { VENDAS: "VENDAS", ATENDIMENTO: "ATENDIMENTO" };

/* Cores da equipe, na ordem exata do Figma (39 opções). */
const COLORS = [
  "#E0C048", "#F5D55E", "#ECDDA1", "#E8E2CB",
  "#FF762A", "#F2AD87", "#EBCFBF",
  "#BA422E", "#ED553E", "#E89D91", "#E6C8C3",
  "#BB0D59", "#DF0D6A", "#E179A8", "#E5BACC",
  "#59064C", "#8B0877", "#B876AD", "#D3B9CF",
  "#088307", "#08C600", "#74D572", "#B8DFB8",
  "#318581", "#3EADA7", "#91C9C6", "#C4DAD8",
  "#016997", "#008ED1", "#73B9DB", "#B8D3E2",
  "#767474", "#989797", "#BEBDBD", "#D5D5D5",
  "#0A2232", "#174061", "#7D93A3", "#BDC4CB",
];

const DAYS = [
  "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira",
  "Sexta-feira", "Sábado", "Domingo",
];

const DAY_MODES = ["Com expediente", "24 horas", "Sem expediente"];

/* Cada dia aceita no máximo dois turnos (o botão "Adicionar turno" some nesse limite). */
const MAX_SHIFTS_PER_DAY = 2;

const USERS = [
  { name: "Nicholaus Arson", email: "nicholaus.arson@logisoft.com" },
  { name: "Pelle Almqvist", email: "pelle.almqvist@logisoft.com" },
  { name: "Chris Grahn", email: "chris.grahn@logisoft.com" },
  { name: "Johan Gustavsson", email: "johan.gustavsson@logisoft.com" },
  { name: "Vigilante Carlstroem", email: "vigilante.carlstroem@logisoft.com" },
  { name: "Mattias Bernwall", email: "mattias.bernwall@logisoft.com" },
  { name: "Copia Emeritus", email: "copia.emeritus@logisoft.com" },
  { name: "Tobias Forge", email: "tobias.forge@logisoft.com" },
  { name: "Any Lima", email: "any.lima@logisoft.com" },
  { name: "Kate Clover", email: "kate.clover@logisoft.com" },
];

/* Equipes da listagem — os valores refletem o frame "Equipes" da seção. */
const INITIAL_TEAMS = [
  {
    id: "t1", name: "Atendimento e Suporte", color: "#FF762A",
    products: ["VENDAS", "ATENDIMENTO"], users: 4,
    expanded: false,
    subteams: [
      { id: "s1a", name: "Suporte N1", users: 2 },
      { id: "s1b", name: "Suporte N2", users: 2 },
    ],
  },
  {
    id: "t2", name: "Pós vendas", color: "#59064C",
    products: ["VENDAS", "ATENDIMENTO"], users: 8,
    expanded: true,
    subteams: [
      { id: "s2a", name: "Manhã", users: 3 },
      { id: "s2b", name: "Tarde", users: 3 },
      { id: "s2c", name: "Turno adicional", users: 2 },
    ],
  },
  {
    id: "t3", name: "Negociações São Paulo", color: "#767474",
    products: ["VENDAS"], users: 8,
    expanded: false, subteams: [],
  },
  {
    id: "t4", name: "Financeiro", color: "#088307",
    products: ["VENDAS", "ATENDIMENTO"], users: 5,
    expanded: false, subteams: [],
  },
];

/* ---------------------------------------------------------------- estado -- */

const state = {
  teams: [],
  /* draft da equipe em criação/edição */
  draft: null,
  /* "create" | "edit" | "subteam" */
  mode: null,
  /* id da equipe/sub-equipe sendo editada */
  editingId: null,
  /* true quando o item em edição é uma sub-equipe */
  editingSub: false,
  dirty: false,
  toast: null,
};

/* Preenche o detalhe editável de uma equipe ou sub-equipe, para que a tela
   de edição abra completa e "Salvar" não zere os dados da listagem. */
function seedDetail(item, { color, products, parentId, userCount }) {
  const draft = newDraft(item.name, products, { parentId: parentId || "" });
  draft.color = color;
  draft.teamType = normalizeTeamType(item.teamType, parentId);

  const n = Math.min(userCount, USERS.length);
  draft.users = USERS.slice(0, n).map((u, i) => ({
    ...u,
    visibility: i === 0 ? "Equipe" : "Restrita",
  }));

  item.color = color;
  item.products = [...products];
  item.teamType = draft.teamType;
  item.userList = draft.users.map((u) => ({ ...u }));
  item.days = JSON.parse(JSON.stringify(draft.days));
  item.message = "";
  item.visibleInMenu = false;
  item.onlineOnly = false;
  item.allContacts = false;
}

function freshState() {
  state.teams = JSON.parse(JSON.stringify(INITIAL_TEAMS));

  state.teams.forEach((t) => {
    seedDetail(t, { color: t.color, products: t.products, parentId: t.parentId, userCount: t.users });

    /* Sub-equipes herdam cor e produtos da equipe principal. */
    (t.subteams || []).forEach((s) => {
      seedDetail(s, { color: t.color, products: t.products, parentId: t.id, userCount: s.users });
      s.parentId = t.id;
    });
  });

  state.draft = null;
  state.mode = null;
  state.editingId = null;
  state.editingSub = false;
  state.dirty = false;
}

/* --------------------------------------------------------------- helpers -- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const ico = (file, size = 24, cls = "") =>
  `<span class="ico ico--${size} ${cls}" aria-hidden="true" style="--m:var(--i-${file})"></span>`;

const tag = (p) => `<span class="tag">${TAGS[p]}</span>`;


/* O scroll fica no .page-scroll, que vai até a borda direita da tela; a
   .page continua limitada e centralizada dentro dele. */
function wrapPage() {
  const page = $("#app > .page");
  if (!page || page.parentElement?.classList.contains("page-scroll")) return;
  const scroll = document.createElement("div");
  scroll.className = "page-scroll";
  page.parentElement.insertBefore(scroll, page);
  scroll.appendChild(page);
}

/* ------------------------------------------------------- select (Tangram) -- */

let selectSeq = 0;

/**
 * Markup do select do Tangram.
 * options: [{ value, label }]
 * value:   valor atual (string) ou array, quando multiple
 * multiple: exibe checkbox em cada item (Dropdown Items / variant Checkbox)
 */
function selectHtml({ options, value, multiple = false, placeholder = "Selecione", id = "", ariaLabel = "", cls = "", disabled = false }) {
  const uid = `sel${++selectSeq}`;
  const selected = multiple
    ? (Array.isArray(value) ? value : value ? [value] : [])
    : [value].filter((v) => v !== undefined && v !== null && v !== "");

  const label = selected.length
    ? options.filter((o) => selected.includes(o.value)).map((o) => o.label).join(", ")
    : placeholder;

  return `
    <div class="tg-select ${cls}" id="${id || uid}" data-multiple="${multiple}"
         data-placeholder="${esc(placeholder)}" ${disabled ? 'data-disabled="true"' : ""}>
      <button class="tg-select__trigger" type="button"
              aria-haspopup="listbox" aria-expanded="false"${disabled ? " disabled" : ""}
              ${ariaLabel ? `aria-label="${esc(ariaLabel)}"` : ""}>
        <span class="tg-select__value${selected.length ? "" : " tg-select__value--placeholder"}">${esc(label)}</span>
        <span class="ico ico--24 tg-select__caret" style="--m:var(--i-caret)"></span>
      </button>
      <div class="tg-dropdown" role="listbox" ${multiple ? 'aria-multiselectable="true"' : ""} hidden>
        ${options.map((o) => `
          <button class="tg-dropdown__item" type="button" role="option"
                  data-value="${esc(o.value)}"
                  aria-selected="${selected.includes(o.value)}">
            ${multiple ? `<span class="tg-dropdown__check" data-checked="${selected.includes(o.value)}" aria-hidden="true"></span>` : ""}
            <span class="tg-dropdown__label">${esc(o.label)}</span>
          </button>`).join("")}
      </div>
    </div>
  `;
}

/* Liga um select que já está no DOM. */
/* Registro dos selects abertos — só um dropdown pode estar aberto por vez. */
const openSelects = new Set();

/* Fecha todos os dropdowns abertos (usado antes de re-renderizar a tela
   ou fechar a modal, para não deixar o painel órfão no portal). */
function closeAllSelects() {
  [...openSelects].forEach((root) => root._closeSelect?.());
}

function wireSelect(root, { multiple = false, onChange } = {}) {
  const trigger = root.querySelector(".tg-select__trigger");
  const panel = root.querySelector(".tg-dropdown");
  const valueEl = root.querySelector(".tg-select__value");
  /* O painel pode ir para um portal no <body>; guardamos os itens de antemão. */
  const items = [...panel.querySelectorAll(".tg-dropdown__item")];

  let portal = null;

  /* Posiciona o painel (fixed) colado ao trigger, virando para cima se faltar espaço. */
  const position = () => {
    const rect = trigger.getBoundingClientRect();
    const gap = 4;
    const maxH = 320;

    panel.style.left = `${rect.left}px`;
    panel.style.width = `${rect.width}px`;

    const spaceBelow = window.innerHeight - rect.bottom - gap - 8;
    const spaceAbove = rect.top - gap - 8;
    const listH = Math.min(maxH, items.length * 44 + 16);
    const up = spaceBelow < listH && spaceAbove > spaceBelow;

    panel.classList.toggle("tg-dropdown--up", up);

    if (up) {
      panel.style.top = "auto";
      panel.style.bottom = `${window.innerHeight - rect.top + gap}px`;
      panel.style.maxHeight = `${Math.max(80, spaceAbove)}px`;
    } else {
      panel.style.bottom = "auto";
      panel.style.top = `${rect.bottom + gap}px`;
      panel.style.maxHeight = `${Math.max(80, spaceBelow)}px`;
    }
  };

  const onScroll = () => position();
  const onResize = () => position();

  const onKey = (e) => {
    if (e.key === "Escape" && root.dataset.open === "true") {
      e.stopPropagation();
      close();
      trigger.focus();
    }
  };

  const close = () => {
    if (root.dataset.open !== "true") return;

    panel.hidden = true;
    root.dataset.open = "false";
    trigger.setAttribute("aria-expanded", "false");
    openSelects.delete(root);

    window.removeEventListener("scroll", onScroll, true);
    window.removeEventListener("resize", onResize);
    document.removeEventListener("keydown", onKey, true);

    /* Devolve o painel ao select, para o DOM não acumular nós soltos. */
    if (portal) {
      root.appendChild(panel);
      portal.remove();
      portal = null;
      panel.classList.remove("tg-dropdown--portal");
      panel.removeAttribute("style");
    }
  };

  const open = () => {
    /* Fecha os demais selects abertos. */
    [...openSelects].forEach((other) => {
      if (other !== root) other._closeSelect?.();
    });

    /* Portal no <body>: escapa do overflow da modal e de qualquer card. */
    if (!portal) {
      portal = document.createElement("div");
      portal.className = "tg-dropdown-portal";
      document.body.appendChild(portal);
      portal.appendChild(panel);
      panel.classList.add("tg-dropdown--portal");
    }

    panel.hidden = false;
    root.dataset.open = "true";
    trigger.setAttribute("aria-expanded", "true");
    openSelects.add(root);

    position();
    panel.scrollTop = 0;

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    document.addEventListener("keydown", onKey, true);
  };

  root._closeSelect = close;

  trigger.addEventListener("click", () => {
    if (trigger.disabled) return;
    root.dataset.open === "true" ? close() : open();
  });

  const onDocClick = (e) => {
    if (root.dataset.open !== "true") return;
    if (root.contains(e.target) || panel.contains(e.target)) return;
    close();
  };
  /* mousedown cobre o clique do mouse; click cobre teclado (Enter/Espaço),
     que não dispara mousedown. */
  document.addEventListener("mousedown", onDocClick);
  document.addEventListener("click", onDocClick);
  root._detach = () => {
    document.removeEventListener("mousedown", onDocClick);
    document.removeEventListener("click", onDocClick);
    close();
  };

  items.forEach((item) => {
    item.addEventListener("click", () => {
      const val = item.dataset.value;

      if (multiple) {
        const check = item.querySelector(".tg-dropdown__check");
        const next = item.getAttribute("aria-selected") !== "true";
        item.setAttribute("aria-selected", String(next));
        if (check) check.dataset.checked = String(next);
      } else {
        items.forEach((other) => other.setAttribute("aria-selected", String(other === item)));
        close();
      }

      const chosen = items.filter((i) => i.getAttribute("aria-selected") === "true");
      valueEl.textContent = chosen.length
        ? chosen.map((c) => c.querySelector(".tg-dropdown__label").textContent).join(", ")
        : root.dataset.placeholder || "Selecione";
      valueEl.classList.toggle("tg-select__value--placeholder", chosen.length === 0);

      onChange?.(multiple ? chosen.map((c) => c.dataset.value) : val, root);
    });
  });

  return { close, open };
}

function newDraft(name, products, { parentId = "" } = {}) {
  return {
    name,
    products: [...products],
    color: COLORS[0],
    message: "",
    /* Switch "Exibição no menu" começa desligado. */
    visibleInMenu: false,
    onlineOnly: false,
    allContacts: false,
    days: DAYS.map((dayName, i) => ({
      name: dayName,
      mode: i < 4 ? "Com expediente" : i === 4 ? "24 horas" : "Sem expediente",
      shifts: i === 0
        ? [{ start: "08:00", end: "18:00" }, { start: "08:00", end: "18:00" }]
        : [{ start: "08:00", end: "18:00" }],
      open: i === 0,
    })),
    /* Nenhum usuário vinculado: os checkboxes começam em branco. */
    users: [],
    /* Equipe principal de origem (só existe quando criada a partir de outra). */
    parentId,
    teamType: "vinculada",
  };
}

/* Tipo da equipe: rótulos exibidos no select. */
const TEAM_TYPES = [
  { value: "vinculada", label: "Equipe vinculada" },
  { value: "principal", label: "Equipe principal" },
];

/* Garante que só existam os dois tipos válidos ("sub" virou "vinculada"). */
function normalizeTeamType(raw, parentId) {
  if (raw === "principal" || raw === "vinculada") return raw;
  return parentId ? "vinculada" : "principal";
}

/* Sub-equipes existem no RD Atendimento: quem é só RD Vendas não as aceita. */
function canHaveSubteams(team) {
  return team.products.includes("ATENDIMENTO");
}

function productLabel(products) {
  return products.map((p) => PRODUCTS[p]).join(", ");
}

/* ---------------------------------------------------------------- router -- */

function route() {
  closeAllSelects();
  const hash = location.hash.replace(/^#\/?/, "") || "equipes";
  const parts = hash.split("/");

  if (parts[0] === "configurar" && state.draft) {
    if (parts[1] === "usuarios") return renderUsers();
    return renderConfigure();
  }

  if (parts[0] === "equipes" && parts[1] === "nova" && state.draft) {
    return renderConfigure();
  }

  return renderList();
}

function navigate(hash) {
  if (state.dirty && isLeavingFlow(hash)) {
    openDiscardModal(hash);
    return;
  }
  location.hash = hash;
}

function isLeavingFlow(hash) {
  return !hash.startsWith("#/configurar") && !hash.startsWith("#/equipes/nova");
}

/* ------------------------------------------------------------ shell parts -- */

function sidebar() {
  return `
    <aside class="sidebar">
      <div class="sidebar__back">
        <button class="icon-btn" type="button" aria-label="Voltar">${ico("arrow-left", 20)}</button>
        <span class="sidebar__label">CONTAS</span>
      </div>
      <div class="account-card">
        <div class="account-card__name">LogiSoft</div>
        <div class="account-card__id">ID 235532</div>
      </div>
      <div class="nav-section">
        <button class="nav-item nav-item--parent" type="button">
          Configurações
          <span class="ico ico--24 nav-item__chevron" style="--m:var(--i-chevron-up)"></span>
        </button>
        <button class="nav-item" type="button">Perfis e permissões</button>
        <button class="nav-item" type="button">Convites e usuários</button>
        <button class="nav-item is-active" type="button" aria-current="page">Equipes</button>
        <button class="nav-item" type="button">Histórico</button>
      </div>
    </aside>
  `;
}

/* Tela 1 — Equipes ------------------------------------------------------- */

function renderList() {
  closeAllSelects();
  const teams = state.teams;

  $("#app").innerHTML = `
    ${sidebar()}
    <div class="page">
      <div class="page-header">
        <div class="page-header__title-wrap">
          <h1 class="page-header__title">Equipes</h1>
        </div>
        <div class="page-header__actions">
          <button class="btn btn--primary" type="button" id="btn-create">
            ${ico("plus", 24)} Criar equipe
          </button>
        </div>
      </div>

      <div class="list-stack">
        <div class="card overview">
          <div class="card__titles"><h2 class="card__title">Visão geral</h2></div>
          <button class="acc-action" type="button" id="btn-overview">
            <span id="overview-label">Ver mais</span>
            <span id="overview-icon">${ico("chevron-down", 24)}</span>
          </button>
          <div id="overview-body" class="overview__body" hidden>
            <div class="overview__stat"><div class="card__title">${teams.length}</div><div class="field__hint">Equipes na conta</div></div>
            <div class="overview__stat"><div class="card__title">${teams.reduce((a, t) => a + t.subteams.length, 0)}</div><div class="field__hint">Sub-equipes vinculadas</div></div>
          </div>
        </div>

        <div class="toolbar">
          <div class="search">
            <input id="search" type="search" placeholder="Buscar" aria-label="Buscar equipes" autocomplete="off">
            <span class="ico ico--20 search__icon" style="--m:var(--i-loupe)"></span>
          </div>
          ${selectHtml({
            id: "filter",
            value: "TODOS",
            cls: "select--filter",
            ariaLabel: "Filtrar por produto",
            options: [
              { value: "TODOS", label: "Todos os produtos" },
              { value: "VENDAS", label: "RD Vendas" },
              { value: "ATENDIMENTO", label: "RD Atendimento" },
            ],
          })}
        </div>

        <div class="team-list" id="team-list">${teams.map(teamCard).join("")}</div>

        <div class="pagination">
          <div class="pagination__summary">
            Exibindo
            ${selectHtml({
              id: "per-page",
              value: "10",
              cls: "select--per-page",
              ariaLabel: "Itens por página",
              options: ["10", "25", "50"].map((n) => ({ value: n, label: n })),
            })}
            de 349 equipes
          </div>
          <div class="pagination__pages">
            <button class="page-btn" type="button" disabled>Anterior</button>
            <button class="page-btn is-current" type="button" aria-current="page">1</button>
            <button class="page-btn" type="button" disabled>2</button>
            <button class="page-btn" type="button" disabled>3</button>
            <button class="page-btn" type="button" disabled>...</button>
            <button class="page-btn" type="button" disabled>20</button>
            <button class="page-btn" type="button" disabled>Próxima</button>
          </div>
        </div>
      </div>
    </div>
  `;

  wrapPage();

  $("#btn-create").addEventListener("click", openCreateModal);

  $("#btn-overview").addEventListener("click", () => {
    const body = $("#overview-body");
    body.hidden = !body.hidden;
    $("#overview-label").textContent = body.hidden ? "Ver mais" : "Ver menos";
    $("#overview-icon").style.setProperty(
      "--m",
      body.hidden ? "var(--i-chevron-down)" : "var(--i-chevron-up)"
    );
  });

  const search = $("#search");
  search.addEventListener("input", () => {
    const q = search.value.trim().toLowerCase();
    $$("#team-list .team").forEach((card) => {
      card.hidden = q !== "" && !card.textContent.toLowerCase().includes(q);
    });
  });

  wireSelect($("#filter"), {
    onChange: (v) => {
      $$("#team-list .team").forEach((card) => {
        card.hidden = v !== "TODOS" && !card.dataset.products.split(",").includes(v);
      });
    },
  });

  wireSelect($("#per-page"), { onChange: () => {} });

  /* "Sub-equipe" abre a modal de criação com o produto da equipe principal. */
  $$("[data-createsub]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const team = state.teams.find((t) => t.id === btn.dataset.createsub);
      if (!team) return;
      openCreateModal({ parentId: team.id, parentName: team.name, presetProducts: team.products });
    })
  );

  $$("[data-subtoggle]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const team = state.teams.find((t) => t.id === btn.dataset.subtoggle);
      team.expanded = !team.expanded;
      renderList();
    })
  );

  $$("[data-edit]").forEach((btn) =>
    btn.addEventListener("click", () => openEdit(btn.dataset.edit))
  );

  /* Sub-equipes: editar abre a mesma tela de configuração; excluir pede confirmação. */
  $$("[data-editsub]").forEach((btn) =>
    btn.addEventListener("click", () => openEdit(btn.dataset.editsub))
  );

  $$("[data-deletesub]").forEach((btn) =>
    btn.addEventListener("click", () => openDeleteModal(btn.dataset.deletesub))
  );

  $$("[data-delete]").forEach((btn) =>
    btn.addEventListener("click", () => openDeleteModal(btn.dataset.delete))
  );
}

/* Localiza uma equipe ou sub-equipe pelo id. */
function findTeamOrSub(id) {
  const team = state.teams.find((t) => t.id === id);
  if (team) return { item: team, parent: null, isSub: false };

  for (const parent of state.teams) {
    const sub = (parent.subteams || []).find((s) => s.id === id);
    if (sub) return { item: sub, parent, isSub: true };
  }
  return null;
}

/* Abre a tela de configuração preenchida com os dados da equipe. */
function openEdit(id) {
  const found = findTeamOrSub(id);
  if (!found) return;

  const { item, parent, isSub } = found;

  /* Sub-equipe herda produtos e vínculo da equipe principal. */
  const products = item.products || (parent ? parent.products : []);
  const parentId = isSub ? parent.id : (item.parentId || "");

  const draft = newDraft(item.name, products, { parentId });
  draft.color = item.color || (parent ? parent.color : COLORS[0]);
  /* Sub-equipe é sempre "vinculada"; equipes seguem só "principal"/"vinculada". */
  draft.teamType = isSub ? "vinculada" : normalizeTeamType(item.teamType, item.parentId);

  if (item.message !== undefined) draft.message = item.message;
  if (item.visibleInMenu !== undefined) draft.visibleInMenu = item.visibleInMenu;
  if (item.onlineOnly !== undefined) draft.onlineOnly = item.onlineOnly;
  if (item.allContacts !== undefined) draft.allContacts = item.allContacts;
  if (item.days) draft.days = JSON.parse(JSON.stringify(item.days));
  if (item.userList) draft.users = item.userList.map((u) => ({ ...u }));

  state.draft = draft;
  state.mode = "edit";
  state.editingId = item.id;
  state.editingSub = isSub;
  state.dirty = false;
  location.hash = "#/configurar";
}

/* Fluxo de exclusão (equipe ou sub-equipe), com confirmação. */
function openDeleteModal(id) {
  const found = findTeamOrSub(id);
  if (!found) return;

  const { item, parent, isSub } = found;
  const subCount = isSub ? 0 : (item.subteams || []).length;

  const title = isSub ? "Excluir sub-equipe" : "Excluir equipe";
  const kindLabel = isSub ? "sub-equipe" : "equipe";

  const extra = !isSub && subCount > 0
    ? ` As <strong>${subCount} sub-equipe${subCount > 1 ? "s" : ""}</strong> vinculada${subCount > 1 ? "s" : ""} também ser${subCount > 1 ? "ão" : "á"} excluída${subCount > 1 ? "s" : ""}.`
    : "";

  $("#modal-root").innerHTML = `
    <div class="overlay" data-overlay>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="delete-title">
        <div class="modal__head">
          <h2 class="modal__title" id="delete-title">${title}</h2>
          <button class="modal__close" type="button" data-close aria-label="Fechar">${ico("times", 24)}</button>
        </div>
        <p class="card__desc">
          Ao excluir, os usuários serão removidos da ${kindLabel}
          <strong>${esc(item.name)}</strong> e ela será excluída.${extra}
        </p>
        <div class="modal__footer">
          <button class="btn btn--secondary" type="button" data-close>Cancelar</button>
          <button class="btn btn--danger" type="button" id="btn-confirm-delete">Excluir</button>
        </div>
      </div>
    </div>
  `;

  $$("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
  $("[data-overlay]").addEventListener("mousedown", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.addEventListener("keydown", onEsc);

  $("#btn-confirm-delete").addEventListener("click", () => {
    if (isSub) {
      parent.subteams = parent.subteams.filter((s) => s.id !== item.id);
    } else {
      state.teams = state.teams.filter((t) => t.id !== item.id);
    }
    closeModal();
    renderList();
    showToast(isSub ? "Sub-equipe excluída" : "Equipe excluída");
  });
}

/* Botão "Editar" da tela de usuários: volta para a configuração da mesma equipe. */
function editFromUsers() {
  state.mode = "edit";
  location.hash = "#/configurar";
}

/* A tela de usuários aparece quando o draft é de edição/criação de equipe nova,
   não de sub-equipe (sub-equipe segue o mesmo fluxo). */
function isEditingExisting() {
  return state.mode === "edit" && Boolean(state.editingId);
}

function teamCard(t) {
  const hasSubs = t.subteams.length > 0;
  return `
    <article class="team" data-products="${t.products.join(",")}">
      <div class="team__head">
        <span class="team__dot" style="--c:${t.color}"></span>
        <div class="team__info">
          <div class="team__name">${esc(t.name)}</div>
          <div class="team__meta">${t.users} usuários únicos</div>
          <div class="team__tags">${t.products.map(tag).join("")}</div>
        </div>
        <div class="team__actions">
          ${canHaveSubteams(t) ? `
            <button class="btn btn--secondary btn--sm" type="button" data-createsub="${t.id}">
              ${ico("plus", 20)} Sub-equipe
            </button>` : ""}
          <button class="icon-btn--plain" type="button" data-edit="${t.id}" aria-label="Editar ${esc(t.name)}">${ico("pen", 20)}</button>
          <button class="icon-btn--danger" type="button" data-delete="${t.id}" aria-label="Excluir ${esc(t.name)}">${ico("trash", 24)}</button>
        </div>
      </div>

      ${hasSubs ? `
        <div class="subteams">
          <button class="subteams__toggle" type="button" data-subtoggle="${t.id}" aria-expanded="${t.expanded}">
            <span>${t.subteams.length} sub-equipes vinculadas</span>
            <span class="ico ico--24" style="--m:var(${t.expanded ? "--i-chevron-up" : "--i-chevron-down"})"></span>
          </button>
          ${t.expanded ? `
            <div class="subteams__list">
              ${t.subteams.map((s) => `
                <div class="subteam">
                  <div class="subteam__info">
                    <div class="subteam__name">${esc(s.name)}</div>
                    <div class="subteam__meta">${s.users} usuários</div>
                  </div>
                  <div class="subteam__actions">
                    <button class="icon-btn--plain" type="button" data-editsub="${s.id}"
                            aria-label="Editar ${esc(s.name)}">${ico("pen", 20)}</button>
                    <button class="icon-btn--danger" type="button" data-deletesub="${s.id}"
                            aria-label="Excluir ${esc(s.name)}">${ico("trash", 20)}</button>
                  </div>
                </div>`).join("")}
            </div>` : ""}
        </div>` : ""}
    </article>
  `;
}

/* Tela 2 e 3 — Modal "Criar equipe" -------------------------------------- */

function openCreateModal({ parentId = "", parentName = "", presetProducts = [] } = {}) {
  const isSub = Boolean(parentId);
  const selected = [...presetProducts];

  $("#modal-root").innerHTML = `
    <div class="overlay" data-overlay>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal__head">
          <h2 class="modal__title" id="modal-title">${isSub ? "Criar sub-equipe" : "Criar equipe"}</h2>
          <button class="modal__close" type="button" data-close aria-label="Fechar">${ico("times", 24)}</button>
        </div>

        ${isSub ? `
        <p class="card__desc" style="margin:-8px 0 16px">
          Esta sub-equipe ficará vinculada a <strong>${esc(parentName)}</strong>.
        </p>` : ""}

        <div class="modal__content">
          <div class="field">
            <label class="field__label" for="name">Nome da equipe</label>
            <input class="input" id="name" placeholder="Digite o nome da equipe" autocomplete="off">
          </div>

          <div class="field">
            <div>
              <div class="field__label">Produto</div>
              <p class="field__hint">Em quais produtos a equipe será criada?</p>
            </div>
            ${selectHtml({
              id: "modal-products",
              multiple: true,
              value: selected,
              placeholder: "Selecione um ou mais produtos",
              ariaLabel: "Produto",
              options: Object.entries(PRODUCTS).map(([value, label]) => ({ value, label })),
            })}
          </div>
        </div>

        <div class="modal__footer">
          <button class="btn btn--secondary" type="button" data-close>Cancelar</button>
          <button class="btn btn--disabled" type="button" id="btn-continue" disabled>Continuar</button>
        </div>
      </div>
    </div>
  `;

  const nameInput = $("#name");
  const continueBtn = $("#btn-continue");

  const sync = () => {
    const ok = nameInput.value.trim() !== "" && selected.length > 0;
    continueBtn.disabled = !ok;
    continueBtn.className = `btn ${ok ? "btn--primary" : "btn--disabled"}`;
    nameInput.classList.remove("input--error");
  };

  nameInput.addEventListener("input", sync);

  wireSelect($("#modal-products"), {
    multiple: true,
    onChange: (values) => {
      selected.length = 0;
      selected.push(...values);
      sync();
    },
  });

  continueBtn.addEventListener("click", () => {
    if (nameInput.value.trim() === "") {
      nameInput.classList.add("input--error");
      nameInput.focus();
      return;
    }
    if (selected.length === 0) {
      $("#modal-products .tg-select__trigger").focus();
      return;
    }
    state.draft = newDraft(nameInput.value.trim(), [...selected], { parentId });
    state.mode = isSub ? "subteam" : "create";
    state.editingId = null;
    state.dirty = false;
    closeModal();
    location.hash = "#/equipes/nova";
  });

  $$("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
  $("[data-overlay]").addEventListener("mousedown", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.addEventListener("keydown", onEsc);
  nameInput.focus();
}

function onEsc(e) {
  if (e.key === "Escape") closeModal();
}

function closeModal() {
  closeAllSelects();
  $("#modal-root").innerHTML = "";
  document.removeEventListener("keydown", onEsc);
}

function openDiscardModal(pendingHash) {
  $("#modal-root").innerHTML = `
    <div class="overlay" data-overlay>
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal__head">
          <h2 class="modal__title">Descartar alterações?</h2>
          <button class="modal__close" type="button" data-close aria-label="Fechar">${ico("times", 24)}</button>
        </div>
        <p class="card__desc">As alterações desta equipe ainda não foram salvas. Se sair agora, elas serão perdidas.</p>
        <div class="modal__footer">
          <button class="btn btn--secondary" type="button" data-close>Continuar editando</button>
          <button class="btn btn--primary" type="button" id="btn-discard">Descartar e sair</button>
        </div>
      </div>
    </div>
  `;

  $$("[data-close]").forEach((b) => b.addEventListener("click", closeModal));
  $("[data-overlay]").addEventListener("mousedown", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.addEventListener("keydown", onEsc);

  $("#btn-discard").addEventListener("click", () => {
    state.dirty = false;
    state.draft = null;
    closeModal();
    location.hash = pendingHash;
  });
}

/* Tela 4 e 5 — Configurar equipe ----------------------------------------- */

function renderConfigure(preserveScroll = false) {
  closeAllSelects();
  const d = state.draft;
  const onlyVendas = d.products.length === 1 && d.products[0] === "VENDAS";
  const showAtendimento = d.products.includes("ATENDIMENTO");

  /* Ao regravar a tela por uma interação local (ex.: mudar o expediente),
     devolve o usuário à mesma posição vertical — sem "pular" para o topo. */
  let scrollTop = 0;
  let anchor = null;
  if (preserveScroll) {
    const page = $(".page-scroll");
    scrollTop = page ? page.scrollTop : 0;
    const activeDay = document.activeElement?.closest?.("[data-day]");
    if (activeDay) anchor = activeDay.dataset.day;
  }

  $("#app").innerHTML = `
    ${sidebar()}
    <div class="page">
      <div class="page-header">
        <button class="page-header__back" type="button" id="btn-back" aria-label="Voltar">${ico("arrow-left", 24)}</button>
        <div class="page-header__title-wrap">
          <h1 class="page-header__title">${esc(d.name)}</h1>
          <div class="page-header__tags">${d.products.map(tag).join("")}</div>
        </div>
        <div class="page-header__actions">
          <button class="btn btn--secondary" type="button" id="btn-users">
            ${ico("user-plus", 24)} Adicionar usuários
          </button>
          <button class="btn btn--primary" type="button" id="btn-save">
            ${state.mode === "edit" ? "Salvar" : "Salvar equipe"}
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card__head">
          <div class="card__titles"><h2 class="card__title">Informações gerais</h2></div>
        </div>
        <div class="card__body">
          <div class="form-grid">
            <div class="field">
              <label class="field__label" for="team-name">Nome da equipe</label>
              <input class="input" id="team-name" value="${esc(d.name)}">
            </div>
            <div class="field">
              <span class="field__label">Produtos</span>
              ${selectHtml({
                id: "team-products",
                multiple: true,
                value: d.products,
                placeholder: "Selecione um ou mais produtos",
                ariaLabel: "Produtos",
                options: Object.entries(PRODUCTS).map(([value, label]) => ({ value, label })),
              })}
            </div>
          </div>

          ${onlyVendas ? "" : `
          <div class="form-grid">
            <div class="field">
              <span class="field__label">Tipo</span>
              ${selectHtml({
                id: "team-type",
                value: d.teamType || "vinculada",
                ariaLabel: "Tipo",
                /* Sub-equipe é sempre vinculada: o tipo não muda. */
                disabled: state.editingSub,
                options: TEAM_TYPES,
              })}
            </div>
            <div class="field">
              <span class="field__label">Equipe principal</span>
              ${selectHtml({
                id: "team-parent",
                value: d.parentId || "",
                /* Equipe principal não tem vínculo: campo inerte, como "—" no Figma. */
                placeholder: d.teamType === "principal" ? "—" : "Selecione",
                ariaLabel: "Equipe principal",
                disabled: d.teamType === "principal" || state.editingSub,
                options: state.teams.map((t) => ({ value: t.id, label: t.name })),
              })}
            </div>
          </div>`}

          <div class="field">
            <span class="field__label">Cor da equipe</span>
            <p class="field__hint">Escolha uma cor para identificar a equipe principal.</p>
            <div class="swatches" id="swatches" role="group" aria-label="Cor da equipe">
              ${COLORS.map((c) => `
                <button class="swatch" type="button" style="--c:${c}" data-color="${c}"
                        aria-pressed="${c === d.color}" aria-label="Cor ${c}"></button>`).join("")}
            </div>
          </div>
        </div>
      </div>

      ${showAtendimento ? atendimentoCards(d) : vendasCard()}
    </div>
  `;

  wrapPage();

  wireConfigure(d, onlyVendas);

  if (preserveScroll) {
    const page = $(".page-scroll");
    if (page) {
      page.scrollTop = scrollTop;
      /* se o card do dia estava em foco, mantém a referência visível */
      if (anchor !== null) {
        const day = $(`[data-day="${anchor}"]`);
        if (day) day.scrollIntoView({ block: "nearest" });
      }
    }
  }
}

function atendimentoCards(d) {
  return `
    <div class="card">
      <div class="card__head">
        <div class="card__titles">
          <h2 class="card__title">Informações para o RD Atendimento</h2>
          <p class="card__desc">Gerencie as informações específicas do RD Atendimento</p>
        </div>
        <button class="acc-action" type="button" data-collapse="info">
          <span data-collapse-icon="info">${ico("chevron-up", 24)}</span>
          <span data-collapse-label="info">Fechar</span>
        </button>
      </div>
      <div class="card__body" id="info-body">
        <div class="textarea-block">
          <div class="field">
            <label class="field__label" for="message">Mensagem para horários fora expediente</label>
            <textarea class="textarea" id="message"
              placeholder="Digite uma mensagem padrão da equipe para ser enviada nos horários fora do expediente.">${esc(d.message)}</textarea>
          </div>
        </div>

        <div class="switch-row">
          <button class="switch" type="button" role="switch" aria-checked="${d.visibleInMenu}" id="sw-menu"
                  aria-label="Exibição no menu"></button>
          <div class="switch-text">
            <span class="switch-text__title">Exibição no menu</span>
            <span class="switch-text__desc">Ocultar ou exibir esta equipe do menu no processo de atendimento.</span>
          </div>
        </div>

        <div class="switch-row">
          <button class="switch" type="button" role="switch" aria-checked="${d.onlineOnly}" id="sw-online"
                  aria-label="Enviar leads apenas para atendentes online"></button>
          <div class="switch-text">
            <span class="switch-text__title switch-text__title--plain">Enviar leads apenas para atendentes online</span>
            <span class="switch-text__desc">Ative para garantir que os atendimentos sejam distribuídos apenas para operadores online. Essa opção habilita o uso dos status “Em Pausa” e “Invisível”.</span>
          </div>
        </div>

        <div class="switch-row">
          <button class="switch" type="button" role="switch" aria-checked="${d.allContacts}" id="sw-contacts"
                  aria-label="Permitir que este setor visualize toda a base de contatos"></button>
          <div class="switch-text">
            <span class="switch-text__title switch-text__title--plain">Permitir que este setor visualize toda a base de contatos</span>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card__head">
        <div class="card__titles">
          <h2 class="card__title">Expediente no RD Atendimento</h2>
          <p class="card__desc">Defina os horários de trabalho da equipe no RD Atendimento.</p>
        </div>
        <button class="acc-action" type="button" data-collapse="exp">
          <span data-collapse-icon="exp">${ico("chevron-up", 24)}</span>
          <span data-collapse-label="exp">Fechar</span>
        </button>
      </div>
      <div class="card__body days" id="exp-body">
        ${d.days.map((day, i) => dayCard(day, i)).join("")}
      </div>
    </div>
  `;
}

function dayCard(day, i) {
  /* Só "Sem expediente" deixa o card cinza; "24 horas" é um dia ativo. */
  const semExpediente = day.mode === "Sem expediente";
  const comTurnos = day.mode === "Com expediente";
  return `
    <div class="day-card${semExpediente ? " day-card--off" : ""}" data-day="${i}">
      <div class="day-card__head">
        <span class="day-card__name">${day.name}</span>
        ${selectHtml({
          id: `day-mode-${i}`,
          value: day.mode,
          cls: "select--fixed",
          ariaLabel: `Expediente de ${day.name}`,
          options: DAY_MODES.map((m) => ({ value: m, label: m })),
        })}
      </div>

      ${comTurnos ? `
      <div class="day-card__body">
        ${day.shifts.map((s, si) => `
          <div class="shift">
            <span class="shift__label">Turno ${si + 1}</span>
            <input class="time-input" type="time" value="${s.start}" data-start="${i}:${si}" aria-label="Início turno ${si + 1} ${day.name}">
            <span class="shift__sep">às</span>
            <input class="time-input" type="time" value="${s.end}" data-end="${i}:${si}" aria-label="Fim turno ${si + 1} ${day.name}">
            ${si > 0 ? `
              <button class="icon-btn--plain" type="button" data-remove-shift="${i}:${si}" aria-label="Remover turno ${si + 1}">
                ${ico("trash", 20)}
              </button>` : ""}
            ${si === day.shifts.length - 1 && day.shifts.length < MAX_SHIFTS_PER_DAY ? `
              <button class="add-shift" type="button" data-add-shift="${i}">
                ${ico("plus", 20)} Adicionar turno
              </button>` : ""}
          </div>`).join("")}
      </div>` : ""}
    </div>
  `;
}

/* O frame "apenas RD Vendas" tem somente "Informações gerais" — sem card extra. */
function vendasCard() {
  return "";
}

function wireConfigure(d) {
  const markDirty = () => { state.dirty = true; };

  $("#btn-back").addEventListener("click", () => navigate("#/equipes"));

  $("#team-name").addEventListener("input", (e) => {
    d.name = e.target.value;
    $(".page-header__title").textContent = e.target.value || " ";
    markDirty();
  });

  /* Produtos: controla quais configurações aparecem (RD Vendas x RD Atendimento) */
  const productsEl = $("#team-products");
  if (productsEl) {
    wireSelect(productsEl, {
      multiple: true,
      onChange: (values) => {
        if (values.length === 0) {
          /* mantém ao menos um produto selecionado */
          const item = productsEl.querySelector(`[data-value="${d.products[0]}"]`);
          if (item) {
            item.setAttribute("aria-selected", "true");
            item.querySelector(".tg-dropdown__check").dataset.checked = "true";
          }
          const valueEl = productsEl.querySelector(".tg-select__value");
          valueEl.textContent = productLabel(d.products);
          valueEl.classList.remove("tg-select__value--placeholder");
          return;
        }
        d.products = values;
        state.dirty = true;
        renderConfigure(true);
      },
    });
  }

  const typeEl = $("#team-type");
  if (typeEl) {
    wireSelect(typeEl, {
      onChange: (value) => {
        d.teamType = value;
        markDirty();
        /* "Equipe principal" não tem vínculo nem configurações de atendimento. */
        renderConfigure(true);
      },
    });
  }

  const parentEl = $("#team-parent");
  if (parentEl && !parentEl.dataset.disabled) {
    wireSelect(parentEl, {
      onChange: (value) => {
        d.parentId = value;
        markDirty();
        renderConfigure(true);
      },
    });
  }

  $("#swatches").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-color]");
    if (!btn) return;
    d.color = btn.dataset.color;
    $$("#swatches .swatch").forEach((s) => s.setAttribute("aria-pressed", String(s === btn)));
    markDirty();
  });

  $("#btn-users").addEventListener("click", () => {
    location.hash = "#/configurar/usuarios";
  });

  $("#btn-save").addEventListener("click", saveTeam);

  /* Collapse dos cards de atendimento */
  $$("[data-collapse]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.collapse;
      const body = $(`#${key}-body`);
      const closed = body.hidden;
      body.hidden = !closed;
      $(`[data-collapse-label="${key}"]`).textContent = closed ? "Fechar" : "Abrir";
      $(`[data-collapse-icon="${key}"]`).style.setProperty(
        "--m",
        closed ? "var(--i-chevron-up)" : "var(--i-chevron-down)"
      );
    });
  });

  /* Switches */
  const msg = $("#message");
  if (msg) {
    msg.addEventListener("input", (e) => { d.message = e.target.value; markDirty(); });
  }

  const bindSwitch = (id, key) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("click", () => {
      const next = el.getAttribute("aria-checked") !== "true";
      el.setAttribute("aria-checked", String(next));
      d[key] = next;
      markDirty();
    });
  };

  bindSwitch("#sw-menu", "visibleInMenu");
  bindSwitch("#sw-online", "onlineOnly");
  bindSwitch("#sw-contacts", "allContacts");

  /* Expediente */
  d.days.forEach((day, i) => {
    const el = $(`#day-mode-${i}`);
    if (!el) return;
    wireSelect(el, {
      onChange: (value) => {
        d.days[i].mode = value;
        markDirty();
        renderConfigure(true);
      },
    });
  });

  $$("[data-start]").forEach((inp) =>
    inp.addEventListener("change", (e) => {
      const [i, si] = e.target.dataset.start.split(":").map(Number);
      d.days[i].shifts[si].start = e.target.value;
      markDirty();
    })
  );

  $$("[data-end]").forEach((inp) =>
    inp.addEventListener("change", (e) => {
      const [i, si] = e.target.dataset.end.split(":").map(Number);
      d.days[i].shifts[si].end = e.target.value;
      markDirty();
    })
  );

  $$("[data-add-shift]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.addShift);
      if (d.days[i].shifts.length >= MAX_SHIFTS_PER_DAY) return;
      d.days[i].shifts.push({ start: "08:00", end: "18:00" });
      markDirty();
      renderConfigure(true);
    })
  );

  $$("[data-remove-shift]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const [i, si] = btn.dataset.removeShift.split(":").map(Number);
      d.days[i].shifts.splice(si, 1);
      markDirty();
      renderConfigure(true);
    })
  );
}

/* Copia os dados editáveis do draft de volta para o objeto da equipe. */
function applyDraftTo(team, d) {
  team.name = d.name.trim();
  team.color = d.color;
  team.products = [...d.products];
  team.users = d.users.length;
  team.message = d.message;
  team.visibleInMenu = d.visibleInMenu;
  team.onlineOnly = d.onlineOnly;
  team.allContacts = d.allContacts;
  team.days = JSON.parse(JSON.stringify(d.days));
  team.userList = d.users.map((u) => ({ ...u }));
  team.teamType = d.teamType;
  team.parentId = d.parentId || "";
}

function saveTeam() {
  const d = state.draft;

  if (!d.name.trim()) {
    const input = $("#team-name");
    input.classList.add("input--error");
    input.focus();
    showToast("Informe um nome para a equipe", "error");
    return;
  }

  /* Edição: atualiza a equipe ou sub-equipe existente no lugar. */
  if (state.mode === "edit" && state.editingId) {
    const found = findTeamOrSub(state.editingId);
    if (found) {
      applyDraftTo(found.item, d);
      /* Sub-equipe editada mantém o vínculo com a equipe principal. */
      if (found.isSub) found.item.parentId = found.parent.id;
    }
    state.dirty = false;
    state.draft = null;
    state.mode = null;
    state.editingId = null;
    state.editingSub = false;
    location.hash = "#/equipes";
    return; /* renderList vem pelo hashchange */
  }

  const team = {
    id: `t${Date.now()}`,
    name: d.name.trim(),
    color: d.color,
    products: [...d.products],
    users: d.users.length,
    subteams: [],
    expanded: false,
    parentId: d.parentId || "",
    teamType: d.teamType,
  };
  applyDraftTo(team, d);

  if (state.mode === "subteam" && d.parentId) {
    /* Sub-equipe: entra na lista da equipe principal, não no topo da listagem. */
    const parent = state.teams.find((t) => t.id === d.parentId);
    if (parent) {
      const sub = {
        id: `s${Date.now()}`,
        name: team.name,
        color: parent.color,
        products: [...parent.products],
        users: team.users,
        parentId: parent.id,
        teamType: "vinculada",
      };
      applyDraftTo(sub, d);
      sub.parentId = parent.id;
      parent.subteams = [...parent.subteams, sub];
      parent.expanded = true;
    }
    state.dirty = false;
    state.draft = null;
    state.mode = null;
    location.hash = "#/equipes";
    showToast("Sub-equipe criada");
    return;
  }

  state.teams.unshift(team);
  state.dirty = false;
  state.draft = null;
  state.mode = null;
  location.hash = "#/equipes";
  renderList();
  showToast("Equipe criada");
}

/* Tela 6 — Adicionar usuários -------------------------------------------- */

/* Linhas da tabela de usuários. O select de visibilidade só existe
   para as linhas marcadas. */
function userRowsHtml(d) {
  return USERS.map((u) => {
    const added = d.users.find((x) => x.email === u.email);
    return `
      <tr data-email="${esc(u.email)}">
        <td class="col-check">
          <input class="checkbox" type="checkbox" data-toggle-user="${esc(u.email)}"
                 ${added ? "checked" : ""} aria-label="Adicionar ${esc(u.name)}">
        </td>
        <td>
          <div class="user-name">${esc(u.name)}</div>
          <div class="user-email">${esc(u.email)}</div>
        </td>
        <td class="col-vis">
          ${added ? selectHtml({
            id: `vis-${esc(u.email)}`,
            value: added.visibility === "Equipe" ? "Equipe" : "Restrita",
            cls: "select--visibility",
            ariaLabel: `Visibilidade de ${u.name}`,
            options: [
              { value: "Equipe", label: "Equipe" },
              { value: "Restrita", label: "Restrita" },
            ],
          }) : ""}
        </td>
      </tr>
    `;
  }).join("");
}

/* Liga os controles das linhas (usado no render inicial e ao remarcar). */
function wireUserRows(d, getQuery, applyFilter) {
  $$("[data-toggle-user]").forEach((cb) =>
    cb.addEventListener("change", () => {
      const email = cb.dataset.toggleUser;
      if (cb.checked) {
        d.users.push({ ...USERS.find((u) => u.email === email), visibility: "Restrita" });
      } else {
        d.users = d.users.filter((u) => u.email !== email);
      }
      state.dirty = true;
      refreshUserRows(d, getQuery(), applyFilter);
    })
  );

  USERS.forEach((u) => {
    const el = $(`#vis-${CSS.escape(u.email)}`);
    if (!el) return;
    wireSelect(el, {
      onChange: (value) => {
        const entry = d.users.find((x) => x.email === u.email);
        if (entry) entry.visibility = value;
        state.dirty = true;
      },
    });
  });
}

/* Redesenha só o corpo da tabela, preservando busca e posição do usuário. */
function refreshUserRows(d, query, applyFilter) {
  const body = $("#user-rows");
  if (!body) return;
  closeAllSelects();
  body.innerHTML = userRowsHtml(d);
  wireUserRows(d, () => query, applyFilter);
  applyFilter(query);
}

function renderUsers() {
  closeAllSelects();
  const d = state.draft;

  const applyFilter = (q) => {
    const term = (q || "").trim().toLowerCase();
    $$("#user-rows tr").forEach((tr) => {
      tr.hidden = term !== "" && !tr.textContent.toLowerCase().includes(term);
    });
  };

  const rows = userRowsHtml(d);

  $("#app").innerHTML = `
    ${sidebar()}
    <div class="page">
      <div class="page-header">
        <button class="page-header__back" type="button" id="btn-back-users" aria-label="Voltar">${ico("arrow-left", 24)}</button>
        <div class="page-header__title-wrap">
          <h1 class="page-header__title">${esc(d.name)}</h1>
          <div class="page-header__tags">${d.products.map(tag).join("")}</div>
        </div>
        <div class="page-header__actions">
          <button class="btn btn--secondary" type="button" id="btn-edit">
            ${ico("pen", 24)} Editar
          </button>
          <button class="btn btn--primary" type="button" id="btn-save-users">Salvar</button>
        </div>
      </div>

      <h2 class="users-title">Adicionar usuários à equipe</h2>

      <div class="search-wrap">
        <input class="input" id="user-search" placeholder="Buscar usuário" aria-label="Buscar usuário" autocomplete="off">
      </div>

      <table class="table">
        <thead>
          <tr>
            <th class="col-check"></th>
            <th style="width:auto">Usuário</th>
            <th class="col-vis">Visibilidade</th>
          </tr>
        </thead>
        <tbody id="user-rows">${rows}</tbody>
      </table>
    </div>
  `;

  wrapPage();

  $("#btn-back-users").addEventListener("click", () => { location.hash = "#/configurar"; });
  $("#btn-edit").addEventListener("click", () => editFromUsers());
  $("#btn-save-users").addEventListener("click", saveTeam);

  const search = $("#user-search");
  const getQuery = () => search.value;

  search.addEventListener("input", () => applyFilter(search.value));

  wireUserRows(d, getQuery, applyFilter);
}

/* ----------------------------------------------------------------- toast -- */

function showToast(message, kind = "success") {
  const root = $("#toast-root");
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `
    <span class="toast__icon"${kind === "error" ? ' style="background:#c20046"' : ""}>${kind === "error" ? "!" : "✓"}</span>
    <span class="toast__text">${esc(message)}</span>
  `;
  root.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

/* --------------------------------------------------------- prototype bar -- */

function renderProtoBar() {
  const bar = document.createElement("div");
  bar.className = "proto-bar";
  bar.innerHTML = `
    <span>Protótipo navegável</span>
    <button type="button" id="proto-reset">Reiniciar</button>
    <button type="button" id="proto-hide">Ocultar</button>
  `;
  document.body.appendChild(bar);

  $("#proto-reset").addEventListener("click", () => {
    freshState();
    closeModal();
    location.hash = "#/equipes";
    renderList();
    showToast("Protótipo reiniciado");
  });

  $("#proto-hide").addEventListener("click", () => bar.remove());
}

/* ------------------------------------------------------------------ boot -- */

window.addEventListener("hashchange", route);

document.addEventListener("DOMContentLoaded", () => {
  freshState();
  if (!location.hash) location.hash = "#/equipes";
  route();
  renderProtoBar();
});
