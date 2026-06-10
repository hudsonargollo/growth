---
tagline: "O passo final meticuloso entre o bom e o excelente."
---

## Quando usar

`/tektone polish` é a última coisa que você roda antes do deploy. Ele caça os pequenos detalhes que separam uma feature entregue de uma feature polida: desalinhamentos de meio pixel, espaçamento inconsistente, estados de foco esquecidos, transições de carregamento que piscam, copy que sai do tom. Ele também alinha a feature ao seu design system, substituindo valores hard-coded por tokens, trocando componentes customizados pelos compartilhados e corrigindo qualquer desvio dos padrões estabelecidos.

Recorra a ele quando a feature está funcionalmente completa, nada está quebrado, e algo ainda parece fora do lugar. Recorra a ele também quando uma feature se afastou do design system e precisa ser trazida de volta à linha.

## Como funciona

O polish começa descobrindo o design system (tokens, escala de espaçamento, componentes compartilhados), e então trabalha metodicamente em seis dimensões:

1. **Alinhamento e espaçamento visual**: aderência pixel-perfect à grade, escala de espaçamento consistente, alinhamento óptico em ícones.
2. **Tipografia**: consistência da hierarquia, comprimento de linha, viúvas e órfãs, kerning nos títulos.
3. **Cor e contraste**: uso de tokens, paridade entre temas, proporções WCAG, indicadores de foco.
4. **Estados de interação**: hover, foco, ativo, desabilitado, carregando, erro, sucesso. Cada estado considerado.
5. **Transições e movimento**: easing suave, sem jank de layout, respeito a `prefers-reduced-motion`.
6. **Copy**: voz consistente, tempo verbal correto, sem strings de placeholder, sem TODOs perdidos.

A skill é explícita sobre uma coisa: o polish é o último passo, não o primeiro. Se a feature não está funcionalmente completa, poli-la é trabalho desperdiçado.

## Experimente

```
/tektone polish the pricing page
```

A healthy run looks like:

```
Visual alignment: fixed 3 off-grid elements (8px baseline)
Typography: tightened h1 kerning, fixed widow on testimonial
Interaction: added hover state on FAQ items, focus ring on email input
Motion: softened modal entrance, added reduced-motion fallback
Copy: removed one "Lorem ipsum" stray, aligned button voice
```

Five small fixes, no rewrites. That is the shape of a good polish pass.

## Pitfalls

- **Polishing work that is not done.** If there are TODOs in the code, you are not ready. Run `/tektone polish` on finished features only.
- **Treating polish as redesign.** Polish refines what exists. If you find yourself rearchitecting a layout, you needed `/tektone critique` or `/tektone layout` instead.
- **Running `/tektone polish` without `/tektone audit` first.** Polish catches feel-based issues. Audit catches measurable ones. Use both.
