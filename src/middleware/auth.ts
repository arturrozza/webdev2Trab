import type { Context, Next } from "hono"
import { getCookie, deleteCookie } from "hono/cookie"
import { db } from "../database-connect"

export const COOKIE_SESSAO = "ses"

export type UsuarioLogado = { id: number; nome: string; email: string }

// Bloqueia a rota se não houver uma sessão válida.
// Se houver, disponibiliza o usuário em c.get("usuario").
export async function exigirLogin(c: Context, next: Next) {
    const sessaoId = getCookie(c, COOKIE_SESSAO)
    if (!sessaoId)
        return c.json({ erro: "não autenticado" }, 401)

    const usuario = db.query(`
        SELECT u.id, u.nome, u.email
        FROM sessoes_login s
        JOIN usuarios u ON u.id = s.usuario_id
        WHERE s.id = :id AND s.expira_em > datetime('now')
    `).get({ ":id": sessaoId }) as UsuarioLogado | null

    if (!usuario) {
        deleteCookie(c, COOKIE_SESSAO, { path: "/" })
        return c.json({ erro: "sessão inválida ou expirada" }, 401)
    }

    c.set("usuario", usuario)
    await next()
}
