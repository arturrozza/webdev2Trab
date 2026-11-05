import type { Context } from "hono"
import { db } from "../database-connect"

export const create = async (c: Context) => {
    const body = c.get("body")

    // email é UNIQUE no banco, mas checar antes permite uma mensagem clara
    const existe = db.query(`SELECT 1 FROM usuarios WHERE email = :email`)
        .get({ ":email": body.email })
    if (existe)
        return c.json({ erro: "email já cadastrado" }, 409)

    const usuario = db.query(`
        INSERT INTO usuarios (nome, email, password_hash)
        VALUES (:nome, :email, :password_hash)
        RETURNING id, nome, email
    `).get({
        ":nome": body.nome,
        ":email": body.email,
        ":password_hash": await Bun.password.hash(body.senha),
    })

    return c.json(usuario, 201)
}
