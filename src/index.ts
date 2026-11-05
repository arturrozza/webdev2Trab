import { Hono } from "hono"
import { routes } from "./routes"

import paginaLogin from "../public/index.html"
import paginaHome from "../public/home.html"

const app = new Hono()
app.route("/", routes)

// Igual ao exemplo da aula: o Bun serve as páginas HTML
// e o que não for página cai no Hono (API).
const server = Bun.serve({
    port: Number(process.env.PORT ?? 3000),
    routes: {
        "/": paginaLogin,
        "/home": paginaHome,
    },
    fetch: app.fetch,
})

console.log(`Servidor rodando em ${server.url}`)
