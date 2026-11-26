// state.js
// Guarda o estado da aplicação e é o único lugar que pode alterá-lo.
// A diferença para a versão antiga: cada ação agora PRIMEIRO chama a API e,
// só se o servidor aceitar, atualiza o estado e avisa a tela (notify).
// Assim a tela nunca mostra algo que não foi salvo de verdade.

import * as api from './api.js';

export const state = {
  tarefas: [],          // { id, titulo, prioridade, concluida, criado_em, categoria }
  categorias: [],       // { id, nome, cor }
  filter: 'all',        // 'all' | 'pending' | 'done'
  categoriaFiltro: 'all', // 'all' | 'none' | id da categoria
  activeTaskId: null,   // tarefa em foco no timer
  estatisticas: null,   // resumo vindo de /sessoes/estatisticas
};

// ---------- pub/sub ----------
const listeners = [];
const errorListeners = [];

export function subscribe(fn) {
  listeners.push(fn);
}

/** Quem quiser mostrar mensagens de erro (ex: o render) se inscreve aqui */
export function onError(fn) {
  errorListeners.push(fn);
}

function notify() {
  listeners.forEach((fn) => fn(state));
}

function reportError(err) {
  console.error(err);
  errorListeners.forEach((fn) => fn(err.message));
}

// Embrulha uma ação assíncrona: se a API recusar, mostra o erro
// em vez de deixar a promise rejeitada solta.
function action(fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (err) {
      reportError(err);
    }
  };
}

// ---------- Carregamento inicial ----------
export const initState = action(async () => {
  const [tarefas, categorias, estatisticas] = await Promise.all([
    api.getTarefas(), api.getCategorias(), api.getEstatisticas(),
  ]);
  state.tarefas = tarefas;
  state.categorias = categorias;
  state.estatisticas = estatisticas;
  notify();
});

// ---------- Sessões do Pomodoro ----------
/**
 * Chamado pelo timer sempre que um ciclo chega ao fim.
 * Salva a sessão vinculada à tarefa em foco (se houver) e atualiza as estatísticas.
 */
export const registrarSessao = action(async (modo, duracao_seg) => {
  const tarefa_id = state.activeTaskId;
  await api.createSessao({ modo, duracao_seg, tarefa_id });

  if (modo === 'focus' && tarefa_id !== null) {
    const tarefa = state.tarefas.find((t) => t.id === tarefa_id);
    if (tarefa) tarefa.pomodoros += 1;
  }

  // As estatísticas são calculadas no servidor (GROUP BY), então buscamos de novo
  state.estatisticas = await api.getEstatisticas();
  notify();
});

// ---------- Tarefas ----------
export const addTask = action(async (titulo, prioridade = 'medium', categoria_id = null) => {
  const trimmed = titulo.trim();
  if (!trimmed) return;

  const nova = await api.createTarefa({ titulo: trimmed, prioridade, categoria_id });
  state.tarefas.unshift(nova);
  notify();
});

export const toggleTask = action(async (id) => {
  const tarefa = state.tarefas.find((t) => t.id === id);
  if (!tarefa) return;

  const atualizada = await api.updateTarefa(id, { concluida: !tarefa.concluida });
  Object.assign(tarefa, atualizada);
  notify();
});

export const deleteTask = action(async (id) => {
  await api.deleteTarefa(id);
  state.tarefas = state.tarefas.filter((t) => t.id !== id);

  // Se era a tarefa "em foco" no timer, limpa o vínculo
  if (state.activeTaskId === id) state.activeTaskId = null;
  notify();
});

/** Clicar de novo na mesma tarefa desmarca. Só existe no front (não vai pra API). */
export function setActiveTask(id) {
  state.activeTaskId = state.activeTaskId === id ? null : id;
  notify();
}

export function getActiveTask() {
  return state.tarefas.find((t) => t.id === state.activeTaskId) || null;
}

// ---------- Categorias ----------
export const addCategoria = action(async (nome, cor) => {
  const trimmed = nome.trim();
  if (!trimmed) return;

  const nova = await api.createCategoria({ nome: trimmed, cor });
  state.categorias.push(nova);
  state.categorias.sort((a, b) => a.nome.localeCompare(b.nome));
  notify();
});

export const removeCategoria = action(async (id) => {
  await api.deleteCategoria(id);
  state.categorias = state.categorias.filter((c) => c.id !== id);

  // No banco as tarefas ficam sem categoria (ON DELETE SET NULL); espelha isso aqui
  state.tarefas.forEach((t) => {
    if (t.categoria?.id === id) t.categoria = null;
  });
  if (state.categoriaFiltro === id) state.categoriaFiltro = 'all';
  notify();
});

// ---------- Filtros ----------
export function setFilter(filter) {
  state.filter = filter;
  notify();
}

export function setCategoriaFiltro(valor) {
  state.categoriaFiltro = valor;
  notify();
}

/** Tarefas já filtradas por status e categoria — é o que o render desenha. */
export function getFilteredTasks() {
  return state.tarefas.filter((t) => {
    if (state.filter === 'pending' && t.concluida) return false;
    if (state.filter === 'done' && !t.concluida) return false;

    if (state.categoriaFiltro === 'none') return t.categoria === null;
    if (state.categoriaFiltro !== 'all') return t.categoria?.id === state.categoriaFiltro;
    return true;
  });
}

/** Contadores do cabeçalho ("3 pendentes", "2 concluídas") */
export function getTaskCounts() {
  const done = state.tarefas.filter((t) => t.concluida).length;
  return { pending: state.tarefas.length - done, done };
}

/** Quantas tarefas cada categoria tem (pra mostrar ao lado do nome) */
export function countByCategoria(id) {
  return state.tarefas.filter((t) => t.categoria?.id === id).length;
}
