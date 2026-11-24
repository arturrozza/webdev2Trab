// app.js
// Ponto de entrada da aplicação. Antes de tudo confere se há alguém logado
// (se não houver, o api.js já redireciona pro login), depois liga o render
// ao state, carrega os dados da API e inicializa tarefas e timer.

import { qs } from './utils.js';
import * as api from './api.js';
import { subscribe, onError, initState } from './state.js';
import { render, showError } from './render.js';
import { initTasks } from './tasks.js';
import { initTimer } from './timer.js';

async function init() {
  const usuario = await api.getMe().catch(() => null);
  if (!usuario) return; // api.js já mandou pra tela de login

  qs('#user-name').textContent = usuario.nome;
  qs('#btn-logout').addEventListener('click', async () => {
    await api.logout().catch(() => {});
    location.href = '/';
  });

  // Sempre que o state mudar, a tela é redesenhada
  subscribe(render);
  onError(showError);

  initTasks();
  initTimer();
  await initState(); // busca tarefas e categorias e dispara o primeiro render
}

init();
