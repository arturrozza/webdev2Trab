import { Hono } from "hono"
import { authRoutes } from "./auth"
import { usuariosRoutes } from "./usuarios"
import { tarefasRoutes } from "./tarefas"
import { categoriasRoutes } from "./categorias"
import { sessoesRoutes } from "./sessoes"

export const routes = new Hono()
    .get("/status", (c) => c.json({ status: "ok" }))
    .route("/auth", authRoutes)
    .route("/usuarios", usuariosRoutes)
    .route("/tarefas", tarefasRoutes)
    .route("/categorias", categoriasRoutes)
    .route("/sessoes", sessoesRoutes)
