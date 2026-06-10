---
tagline: "Leve uma interface além dos limites convencionais. Shaders, física, 60fps, transições cinematográficas."
---

## Quando usar

`/tektone overdrive` é para os momentos em que você quer impressionar. Um hero que usa WebGL. Uma tabela que lida com um milhão de linhas. Um dialog que se transforma a partir do elemento que o aciona. Um formulário que valida em tempo real com feedback em streaming. Uma transição de página que parece cinematográfica. Use quando o orçamento do projeto permite ambição técnica e o resultado precisa parecer extraordinário.

Não use em ferramentas operacionais, dashboards ou qualquer coisa em que confiabilidade vale mais que espetáculo. O overdrive queima complexidade em troca de efeito, e essa troca só vale a pena em momentos que importam.

## Como funciona

A skill escolhe um único momento para tornar extraordinário e se compromete com ele, em vez de espalhar o esforço pela interface inteira. Em seguida, ela recorre a técnicas que a maioria das UIs geradas por IA nunca toca: shaders WebGL, física de molas (spring physics), Scroll Timeline, View Transitions, animação em canvas, filtros acelerados por GPU. Tudo é orçado, perfilado e testado a 60fps, com fallbacks de reduced-motion já incorporados.

A saída do overdrive é anunciada com `──── ⚡ OVERDRIVE ────`, então você sabe que está entrando em um modo mais ambicioso. Espere diffs maiores, novas dependências e profundidade de implementação além do que as outras skills produzem.

## Experimente

```
/tektone overdrive the landing hero
```

One concrete run might replace a static hero with a WebGL shader background driven by mouse position, a display headline that reveals with a mask on scroll using the Scroll Timeline API, and a View Transition on the CTA that morphs into the next page. Plus a reduced-motion fallback that swaps all of it for a clean static composition.

## Pitfalls

- **Using it everywhere.** Overdrive works because it is rare. If every page has cinematic moments, none of them are cinematic.
- **Shipping without reduced-motion fallbacks.** Non-negotiable. Overdrive adds them automatically; do not remove them.
- **Ignoring performance.** Extraordinary moments still need to hit 60fps. If the effect drops frames, cut it or optimize. Slow spectacle is worse than simple done well.
- **Running overdrive before the base interface is solid.** Spectacle on a broken foundation reads as distraction, not delight.
