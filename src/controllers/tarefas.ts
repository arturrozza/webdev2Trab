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
    pomodoros: number
    prioridade: string
    concluida: number
    criado_em: string
    categoria_id: number | null
    categoria_nome: string | null
    categoria_cor: string | null
}

// Monta o JSON da API: concluida vira booleano (SQLite guarda 0/1)
// e os dados da categoria vão agrupados num objeto (ou null).
const formatar = (t: TarefaDB) => ({
    id: t.id,
    titulo: t.titulo,
    prioridade: t.prioridade,
    concluida: t.concluida === 1,
    criado_em: t.criado_em,
    pomodoros: t.pomodoros,
    categoria: t.categoria_id === null ? null
        : { id: t.categoria_id, nome: t.categoria_nome, cor: t.categoria_cor },
})

// LEFT JOIN: tarefas sem categoria também aparecem (com categoria null)
const SELECT_TAREFAS = `
    SELECT t.id, t.titulo, t.prioridade, t.concluida, t.criado_em,
           c.id AS categoria_id, c.nome AS categoria_nome, c.cor AS categoria_cor,
           -- subconsulta: quantos ciclos de foco já foram feitos nesta tarefa
           (SELECT COUNT(*) FROM sessoes_pomodoro s
             WHERE s.tarefa_id = t.id AND s.modo = 'focus') AS pomodoros
    FROM tarefas t
    LEFT JOIN categorias c ON c.id = t.categoria_id
`

const buscar = (id: number, usuario_id: number) =>
    db.query(`${SELECT_TAREFAS} WHERE t.id = :id AND t.usuario_id = :usuario_id`)
        .get({ ":id": id, ":usuario_id": usuario_id }) as TarefaDB | null

// Impede vincular a tarefa a uma categoria de outro usuário (ou inexistente)
const categoriaValida = (categoria_id: number, usuario_id: number) =>
    !!db.query(`SELECT 1 FROM categorias WHERE id = :id AND usuario_id = :usuario_id`)
        .get({ ":id": categoria_id, ":usuario_id": usuario_id })

const ERRO_CATEGORIA = { erro: "categoria não encontrada" }

export const listAll = (c: Context) => {
    const filtros = ["t.usuario_id = :usuario_id"]
    const params: Record<string, number> = { ":usuario_id": usuarioId(c) }

    // ?status=pendentes | concluidas
    const status = c.req.query("status")
    if (status === "pendentes") filtros.push("t.concluida = 0")
    else if (status === "concluidas") filtros.push("t.concluida = 1")
    else if (status !== undefined)
        return c.json({ erro: "status deve ser 'pendentes' ou 'concluidas'" }, 400)

    // ?categoria=<id> | nenhuma
    const categoria = c.req.query("categoria")
    if (categoria === "nenhuma") filtros.push("t.categoria_id IS NULL")
    else if (categoria !== undefined) {
        if (!/^\d+$/.test(categoria))
            return c.json({ erro: "categoria deve ser um id ou 'nenhuma'" }, 400)
        filtros.push("t.categoria_id = :categoria_id")
        params[":categoria_id"] = Number(categoria)
    }

    const tarefas = db.query(`
        ${SELECT_TAREFAS}
        WHERE ${filtros.join(" AND ")}
        ORDER BY t.concluida, t.id DESC
    `).all(params) as TarefaDB[]

    return c.json(tarefas.map(formatar))
}

export const listOne = (c: Context) => {
    const tarefa = buscar(tarefaId(c), usuarioId(c))
    if (!tarefa) return c.json({ erro: "tarefa não encontrada" }, 404)
    return c.json(formatar(tarefa))
}

export const create = (c: Context) => {
    const body = c.get("body")
    const uid = usuarioId(c)
    const categoria_id = body.categoria_id ?? null

    if (categoria_id !== null && !categoriaValida(categoria_id, uid))
        return c.json(ERRO_CATEGORIA, 400)

    const { id } = db.query(`
        INSERT INTO tarefas (usuario_id, titulo, prioridade, categoria_id)
        VALUES (:usuario_id, :titulo, :prioridade, :categoria_id)
        RETURNING id
    `).get({
        ":usuario_id": uid,
        ":titulo": body.titulo,
        ":prioridade": body.prioridade ?? "medium",
        ":categoria_id": categoria_id,
    }) as { id: number }

    return c.json(formatar(buscar(id, uid)!), 201)
}

// Serve tanto para PUT (todos os campos) quanto para PATCH (só alguns).
// Quem decide quais campos são obrigatórios é o schema na rota; aqui,
// campo ausente vira NULL e o COALESCE mantém o valor que já estava no banco.
//
// categoria_id é diferente: null é um valor válido ("tirar da categoria"),
// então não dá pra usar COALESCE. O parâmetro :mudar_categoria diz se o
// campo veio no corpo; se não veio, a categoria atual é mantida.
export const update = (c: Context) => {
    const body = c.get("body")
    const uid = usuarioId(c)
    const mudarCategoria = "categoria_id" in body

    if (mudarCategoria && body.categoria_id !== null && !categoriaValida(body.categoria_id, uid))
        return c.json(ERRO_CATEGORIA, 400)

    const resultado = db.query(`
        UPDATE tarefas SET
            titulo       = COALESCE(:titulo, titulo),
            prioridade   = COALESCE(:prioridade, prioridade),
            concluida    = COALESCE(:concluida, concluida),
            categoria_id = CASE WHEN :mudar_categoria THEN :categoria_id ELSE categoria_id END
        WHERE id = :id AND usuario_id = :usuario_id
    `).run({
        ":id": tarefaId(c),
        ":usuario_id": uid,
        ":titulo": body.titulo ?? null,
        ":prioridade": body.prioridade ?? null,
        ":concluida": body.concluida === undefined ? null : Number(body.concluida),
        ":mudar_categoria": mudarCategoria ? 1 : 0,
        ":categoria_id": body.categoria_id ?? null,
    })

    if (resultado.changes === 0) return c.json({ erro: "tarefa não encontrada" }, 404)
    return c.json(formatar(buscar(tarefaId(c), uid)!))
}

export const deleteOne = (c: Context) => {
    const resultado = db.query(`
        DELETE FROM tarefas WHERE id = :id AND usuario_id = :usuario_id
    `).run({ ":id": tarefaId(c), ":usuario_id": usuarioId(c) })

    if (resultado.changes === 0) return c.json({ erro: "tarefa não encontrada" }, 404)
    return c.body(null, 204)
}
