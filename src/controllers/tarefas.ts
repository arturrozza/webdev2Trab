import type { Context } from "hono"
import { db } from "../database-connect"
import type { UsuarioLogado } from "../middleware/auth"

// Todas as rotas de tarefas passam pelo exigirLogin, então o usuário sempre existe.
// Toda query filtra por usuario_id: ninguém enxerga nem altera tarefa de outra pessoa
// (tentar acessar a tarefa de outro usuário dá 404, como se ela não existisse).
const usuarioId = (c: Context) => (c.get("usuario") as UsuarioLogado).id
const tarefaId = (c: Context) => Number(c.req.param("id"))

type TarefaDB = {
    id: number
    titulo: string
    prioridade: string
    concluida: number
    criado_em: string
}

// O SQLite não tem booleano (guarda 0/1); a API devolve true/false.
const formatar = (t: TarefaDB) => ({ ...t, concluida: t.concluida === 1 })

const COLUNAS = "id, titulo, prioridade, concluida, criado_em"

export const listAll = (c: Context) => {
    // filtro opcional: /tarefas?status=pendentes | concluidas
    const status = c.req.query("status")
    let filtro = ""
    if (status === "pendentes") filtro = "AND concluida = 0"
    else if (status === "concluidas") filtro = "AND concluida = 1"
    else if (status !== undefined)
        return c.json({ erro: "status deve ser 'pendentes' ou 'concluidas'" }, 400)

    const tarefas = db.query(`
        SELECT ${COLUNAS} FROM tarefas
        WHERE usuario_id = :usuario_id ${filtro}
        ORDER BY concluida, id DESC
    `).all({ ":usuario_id": usuarioId(c) }) as TarefaDB[]

    return c.json(tarefas.map(formatar))
}

export const listOne = (c: Context) => {
    const tarefa = db.query(`
        SELECT ${COLUNAS} FROM tarefas
        WHERE id = :id AND usuario_id = :usuario_id
    `).get({ ":id": tarefaId(c), ":usuario_id": usuarioId(c) }) as TarefaDB | null

    if (!tarefa) return c.json({ erro: "tarefa não encontrada" }, 404)
    return c.json(formatar(tarefa))
}

export const create = (c: Context) => {
    const body = c.get("body")
    const tarefa = db.query(`
        INSERT INTO tarefas (usuario_id, titulo, prioridade)
        VALUES (:usuario_id, :titulo, :prioridade)
        RETURNING ${COLUNAS}
    `).get({
        ":usuario_id": usuarioId(c),
        ":titulo": body.titulo,
        ":prioridade": body.prioridade ?? "medium",
    }) as TarefaDB

    return c.json(formatar(tarefa), 201)
}

// Serve tanto para PUT (todos os campos) quanto para PATCH (só alguns).
// Quem decide quais campos são obrigatórios é o schema na rota; aqui,
// campo ausente vira NULL e o COALESCE mantém o valor que já estava no banco.
export const update = (c: Context) => {
    const body = c.get("body")
    const tarefa = db.query(`
        UPDATE tarefas SET
            titulo     = COALESCE(:titulo, titulo),
            prioridade = COALESCE(:prioridade, prioridade),
            concluida  = COALESCE(:concluida, concluida)
        WHERE id = :id AND usuario_id = :usuario_id
        RETURNING ${COLUNAS}
    `).get({
        ":id": tarefaId(c),
        ":usuario_id": usuarioId(c),
        ":titulo": body.titulo ?? null,
        ":prioridade": body.prioridade ?? null,
        ":concluida": body.concluida === undefined ? null : Number(body.concluida),
    }) as TarefaDB | null

    if (!tarefa) return c.json({ erro: "tarefa não encontrada" }, 404)
    return c.json(formatar(tarefa))
}

export const deleteOne = (c: Context) => {
    const resultado = db.query(`
        DELETE FROM tarefas WHERE id = :id AND usuario_id = :usuario_id
    `).run({ ":id": tarefaId(c), ":usuario_id": usuarioId(c) })

    if (resultado.changes === 0) return c.json({ erro: "tarefa não encontrada" }, 404)
    return c.body(null, 204)
}
