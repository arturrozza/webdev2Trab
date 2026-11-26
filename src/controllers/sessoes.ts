import type { Context } from "hono"
import { db } from "../database-connect"
import type { UsuarioLogado } from "../middleware/auth"

const usuarioId = (c: Context) => (c.get("usuario") as UsuarioLogado).id

// O banco guarda as datas em UTC (datetime('now')). Para agrupar "por dia"
// do jeito que o usuário enxerga, convertemos com o modificador 'localtime'
// (fuso do servidor — como o app roda localmente, é o fuso do usuário).
const DIA_LOCAL = "date(s.concluida_em, 'localtime')"

const SELECT_SESSAO = `
    SELECT s.id, s.modo, s.duracao_seg, s.concluida_em,
           t.id AS tarefa_id, t.titulo AS tarefa_titulo
    FROM sessoes_pomodoro s
    LEFT JOIN tarefas t ON t.id = s.tarefa_id
`

type SessaoDB = {
    id: number
    modo: string
    duracao_seg: number
    concluida_em: string
    tarefa_id: number | null
    tarefa_titulo: string | null
}

const formatar = (s: SessaoDB) => ({
    id: s.id,
    modo: s.modo,
    duracao_seg: s.duracao_seg,
    concluida_em: s.concluida_em,
    tarefa: s.tarefa_id === null ? null : { id: s.tarefa_id, titulo: s.tarefa_titulo },
})

export const create = (c: Context) => {
    const body = c.get("body")
    const uid = usuarioId(c)
    const tarefa_id = body.tarefa_id ?? null

    // Só pode vincular a sessão a uma tarefa do próprio usuário
    if (tarefa_id !== null) {
        const existe = db.query(`SELECT 1 FROM tarefas WHERE id = :id AND usuario_id = :uid`)
            .get({ ":id": tarefa_id, ":uid": uid })
        if (!existe) return c.json({ erro: "tarefa não encontrada" }, 400)
    }

    const { id } = db.query(`
        INSERT INTO sessoes_pomodoro (usuario_id, tarefa_id, modo, duracao_seg)
        VALUES (:usuario_id, :tarefa_id, :modo, :duracao_seg)
        RETURNING id
    `).get({
        ":usuario_id": uid,
        ":tarefa_id": tarefa_id,
        ":modo": body.modo,
        ":duracao_seg": body.duracao_seg,
    }) as { id: number }

    const sessao = db.query(`${SELECT_SESSAO} WHERE s.id = :id`).get({ ":id": id }) as SessaoDB
    return c.json(formatar(sessao), 201)
}

// Histórico das sessões mais recentes (?limite=20, máximo 100)
export const listAll = (c: Context) => {
    const limite = Math.min(Math.max(Number(c.req.query("limite") ?? 20) || 20, 1), 100)

    const sessoes = db.query(`
        ${SELECT_SESSAO}
        WHERE s.usuario_id = :usuario_id
        ORDER BY s.concluida_em DESC, s.id DESC
        LIMIT :limite
    `).all({ ":usuario_id": usuarioId(c), ":limite": limite }) as SessaoDB[]

    return c.json(sessoes.map(formatar))
}

export const deleteOne = (c: Context) => {
    const resultado = db.query(`
        DELETE FROM sessoes_pomodoro WHERE id = :id AND usuario_id = :usuario_id
    `).run({ ":id": Number(c.req.param("id")), ":usuario_id": usuarioId(c) })

    if (resultado.changes === 0) return c.json({ erro: "sessão não encontrada" }, 404)
    return c.body(null, 204)
}

// Resumo para o painel de estatísticas. Só conta sessões de FOCO
// (pausas não são tempo produtivo).
export const estatisticas = (c: Context) => {
    const params = { ":usuario_id": usuarioId(c) }

    const hoje = db.query(`
        SELECT COUNT(*) AS ciclos, COALESCE(SUM(s.duracao_seg), 0) AS segundos
        FROM sessoes_pomodoro s
        WHERE s.usuario_id = :usuario_id AND s.modo = 'focus'
          AND ${DIA_LOCAL} = date('now', 'localtime')
    `).get(params) as { ciclos: number; segundos: number }

    const total = db.query(`
        SELECT COUNT(*) AS ciclos, COALESCE(SUM(s.duracao_seg), 0) AS segundos
        FROM sessoes_pomodoro s
        WHERE s.usuario_id = :usuario_id AND s.modo = 'focus'
    `).get(params) as { ciclos: number; segundos: number }

    // Foco por dia nos últimos 7 dias (GROUP BY dia).
    // Dias sem nenhuma sessão não aparecem no resultado do SQL,
    // então completamos com zero logo abaixo.
    const porDiaDB = db.query(`
        SELECT ${DIA_LOCAL} AS dia, COUNT(*) AS ciclos, SUM(s.duracao_seg) AS segundos
        FROM sessoes_pomodoro s
        WHERE s.usuario_id = :usuario_id AND s.modo = 'focus'
          AND ${DIA_LOCAL} >= date('now', 'localtime', '-6 days')
        GROUP BY dia
    `).all(params) as { dia: string; ciclos: number; segundos: number }[]

    const dias = db.query(`
        WITH RECURSIVE d(n) AS (SELECT 6 UNION ALL SELECT n - 1 FROM d WHERE n > 0)
        SELECT date('now', 'localtime', '-' || n || ' days') AS dia FROM d
    `).all() as { dia: string }[]

    const ultimos7Dias = dias.map(({ dia }) =>
        porDiaDB.find((d) => d.dia === dia) ?? { dia, ciclos: 0, segundos: 0 })

    // Tarefas com mais tempo de foco (JOIN + GROUP BY + ORDER BY)
    const topTarefas = db.query(`
        SELECT t.id, t.titulo, COUNT(*) AS ciclos, SUM(s.duracao_seg) AS segundos
        FROM sessoes_pomodoro s
        JOIN tarefas t ON t.id = s.tarefa_id
        WHERE s.usuario_id = :usuario_id AND s.modo = 'focus'
        GROUP BY t.id
        ORDER BY segundos DESC
        LIMIT 5
    `).all(params)

    // Tempo de foco por categoria (dois JOINs: sessão -> tarefa -> categoria)
    const porCategoria = db.query(`
        SELECT c.id, c.nome, c.cor, COUNT(*) AS ciclos, SUM(s.duracao_seg) AS segundos
        FROM sessoes_pomodoro s
        JOIN tarefas t    ON t.id = s.tarefa_id
        JOIN categorias c ON c.id = t.categoria_id
        WHERE s.usuario_id = :usuario_id AND s.modo = 'focus'
        GROUP BY c.id
        ORDER BY segundos DESC
    `).all(params)

    return c.json({ hoje, total, ultimos7Dias, topTarefas, porCategoria })
}
