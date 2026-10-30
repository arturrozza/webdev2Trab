import { Database } from "bun:sqlite"

export const  db = new Database("focusflow.db", { create: true })

db.run("PRAGMA foreign_keys = ON")

db.run(`
    CREATE TABLE IF NOT EXISTS tarefas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        prioridade TEXT NOT NULL DEFAULT 'medium',
        concluida INTEGER NOT NULL DEFAULT 0
    )
`)