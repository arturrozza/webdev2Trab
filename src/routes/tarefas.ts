import { Hono } from "hono"
import * as tarefas from "../controllers/tarefas"

export const tarefasRoutes = new Hono()
  .get("/", tarefas.listAll)
  .get("/:id", tarefas.listOne)
  .post("/", tarefas.create)
  .put("/:id", tarefas.updateOne)
  .delete("/:id", tarefas.deleteOne)