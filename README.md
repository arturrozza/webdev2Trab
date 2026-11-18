# FocusFlow — API + Web

Evolução do FocusFlow (organizador de tarefas com Pomodoro) com back-end em Bun + Hono + SQLite.

## Como rodar

```bash
bun install
bun run dev      # modo desenvolvimento (reinicia ao salvar)
# ou
bun run start    # sem watch
```

Depois abra http://localhost:3000

Para usar outra porta: `PORT=4000 bun run dev`

O banco `focusflow.db` é criado automaticamente na primeira execução.
