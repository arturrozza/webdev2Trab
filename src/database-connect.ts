import { Database } from "bun:sqlite"

export const db = new Database("focusflow.db", { create: true })

db.run("PRAGMA foreign_keys = ON")

db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        nome          TEXT NOT NULL,
        email         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
    )
`)

// Sessões de login ficam no banco (e não em memória, como no exemplo da aula)
// para não derrubar todo mundo quando o servidor reinicia.
db.run(`
    CREATE TABLE IF NOT EXISTS sessoes_login (
        id         TEXT PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        expira_em  TEXT NOT NULL
    )
`)

// Cada usuário tem as próprias categorias; o nome não se repete para o mesmo usuário.
db.run(`
    CREATE TABLE IF NOT EXISTS categorias (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        nome       TEXT NOT NULL,
        cor        TEXT NOT NULL DEFAULT '#d4af37',
        criado_em  TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (usuario_id, nome)
    )
`)

// Apagar uma categoria não apaga as tarefas: elas só ficam sem categoria (SET NULL).
db.run(`
    CREATE TABLE IF NOT EXISTS tarefas (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
        titulo       TEXT NOT NULL,
        prioridade   TEXT NOT NULL DEFAULT 'medium'
                     CHECK (prioridade IN ('low', 'medium', 'high')),
        concluida    INTEGER NOT NULL DEFAULT 0 CHECK (concluida IN (0, 1)),
        criado_em    TEXT NOT NULL DEFAULT (datetime('now'))
    )
`)

// Migração: bancos criados antes das categorias não têm a coluna categoria_id.
// O CREATE TABLE IF NOT EXISTS não altera tabela existente, então adicionamos na mão.
function colunaExiste(tabela: string, coluna: string) {
    const colunas = db.query(`PRAGMA table_info(${tabela})`).all() as { name: string }[]
    return colunas.some((c) => c.name === coluna)
}

if (!colunaExiste("tarefas", "categoria_id"))
    db.run(`ALTER TABLE tarefas ADD COLUMN categoria_id INTEGER
            REFERENCES categorias(id) ON DELETE SET NULL`)

// Cada ciclo do timer que chega ao fim vira uma linha aqui (foco, pausa ou pausa longa).
// tarefa_id é a tarefa que estava "em foco" no timer; se ela for apagada,
// a sessão continua contando nas estatísticas, só perde o vínculo (SET NULL).
db.run(`
    CREATE TABLE IF NOT EXISTS sessoes_pomodoro (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        tarefa_id    INTEGER REFERENCES tarefas(id) ON DELETE SET NULL,
        modo         TEXT NOT NULL CHECK (modo IN ('focus', 'short', 'long')),
        duracao_seg  INTEGER NOT NULL CHECK (duracao_seg > 0),
        concluida_em TEXT NOT NULL DEFAULT (datetime('now'))
    )
`)

db.run(`CREATE INDEX IF NOT EXISTS idx_categorias_usuario ON categorias(usuario_id)`)
db.run(`CREATE INDEX IF NOT EXISTS idx_sessoes_usuario_data ON sessoes_pomodoro(usuario_id, concluida_em)`)
db.run(`CREATE INDEX IF NOT EXISTS idx_sessoes_tarefa ON sessoes_pomodoro(tarefa_id)`)
db.run(`CREATE INDEX IF NOT EXISTS idx_tarefas_usuario ON tarefas(usuario_id)`)
db.run(`CREATE INDEX IF NOT EXISTS idx_tarefas_categoria ON tarefas(categoria_id)`)
