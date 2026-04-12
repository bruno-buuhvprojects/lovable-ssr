# 0001 - Middleware único por servidor

**Data:** 2026-04-12
**Status:** aceito

## Contexto
Foi adicionado suporte a middleware no lovable-ssr para permitir validação de auth antes de carregar rotas. A questão era se deveria suportar múltiplos middlewares (array) ou apenas um.

## Decisão
Apenas um middleware pode ser registrado — via `createServer({ middleware })` ou via `registerMiddleware(fn)`. Se ambos forem configurados, o do config tem prioridade.

O consumidor que precisar de múltiplas verificações compõe dentro do próprio middleware:

```ts
middleware: async (ctx) => {
  const authResult = await checkAuth(ctx);
  if (authResult) return authResult;
  const maintenanceResult = await checkMaintenance(ctx);
  if (maintenanceResult) return maintenanceResult;
}
```

## Consequências
- API mais simples — sem necessidade de ordenação ou chain de middlewares
- Composição fica na mão do consumidor, que tem controle total da ordem
- Se no futuro precisar de múltiplos, pode ser adicionado sem quebrar a API existente (array com fallback para single)
