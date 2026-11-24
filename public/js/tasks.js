// tasks.js
// Conecta os eventos do usuário (formulários, filtros e cliques nas listas)
// às funções do state.js. Não desenha nada — quem faz isso é o render.js,
// disparado automaticamente pelo notify() do state.

import { qs, qsa } from './utils.js';
import {
  state, addTask, toggleTask, deleteTask, setActiveTask, setFilter,
  setCategoriaFiltro, addCategoria, removeCategoria,
} from './state.js';

export function initTasks() {
  const form = qs('#task-form');
  const input = qs('#task-input');
  const prioritySelect = qs('#task-priority');
  const categoriaSelect = qs('#task-categoria');
  const filtersWrap = qs('.tasks-filters');
  const listEl = qs('#task-list');

  // ---------- Adicionar tarefa ----------
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const categoria_id = categoriaSelect.value ? Number(categoriaSelect.value) : null;
    const button = form.querySelector('button[type="submit"]');

    button.disabled = true; // evita criar a mesma tarefa duas vezes com clique duplo
    await addTask(input.value, prioritySelect.value, categoria_id);
    button.disabled = false;

    input.value = '';
    input.focus();
  });

  // ---------- Filtro por status ----------
  filtersWrap.addEventListener('click', (event) => {
    const pill = event.target.closest('.filter-pill');
    if (!pill) return;

    qsa('.filter-pill', filtersWrap).forEach((p) => p.classList.remove('active'));
    pill.classList.add('active');
    setFilter(pill.dataset.filter);
  });

  // ---------- Filtro por categoria (pílulas geradas pelo render) ----------
  qs('#categoria-filters').addEventListener('click', (event) => {
    const pill = event.target.closest('[data-categoria]');
    if (!pill) return;

    const valor = pill.dataset.categoria;
    setCategoriaFiltro(valor === 'all' || valor === 'none' ? valor : Number(valor));
  });

  // ---------- Concluir / focar / excluir tarefa ----------
  // Um único listener na lista (delegação de eventos), já que os itens
  // são recriados a cada render.
  listEl.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const id = Number(button.closest('.task-item')?.dataset.id);
    if (!id) return;

    if (button.dataset.action === 'toggle') toggleTask(id);
    else if (button.dataset.action === 'delete') deleteTask(id);
    else if (button.dataset.action === 'focus') setActiveTask(id);
  });

  initCategorias();
}

function initCategorias() {
  const form = qs('#categoria-form');
  const nomeInput = qs('#categoria-nome');
  const corInput = qs('#categoria-cor');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const antes = state.categorias.length;

    await addCategoria(nomeInput.value, corInput.value);

    // Só limpa o campo se a categoria foi criada (ex: nome repetido dá erro)
    if (state.categorias.length > antes) nomeInput.value = '';
  });

  qs('#categoria-list').addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="delete-categoria"]');
    if (!button) return;

    const id = Number(button.closest('.categoria-item').dataset.id);
    const categoria = state.categorias.find((c) => c.id === id);

    const ok = confirm(`Excluir a categoria "${categoria.nome}"?\nAs tarefas dela não serão apagadas, só ficarão sem categoria.`);
    if (ok) removeCategoria(id);
  });
}
