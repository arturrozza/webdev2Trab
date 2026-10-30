import type { Context } from "hono"
import { db } from "../database-connect"

export const create = async (c: Context) => {
    const body = await c.req.json()
    const query = db.query(`
        INSERT INTO tarefas (titulo, prioridade)
        VALUES (:titulo, :prioridade)
        RETURNING *    
    `)
    const tarefa = query.get({
        ":titulo": body.titulo,
        ":prioridade": body.prioridade ?? "medium",
    })
    return c.json(tarefa, 201)
}

export const listAll = (c: Context) => {
    const query = db.query(`SELECT * FROM tarefas`)
    return c.json(query.all())
}

export const listOne = (c: Context) => {
    const query = db.query(`SELECT * FROM tarefas WHERE id=:id`)
    const tarefa = query.get({ ":id": Number(c.req.param("id")) })
    if (!tarefa) return c.json({ erro: "Not Found" }, 404)
    return c.json(tarefa)
}

export const updateOne = async (c: Context) => {
    const body = await c.req.json()
    const query = db.query(`
        UPDATE tarefas
        SET titulo=:titulo, prioridade=:prioridade, concluida=:concluida
        WHERE id=:id
        RETURNING *
    `)
    const tarefa = query.get({
        ":id": Number(c.req.param("id")),
        ":titulo": body.titulo,
        ":prioridade": body.prioridade,
        ":concluida": body.concluida ? 1 : 0,
    })
    if (!tarefa) return c.json({ erro: "Not found "}, 404)
    return c.json(tarefa)
}




