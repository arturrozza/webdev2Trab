// api.js
// Substitui o antigo storage.js: é a ÚNICA camada que conversa com o servidor.
// Antes os dados ficavam no localStorage; agora vão para a API (SQLite),
// então cada usuário vê as mesmas tarefas em qualquer navegador.
//
// O cookie de sessão é enviado automaticamente pelo navegador (mesma origem),
// por isso nenhuma função aqui precisa lidar com login.

async function request(method, url, body) {
  const options = { method, headers: {} };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  // Sessão expirou ou não existe: volta pra tela de login
  if (response.status === 401) {
    location.href = '/';
    throw new Error('não autenticado');
  }

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.erro ?? `erro ${response.status}`);
  return data;
}

// ---------- Usuário ----------
export const getMe = () => request('GET', '/auth/me');
export const logout = () => request('POST', '/auth/logout');

// ---------- Tarefas ----------
export const getTarefas = () => request('GET', '/tarefas');
export const createTarefa = (dados) => request('POST', '/tarefas', dados);
export const updateTarefa = (id, campos) => request('PATCH', `/tarefas/${id}`, campos);
export const deleteTarefa = (id) => request('DELETE', `/tarefas/${id}`);

// ---------- Categorias ----------
export const getCategorias = () => request('GET', '/categorias');
export const createCategoria = (dados) => request('POST', '/categorias', dados);
export const deleteCategoria = (id) => request('DELETE', `/categorias/${id}`);

// ---------- Sessões do Pomodoro ----------
export const createSessao = (dados) => request('POST', '/sessoes', dados);
export const getEstatisticas = () => request('GET', '/sessoes/estatisticas');
