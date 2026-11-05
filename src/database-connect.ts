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

db.run(`
    CREATE TABLE IF NOT EXISTS tarefas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        prioridade TEXT NOT NULL DEFAULT 'medium',
        concluida INTEGER NOT NULL DEFAULT 0
    )
`)
