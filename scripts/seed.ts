// Cria um usuário de demonstração com categorias, tarefas e uma semana de
// sessões de foco. Útil para apresentar o projeto sem ter que cadastrar tudo na mão.
//
//   bun run seed
//
// Login: demo@focusflow.com / demo123
// Rodar de novo recria o usuário demo do zero (os outros usuários não são tocados).

import { db } from "../src/database-connect"

const EMAIL = "demo@focusflow.com"
const SENHA = "demo123"

// Apagar o usuário apaga tudo dele em cascata (ON DELETE CASCADE)
db.run(`DELETE FROM usuarios WHERE email = ?`, [EMAIL])

const { id: usuarioId } = db.query(`
    INSERT INTO usuarios (nome, email, password_hash) VALUES (?, ?, ?) RETURNING id
`).get("Demo", EMAIL, await Bun.password.hash(SENHA)) as { id: number }

const categorias = [
    { nome: "Faculdade", cor: "#b5533f" },
    { nome: "Trabalho", cor: "#d4af37" },
    { nome: "Pessoal", cor: "#8a9a5b" },
]
const categoriaId: Record<string, number> = {}
for (const c of categorias) {
    const { id } = db.query(`
        INSERT INTO categorias (usuario_id, nome, cor) VALUES (?, ?, ?) RETURNING id
    `).get(usuarioId, c.nome, c.cor) as { id: number }
    categoriaId[c.nome] = id
}

const tarefas: [string, string, string | null, boolean][] = [
    // [título, prioridade, categoria, concluída]
    ["Trabalho final de Web Dev 2", "high", "Faculdade", false],
    ["Estudar SQL: JOIN e GROUP BY", "medium", "Faculdade", true],
    ["Revisar pull request do time", "medium", "Trabalho", false],
    ["Responder e-mails", "low", "Trabalho", true],
    ["Ler 20 páginas do livro", "low", "Pessoal", false],
    ["Organizar a mesa", "low", null, false],
]
const tarefaId: Record<string, number> = {}
for (const [titulo, prioridade, categoria, concluida] of tarefas) {
    const { id } = db.query(`
        INSERT INTO tarefas (usuario_id, titulo, prioridade, categoria_id, concluida)
        VALUES (?, ?, ?, ?, ?) RETURNING id
    `).get(usuarioId, titulo, prioridade, categoria ? categoriaId[categoria]! : null, concluida ? 1 : 0) as { id: number }
    tarefaId[titulo] = id
}

// Sessões de foco espalhadas pelos últimos 7 dias (dias atrás, tarefa, minutos)
const sessoes: [number, string | null, number][] = [
    [6, "Estudar SQL: JOIN e GROUP BY", 25], [6, "Estudar SQL: JOIN e GROUP BY", 25],
    [5, "Responder e-mails", 25],
    [4, "Trabalho final de Web Dev 2", 52], [4, "Trabalho final de Web Dev 2", 52],
    [4, "Revisar pull request do time", 25],
    [2, "Ler 20 páginas do livro", 25], [2, null, 25],
    [1, "Trabalho final de Web Dev 2", 90],
    [1, "Estudar SQL: JOIN e GROUP BY", 25],
    [0, "Trabalho final de Web Dev 2", 25], [0, "Trabalho final de Web Dev 2", 25],
]
const inserirSessao = db.query(`
    INSERT INTO sessoes_pomodoro (usuario_id, tarefa_id, modo, duracao_seg, concluida_em)
    VALUES (?, ?, ?, ?, datetime('now', ?))
`)
sessoes.forEach(([dias, tarefa, minutos], i) => {
    // horários diferentes no mesmo dia, sempre no passado
    const quando = `-${dias * 24 * 60 + 30 + i * 7} minutes`
    inserirSessao.run(usuarioId, tarefa ? tarefaId[tarefa]! : null, "focus", minutos * 60, quando)
    inserirSessao.run(usuarioId, null, "short", 5 * 60, quando) // a pausa depois do foco
})

console.log(`Usuário demo criado: ${EMAIL} / ${SENHA}`)
console.log(`${categorias.length} categorias, ${tarefas.length} tarefas, ${sessoes.length} sessões de foco`)
