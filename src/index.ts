import { Hono } from "hono"
import { tarefasRoutes } from "./routes/tarefas"

const app = new Hono()

app.get("/", (c) => c.json({ status: "ok" }))
app.route("/tarefas", tarefasRoutes)

export default app