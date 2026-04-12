# 0002 - Remoção do cache SSR em memória

**Data:** 2026-04-12
**Status:** aceito

## Contexto
O servidor SSR tinha um `Map` em memória que cacheava o HTML renderizado por URL. O cache não tinha limite de tamanho nem TTL.

Problemas identificados:
- **Memory leak**: cada URL única (incluindo query strings) criava uma entrada permanente. Rotas dinâmicas como `/video/:id?t=123` acumulavam entradas indefinidamente até OOM.
- **Dados stale**: conteúdo cacheado nunca expirava. Dados atualizados no banco continuavam servindo a versão antiga.
- **Benefício limitado**: requests com cookies (usuários logados) nunca usavam o cache — só visitantes anônimos se beneficiavam.

## Decisão
Remover completamente o cache SSR em memória. Cada request executa o pipeline completo: `render()` → `getData()` → `renderToString()`.

Caching deve ser feito em camada externa (CDN com `Cache-Control`, reverse proxy como nginx/Cloudflare) onde:
- Limites de tamanho e TTL são gerenciados pela infraestrutura
- Invalidação é controlável (purge por URL, por tag)
- O processo Node não carrega dados em memória

## Consequências
- Sem risco de memory leak no processo Node
- Cada request faz render completo (CPU), mas isso é o comportamento esperado de um SSR sem cache
- Consumidores que precisam de cache podem configurar na infra (CDN, Cloudflare Workers, etc.)
- `renderSsr` ficou significativamente mais simples (sem branches de cache/prod/cookies)
