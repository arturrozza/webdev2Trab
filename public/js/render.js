// render.js
// Única responsabilidade: pegar o estado atual e desenhar na tela.
// Não decide regras de negócio e não fala com a API — só renderiza.

import { qs, escapeHtml } from './utils.js';
import { state, getFilteredTasks, getTaskCounts, countByCategoria } from './state.js';

export function render() {
  renderTasks();
  renderCounts();
  renderCategorias();
  renderEstatisticas();
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

    const pomodoros = task.pomodoros > 0
      ? `<span class="task-pomodoros" title="${task.pomodoros} ciclo(s) de foco nesta tarefa">🍅 ${task.pomodoros}</span>`
      : '';

    li.innerHTML = `
      <button class="task-checkbox" data-action="toggle" aria-label="Marcar como concluída"></button>
      <span class="task-title">${escapeHtml(task.titulo)}</span>
      ${pomodoros}
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

// ---------- Estatísticas ----------

/** 6120 -> "1h 42min", 1500 -> "25 min", 0 -> "0 min" */
function formatDuracao(segundos) {
  const min = Math.round(segundos / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const resto = min % 60;
  return resto ? `${h}h ${resto}min` : `${h}h`;
}

/** "2026-11-24" -> "ter" (dia da semana abreviado) */
function diaSemana(dia) {
  // meio-dia evita que o fuso horário empurre a data para o dia anterior
  return new Date(`${dia}T12:00:00`)
    .toLocaleDateString('pt-BR', { weekday: 'short' })
    .replace('.', '');
}

function renderEstatisticas() {
  const e = state.estatisticas;
  if (!e) return;

  qs('#stat-hoje').textContent = formatDuracao(e.hoje.segundos);
  qs('#stat-ciclos').textContent = e.hoje.ciclos;
  qs('#stat-total').textContent = formatDuracao(e.total.segundos);

  renderGraficoSemana(e.ultimos7Dias);
  renderTopTarefas(e.topTarefas);
}

// Gráfico de barras de série única (minutos de foco por dia).
// Uma cor só, sem legenda (o título já diz o que é); o valor de cada
// dia aparece no tooltip (hover/foco do teclado) e no aria-label.
function renderGraficoSemana(dias) {
  const grafico = qs('#grafico-semana');
  const max = Math.max(...dias.map((d) => d.segundos), 1);
  const hoje = dias[dias.length - 1].dia;

  grafico.innerHTML = dias.map((d) => {
    const altura = (d.segundos / max) * 100;
    const texto = `${formatDuracao(d.segundos)} · ${d.ciclos} ciclo${d.ciclos === 1 ? '' : 's'}`;
    const ehHoje = d.dia === hoje;
    return `
      <div class="barra-col${ehHoje ? ' hoje' : ''}" tabindex="0" role="listitem"
           data-tip="${texto}" aria-label="${diaSemana(d.dia)}: ${texto}">
        <div class="barra-area">
          <div class="barra${d.segundos === 0 ? ' vazia' : ''}" style="height: ${altura}%"></div>
        </div>
        <span class="barra-dia">${ehHoje ? 'hoje' : diaSemana(d.dia)}</span>
      </div>`;
  }).join('');
}

function renderTopTarefas(tarefas) {
  const lista = qs('#top-tarefas');
  if (tarefas.length === 0) {
    lista.innerHTML = '<li class="top-vazio">Selecione uma tarefa (○) e complete um ciclo de foco para ela aparecer aqui.</li>';
    return;
  }
  lista.innerHTML = tarefas.map((t) => `
    <li>
      <span class="top-titulo">${escapeHtml(t.titulo)}</span>
      <span class="top-valor">${formatDuracao(t.segundos)} · 🍅 ${t.ciclos}</span>
    </li>`).join('');
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
