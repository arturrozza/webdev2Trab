// render.js
// Única responsabilidade: pegar o estado atual e desenhar na tela.
// Não decide regras de negócio e não fala com a API — só renderiza.

import { qs, escapeHtml } from './utils.js';
import { state, getFilteredTasks, getTaskCounts, countByCategoria } from './state.js';

export function render() {
  renderTasks();
  renderCounts();
  renderCategorias();
}

// ---------- Lista de tarefas ----------

function renderTasks() {
  const listEl = qs('#task-list');
  const emptyEl = qs('#task-empty');
  const tasksToShow = getFilteredTasks();

  listEl.innerHTML = '';
  emptyEl.classList.toggle('visible', tasksToShow.length === 0);
  emptyEl.textContent = state.tarefas.length === 0
    ? 'Nenhuma tarefa por aqui ainda. Adicione a primeira acima 👆'
    : 'Nenhuma tarefa com esses filtros.';

  tasksToShow.forEach((task) => {
    const li = document.createElement('li');
    const isActive = task.id === state.activeTaskId;

    li.className = 'task-item' + (task.concluida ? ' done' : '') + (isActive ? ' active' : '');
    li.dataset.priority = task.prioridade;
    li.dataset.id = task.id;

    // A cor vem do banco já validada (#rrggbb), mas escapamos tudo por garantia
    const categoria = task.categoria
      ? `<span class="task-cat" style="--cat: ${escapeHtml(task.categoria.cor)}">${escapeHtml(task.categoria.nome)}</span>`
      : '';

    li.innerHTML = `
      <button class="task-checkbox" data-action="toggle" aria-label="Marcar como concluída"></button>
      <span class="task-title">${escapeHtml(task.titulo)}</span>
      ${categoria}
      <button class="task-focus" data-action="focus" aria-label="Focar nessa tarefa" title="Usar no timer">
        ${isActive ? '◉' : '○'}
      </button>
      <button class="task-delete" data-action="delete" aria-label="Excluir tarefa">✕</button>
    `;

    listEl.appendChild(li);
  });
}

function renderCounts() {
  const { pending, done } = getTaskCounts();
  qs('#tasks-pending-count').textContent = `${pending} pendente${pending === 1 ? '' : 's'}`;
  qs('#tasks-done-count').textContent = `${done} concluída${done === 1 ? '' : 's'}`;
}

// ---------- Categorias ----------
// Aparecem em 3 lugares: lista do sidebar, select do formulário e filtros.

function renderCategorias() {
  renderCategoriaList();
  renderCategoriaSelect();
  renderCategoriaFilters();
}

function renderCategoriaList() {
  const listEl = qs('#categoria-list');
  listEl.innerHTML = '';

  if (state.categorias.length === 0) {
    listEl.innerHTML = '<li class="categoria-vazia">Nenhuma categoria ainda.</li>';
    return;
  }

  state.categorias.forEach((cat) => {
    const li = document.createElement('li');
    li.className = 'categoria-item';
    li.dataset.id = cat.id;
    li.innerHTML = `
      <span class="categoria-dot" style="--cat: ${escapeHtml(cat.cor)}"></span>
      <span class="categoria-nome">${escapeHtml(cat.nome)}</span>
      <span class="categoria-total">${countByCategoria(cat.id)}</span>
      <button class="task-delete" data-action="delete-categoria" aria-label="Excluir categoria">✕</button>
    `;
    listEl.appendChild(li);
  });
}

function renderCategoriaSelect() {
  const select = qs('#task-categoria');
  const atual = select.value; // mantém a escolha do usuário entre re-renders

  select.innerHTML = '<option value="">Sem categoria</option>' +
    state.categorias
      .map((c) => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`)
      .join('');

  if ([...select.options].some((o) => o.value === atual)) select.value = atual;
}

function renderCategoriaFilters() {
  const wrap = qs('#categoria-filters');

  // Sem categorias cadastradas, a linha de filtro não tem utilidade
  wrap.hidden = state.categorias.length === 0;

  const pill = (valor, rotulo, cor) => {
    const ativo = state.categoriaFiltro === valor ? ' active' : '';
    const dot = cor ? `<span class="categoria-dot" style="--cat: ${escapeHtml(cor)}"></span>` : '';
    return `<button class="filter-pill${ativo}" data-categoria="${valor}">${dot}${escapeHtml(rotulo)}</button>`;
  };

  wrap.innerHTML =
    pill('all', 'Todas categorias') +
    state.categorias.map((c) => pill(c.id, c.nome, c.cor)).join('') +
    pill('none', 'Sem categoria');
}

// ---------- Mensagens de erro ----------

let toastTimeout = null;

export function showError(mensagem) {
  const toast = qs('#toast');
  toast.textContent = mensagem;
  toast.classList.add('visible');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('visible'), 4000);
}
