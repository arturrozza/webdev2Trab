import { Hono } from "hono"
import { type } from "arktype"
import * as tarefas from "../controllers/tarefas"
import { validar } from "../middleware/validar"
import { exigirLogin } from "../middleware/auth"

// "string.trim" tira espaços das pontas antes de checar o tamanho,
// então um título só com espaços é recusado.
const Titulo = type("string.trim").to("1 <= string <= 200")
const Prioridade = type("'low' | 'medium' | 'high'")

const NovaTarefa = type({
    titulo: Titulo,
    "prioridade?": Prioridade,
})

// PUT: substitui a tarefa inteira
const TarefaCompleta = type({
    titulo: Titulo,
    prioridade: Prioridade,
    concluida: "boolean",
})

// PATCH: altera só o que vier (ex.: { "concluida": true }), mas pelo menos um campo
const TarefaParcial = type({
    "titulo?": Titulo,
    "prioridade?": Prioridade,
    "concluida?": "boolean",
}).narrow((t, ctx) =>
    ["titulo", "prioridade", "concluida"].some((campo) => campo in t)
    || ctx.mustBe("um objeto com titulo, prioridade ou concluida"))

export const tarefasRoutes = new Hono()
    .use(exigirLogin)
    .get("/", tarefas.listAll)
    .get("/:id", tarefas.listOne)
    .post("/", validar(NovaTarefa), tarefas.create)
    .put("/:id", validar(TarefaCompleta), tarefas.update)
    .patch("/:id", validar(TarefaParcial), tarefas.update)
    .delete("/:id", tarefas.deleteOne)
