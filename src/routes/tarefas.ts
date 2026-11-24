import { Hono } from "hono"
import { type } from "arktype"
import * as tarefas from "../controllers/tarefas"
import { validar } from "../middleware/validar"
import { exigirLogin } from "../middleware/auth"

// "string.trim" tira espaços das pontas antes de checar o tamanho,
// então um título só com espaços é recusado.
const Titulo = type("string.trim").to("1 <= string <= 200")
const Prioridade = type("'low' | 'medium' | 'high'")
// id de uma categoria do usuário, ou null para "sem categoria"
const CategoriaId = type("number.integer > 0 | null")

const NovaTarefa = type({
    titulo: Titulo,
    "prioridade?": Prioridade,
    "categoria_id?": CategoriaId,
})

// PUT: substitui a tarefa inteira
const TarefaCompleta = type({
    titulo: Titulo,
    prioridade: Prioridade,
    concluida: "boolean",
    categoria_id: CategoriaId,
})

// PATCH: altera só o que vier (ex.: { "concluida": true }), mas pelo menos um campo
const TarefaParcial = type({
    "titulo?": Titulo,
    "prioridade?": Prioridade,
    "concluida?": "boolean",
    "categoria_id?": CategoriaId,
}).narrow((t, ctx) =>
    ["titulo", "prioridade", "concluida", "categoria_id"].some((campo) => campo in t)
    || ctx.mustBe("um objeto com titulo, prioridade, concluida ou categoria_id"))

export const tarefasRoutes = new Hono()
    .use(exigirLogin)
    .get("/", tarefas.listAll)
    .get("/:id", tarefas.listOne)
    .post("/", validar(NovaTarefa), tarefas.create)
    .put("/:id", validar(TarefaCompleta), tarefas.update)
    .patch("/:id", validar(TarefaParcial), tarefas.update)
    .delete("/:id", tarefas.deleteOne)
