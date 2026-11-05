import { type, type Type } from "arktype"
import type { Context, Next } from "hono"

// Valida o corpo JSON da requisição com um schema do arktype.
// Se estiver ok, guarda o resultado já validado em c.get("body").
export function validar(schema: Type) {
    return async (c: Context, next: Next) => {
        let body: unknown
        try {
            body = await c.req.json()
        } catch {
            return c.json({ erro: "JSON inválido" }, 400)
        }

        const out = schema(body)
        if (out instanceof type.errors)
            return c.json({ erro: out.summary }, 400)

        c.set("body", out)
        await next()
    }
}
