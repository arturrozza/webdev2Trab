import type { Context } from "hono"
import { SQLiteError } from "bun:sqlite"
import { db } from "../database-connect"
import type { UsuarioLogado } from "../middleware/auth"

const usuarioId = (c: Context) => (c.get("usuario") as UsuarioLogado).id
const categoriaId = (c: Context) => Number(c.req.param("id"))

const nomeRepetido = (e: unknown) =>
    e instanceof SQLiteError && e.code === "SQLITE_CONSTRAINT_UNIQUE"

// Lista as categorias com a contagem de tarefas de cada uma (LEFT JOIN + GROUP BY:
// categorias sem nenhuma tarefa também aparecem, com total 0).
export const listAll = (c: Context) => {
    const categorias = db.query(`
        SELECT c.id, c.nome, c.cor, c.criado_em,
               COUNT(t.id)                  AS total_tarefas,
               COALESCE(SUM(t.concluida), 0) AS tarefas_concluidas
        FROM categorias c
        LEFT JOIN tarefas t ON t.categoria_id = c.id
        WHERE c.usuario_id = :usuario_id
        GROUP BY c.id
        ORDER BY c.nome
    `).all({ ":usuario_id": usuarioId(c) })

    return c.json(categorias)
}

export const listOne = (c: Context) => {
    const categoria = db.query(`
        SELECT id, nome, cor, criado_em FROM categorias
        WHERE id = :id AND usuario_id = :usuario_id
    `).get({ ":id": categoriaId(c), ":usuario_id": usuarioId(c) })

    if (!categoria) return c.json({ erro: "categoria não encontrada" }, 404)
    return c.json(categoria)
}

export const create = (c: Context) => {
    const body = c.get("body")
    try {
        const categoria = db.query(`
            INSERT INTO categorias (usuario_id, nome, cor)
            VALUES (:usuario_id, :nome, COALESCE(:cor, '#d4af37'))
            RETURNING id, nome, cor, criado_em
        `).get({
            ":usuario_id": usuarioId(c),
            ":nome": body.nome,
            ":cor": body.cor ?? null,
        })
        return c.json(categoria, 201)
    } catch (e) {
        if (nomeRepetido(e)) return c.json({ erro: "já existe uma categoria com esse nome" }, 409)
        throw e
    }
}

// PUT e PATCH (mesma ideia das tarefas: campo ausente mantém o valor atual)
export const update = (c: Context) => {
    const body = c.get("body")
    try {
        const categoria = db.query(`
            UPDATE categorias SET
                nome = COALESCE(:nome, nome),
                cor  = COALESCE(:cor, cor)
            WHERE id = :id AND usuario_id = :usuario_id
            RETURNING id, nome, cor, criado_em
        `).get({
            ":id": categoriaId(c),
            ":usuario_id": usuarioId(c),
            ":nome": body.nome ?? null,
            ":cor": body.cor ?? null,
        })
        if (!categoria) return c.json({ erro: "categoria não encontrada" }, 404)
        return c.json(categoria)
    } catch (e) {
        if (nomeRepetido(e)) return c.json({ erro: "já existe uma categoria com esse nome" }, 409)
        throw e
    }
}

// As tarefas da categoria não são apagadas: ficam sem categoria (ON DELETE SET NULL).
export const deleteOne = (c: Context) => {
    const resultado = db.query(`
        DELETE FROM categorias WHERE id = :id AND usuario_id = :usuario_id
    `).run({ ":id": categoriaId(c), ":usuario_id": usuarioId(c) })

    if (resultado.changes === 0) return c.json({ erro: "categoria não encontrada" }, 404)
    return c.body(null, 204)
}
