import { Hono } from "hono"
import { type } from "arktype"
import * as sessoes from "../controllers/sessoes"
import { validar } from "../middleware/validar"
import { exigirLogin } from "../middleware/auth"

const NovaSessao = type({
    modo: "'focus' | 'short' | 'long'",
    // até 3h: o maior preset do timer é 90 min
    duracao_seg: "1 <= number.integer <= 10800",
    "tarefa_id?": "number.integer > 0 | null",
})

export const sessoesRoutes = new Hono()
    .use(exigirLogin)
    .get("/", sessoes.listAll)
    .get("/estatisticas", sessoes.estatisticas)
    .post("/", validar(NovaSessao), sessoes.create)
    .delete("/:id", sessoes.deleteOne)
