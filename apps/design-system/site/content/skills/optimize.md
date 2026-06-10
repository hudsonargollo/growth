---
tagline: "Diagnostique e corrija a performance da UI, do LCP ao tamanho do bundle."
---

## Quando usar

`/tektone optimize` é para interfaces que parecem lentas. O primeiro paint demora uma eternidade, o scroll trava, as imagens aparecem atrasadas, as interações ficam travadas, o bundle entrega 800KB de JavaScript. Use quando os Web Vitals estão ruins ou quando os usuários reclamam que as coisas estão lentas.

Não use como otimização prematura. Se o LCP está em 1,1s e o INP em 80ms, pare. O trabalho de design importa mais.

## Como funciona

A skill atua sobre cinco dimensões de performance:

1. **Loading e Web Vitals**: LCP, INP, CLS. Identifica o que está bloqueando o primeiro paint, o que está atrasando a interação, o que está deslocando o layout.
2. **Renderização**: re-renders desnecessários, memoização ausente, reconciliação custosa, layout thrash em loops.
3. **Animações**: há algo animando propriedades de layout, transforms e opacity são as únicas coisas tocadas, o `will-change` ajuda ou atrapalha aqui.
4. **Imagens e assets**: lazy loading, imagens responsivas (`srcset`, `sizes`), formatos modernos (WebP, AVIF), dimensões definidas para prevenir CLS.
5. **Tamanho do bundle**: imports não usados, dependências grandes demais, code-splitting ausente, código morto.

A skill mede antes e depois. Cada correção é quantificada. Se uma mudança não move uma métrica, ela é revertida.

## Experimente

```
/tektone optimize the homepage
```

Formato esperado:

```
LCP: 3.2s → 1.4s
  - Hero image preloaded (-800ms)
  - Removed render-blocking font stylesheet (-240ms)
  - Deferred analytics script (-180ms)

INP: 240ms → 90ms
  - Debounced scroll handler
  - Memoized expensive list render
  - Removed synchronous layout read in event loop

CLS: 0.18 → 0.02
  - Set dimensions on hero image and logo
  - Reserved space for async header badge

Bundle: 340KB → 180KB
  - Removed unused lodash import (52KB)
  - Code-split the playground route (78KB)
  - Dropped deprecated icon set (30KB)
```

## Armadilhas

- **Otimizar antes de medir.** Sem métricas de baseline, você não tem como saber o que ajudou. Rode `/tektone optimize` com números específicos de Web Vitals, não com achismo.
- **Correr atrás de ganhos minúsculos.** Uma melhora de 20ms no INP que leva uma semana raramente vale a pena. Otimização tem retornos decrescentes: saiba quando parar.
- **Esquecer de medir de novo após cada mudança.** O build pode ter piorado as coisas de um jeito que a skill não previu. Verifique.
