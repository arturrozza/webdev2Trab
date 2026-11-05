import { Hono } from "hono"
import { type } from "arktype"
import * as usuarios from "../controllers/usuarios"
import { validar } from "../middleware/validar"

const NovoUsuario = type({
    nome: "string >= 2",
    email: "string.email",
    senha: "string >= 6",
})

export const usuariosRoutes = new Hono()
    .post("/", validar(NovoUsuario), usuarios.create)
