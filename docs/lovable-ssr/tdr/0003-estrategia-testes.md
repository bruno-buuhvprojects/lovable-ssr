# 0003 - Estratégia de testes: vitest + playwright

**Data:** 2026-04-12
**Status:** aceito

## Contexto
O projeto não tinha nenhuma infraestrutura de testes. Foi necessário validar tanto a lógica interna da lib quanto o comportamento real de navegação SSR/SPA no browser.

## Decisão
Três camadas de testes:

1. **Unitários (vitest + happy-dom)**: funções puras e módulos isolados — `parseCookies`, `escapeHtml`, `RouterService`, `buildHeadHtml`, `buildRouteKey`, registry
2. **Integração (vitest + happy-dom)**: pipeline `render()` completo — registra rotas com componentes de teste, verifica HTML gerado, preloadedData, helmet, getData com params/requestContext
3. **E2E (playwright)**: navegação real no browser — SSR carrega dados, navegação client-side funciona, voltar (back) preserva dados

**Vitest** foi escolhido porque o projeto já usa Vite. **Playwright** para e2e porque testa navegação real com browser headless.

### E2E fixture
O fixture e2e (`e2e/fixtures/`) usa um server Express + Vite customizado (não o `createServer` do dist) para evitar o problema de dual registry: quando `createServer` do dist importa `dist/registry.js` mas Vite ssrLoadModule resolve `src/registry.ts`, as rotas registradas ficam em módulos diferentes. O fixture resolve tudo via Vite para garantir um único registry.

## Consequências
- Testes unitários rodam em ~1s, integração em ~1.5s
- E2E requer Playwright instalado (browsers) e roda em ~3s
- O fixture e2e é independente do `createServer` da lib — mudanças no server precisam de atenção para manter o fixture alinhado
- Scripts: `yarn test` (unit + integração), `yarn test:e2e` (playwright)
