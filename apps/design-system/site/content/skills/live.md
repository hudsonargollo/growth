---
tagline: "Itere na UI direto no navegador. Escolha um elemento, deixe um comentário, receba três variantes. Aceite uma e ela é escrita no código-fonte."
---

<div class="docs-live-callout">
  <span class="docs-live-callout-icon" aria-hidden="true">▸</span>
  <span class="docs-live-callout-text">Veja em ação, com a demo animada, em <a href="/live-mode">/live-mode</a>. Esta página é a referência do que seu harness de IA lê quando o comando roda.</span>
</div>

<div class="docs-live-callout">
  <span class="docs-live-callout-icon" aria-hidden="true">▸</span>
  <span class="docs-live-callout-text"><strong>Status: alpha.</strong> O Live Mode funciona de ponta a ponta e já dá para experimentar, mas ainda precisa de mais testes contra repositórios reais e configurações de frameworks. Espere arestas em setups menos comuns, e por favor reporte o que quebrar.</span>
</div>

<div class="docs-viz-hero docs-viz-hero--plain">
  <div class="docs-viz-live-frame">
    <div class="docs-viz-live-chrome">
      <span class="docs-viz-live-dot"></span>
      <span class="docs-viz-live-dot"></span>
      <span class="docs-viz-live-dot"></span>
      <span class="docs-viz-live-url">localhost:3000</span>
    </div>
    <div class="docs-viz-live-stage docs-viz-live-stage--tall">
      <div class="docs-viz-live-target">
        <span class="docs-viz-live-kicker">No. 04</span>
        <h3 class="docs-viz-live-title">Cartas, <em>de vez em quando</em>.</h3>
        <p class="docs-viz-live-body">Um cartão-postal do editor, mais ou menos uma vez por mês. Sem pixels de rastreamento, sem "só passando para dar um oi."</p>
        <button class="docs-viz-live-btn" type="button">Quero receber uma</button>
      </div>
      <div class="docs-viz-live-outline" aria-hidden="true"></div>
      <div class="docs-viz-live-ctx" aria-hidden="true">
        <button class="docs-viz-live-ctx-nav" type="button" aria-label="Anterior">‹</button>
        <span class="docs-viz-live-ctx-counter">2 / 3</span>
        <button class="docs-viz-live-ctx-nav" type="button" aria-label="Próximo">›</button>
        <span class="docs-viz-live-ctx-divider"></span>
        <button class="docs-viz-live-ctx-accept" type="button">Aceitar</button>
      </div>
      <div class="docs-viz-live-gbar" aria-hidden="true">
        <span class="docs-viz-live-gbar-brand">/</span>
        <span class="docs-viz-live-gbar-btn is-active">Escolher</span>
        <span class="docs-viz-live-gbar-divider"></span>
        <span class="docs-viz-live-gbar-x">✕</span>
      </div>
    </div>
  </div>
  <p class="docs-viz-caption">Live Mode mid-cycle: the picker outlines the element you chose, the context bar shows which variant you're on, and the global bar stays pinned to the bottom. Accept on this one writes Variant 2 back to source.</p>
</div>

## When to use it

Reach for `/tektone live` when you want to iterate on something visually the way you would in a design tool, but keep production code as the output. The canvas-like flow of Figma without the round trip to an implementation step.

Use it for:

- **Exploring directions on a real element.** A hero section, a newsletter card, a pricing tier. Three genuinely different takes, side by side, on the actual page with the actual context.
- **Polishing a piece of UI that is almost right.** You know what feels off but cannot quite say it. Pick the element, scribble "more playful" or draw a stroke through the bit that bugs you, hit Go.
- **A quick A/B between two directions your team is debating.** Generate variants, accept nothing, walk away. The point was the comparison.

It is NOT for new greenfield features (reach for `/tektone craft`) or whole-page redesigns (reach for `/tektone` or a specialized refine command).

## How it works

One command brings up a picker overlay on top of your running dev server. You pick any element. A small context bar appears next to it. Type a freeform description or pick one of the action chips (`bolder`, `quieter`, `distill`, `polish`, `typeset`, `colorize`, `layout`, `animate`, `delight`, `overdrive`). Optionally drop comment pins or draw strokes directly on the element first, and the skill reads those as intent.

Hit Go. Three **production-quality variants** get generated, each anchored to a genuinely different design archetype (not three riffs on color) and hot-swapped into the page via your framework's HMR. Cycle through them with arrow keys. Accept one and the variant is written back to source. Discard all three and the original stays.

It supports Vite, Next.js (including monorepos), SvelteKit, Astro, Nuxt, and plain static HTML. If your dev server has a strict Content Security Policy, the first-run setup detects it and offers a one-time, dev-only patch so the picker can load. `DESIGN.md` wins on visual decisions, `PRODUCT.md` wins on voice: if you have both, variants stay on-brand without being told.

## Try it

```
/tektone live
```

Open your dev server URL, pick the newsletter signup card, click the `delight` chip, hit Go. You will get three variants that vary across personality dimensions (a stamp-and-postcard feel, a typographic-surprise version, an illustrated-accent one), not three riffs on the same treatment.

Or pick a hero, type "more editorial, less SaaS", hit Go. The three variants anchor to different editorial archetypes (broadsheet masthead, catalog-style spec rows, oversized-glyph poster) rather than three shades of the same idea.

Stop live mode when you are done: say "stop live mode", close the tab, or hit the exit button on the picker bar.

## Pitfalls

- **Running it on a page that is still half-written.** Live variant generation needs context. If the element has placeholder copy, generic Lorem ipsum, or pre-stylesheet default formatting, variants will reflect that. Fill the content first.
- **Expecting it to make macro decisions.** Live mode iterates on a single picked element. For "redo the entire pricing page", reach for `/tektone` or `/tektone craft` instead.
- **Ignoring the fallback messages.** If the element lives in a generated file (a compiled template, a build output), the picker says so explicitly and offers to route the accept into true source. Do not force the accept into the generated file: the next build will wipe it.
- **Running it without PRODUCT.md or DESIGN.md when you care about brand fit.** Live will still generate, but the variants will lean toward generic defaults. Run `/tektone init` and `/tektone document` first if the result needs to sound like your product.
