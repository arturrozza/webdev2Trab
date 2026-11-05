import type { Context } from "hono"
import { setCookie, getCookie, deleteCookie } from "hono/cookie"
import { db } from "../database-connect"
import { COOKIE_SESSAO } from "../middleware/auth"

const DURACAO_SESSAO_DIAS = 7

export const login = async (c: Context) => {
    const body = c.get("body")

    const usuario = db.query(`
        SELECT id, nome, email, password_hash FROM usuarios WHERE email = :email
    `).get({ ":email": body.email }) as
        { id: number; nome: string; email: string; password_hash: string } | null

    // Mesma resposta para "email não existe" e "senha errada":
    // assim ninguém descobre quais emails estão cadastrados.
    const senhaOk = usuario && await Bun.password.verify(body.senha, usuario.password_hash)
    if (!usuario || !senhaOk)
        return c.json({ erro: "email ou senha inválidos" }, 401)

    const sessaoId = crypto.randomUUID()
    db.query(`
        INSERT INTO sessoes_login (id, usuario_id, expira_em)
        VALUES (:id, :usuario_id, datetime('now', :duracao))
    `).run({
        ":id": sessaoId,
        ":usuario_id": usuario.id,
        ":duracao": `+${DURACAO_SESSAO_DIAS} days`,
    })

    setCookie(c, COOKIE_SESSAO, sessaoId, {
        path: "/",
        httpOnly: true,   // JS da página não consegue ler o cookie
        sameSite: "Lax",
        maxAge: DURACAO_SESSAO_DIAS * 24 * 60 * 60,
    })

    return c.json({ id: usuario.id, nome: usuario.nome, email: usuario.email })
}

export const logout = (c: Context) => {
    const sessaoId = getCookie(c, COOKIE_SESSAO)
    if (sessaoId)
        db.query(`DELETE FROM sessoes_login WHERE id = :id`).run({ ":id": sessaoId })
    deleteCookie(c, COOKIE_SESSAO, { path: "/" })
    return c.body(null, 204)
}

// Requer o middleware exigirLogin antes
export const me = (c: Context) => c.json(c.get("usuario"))
