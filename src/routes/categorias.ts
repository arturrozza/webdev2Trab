import { Hono } from "hono"
import { type } from "arktype"
import * as categorias from "../controllers/categorias"
import { validar } from "../middleware/validar"
import { exigirLogin } from "../middleware/auth"

const Nome = type("string.trim").to("1 <= string <= 50")
const Cor = type(/^#[0-9a-fA-F]{6}$/).describe("uma cor hexadecimal, ex.: #d4af37")

const NovaCategoria = type({
    nome: Nome,
    "cor?": Cor,
})

const CategoriaCompleta = type({
    nome: Nome,
    cor: Cor,
})

const CategoriaParcial = type({
    "nome?": Nome,
    "cor?": Cor,
}).narrow((cat, ctx) =>
    ["nome", "cor"].some((campo) => campo in cat)
    || ctx.mustBe("um objeto com nome ou cor"))

export const categoriasRoutes = new Hono()
    .use(exigirLogin)
    .get("/", categorias.listAll)
    .get("/:id", categorias.listOne)
    .post("/", validar(NovaCategoria), categorias.create)
    .put("/:id", validar(CategoriaCompleta), categorias.update)
    .patch("/:id", validar(CategoriaParcial), categorias.update)
    .delete("/:id", categorias.deleteOne)
