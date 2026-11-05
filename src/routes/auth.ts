import { Hono } from "hono"
import { type } from "arktype"
import * as auth from "../controllers/auth"
import { validar } from "../middleware/validar"
import { exigirLogin } from "../middleware/auth"

const Login = type({
    email: "string.email",
    senha: "string",
})

export const authRoutes = new Hono()
    .post("/login", validar(Login), auth.login)
    .post("/logout", auth.logout)
    .get("/me", exigirLogin, auth.me)
