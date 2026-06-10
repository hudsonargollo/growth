---
tagline: "Configure um projeto para o Tektone, uma vez. Contexto, modo live e por onde começar."
---

<div class="docs-viz-hero">
  <div class="docs-viz-file">
    <div class="docs-viz-file-header">
      <span class="docs-viz-file-name">PRODUCT.md</span>
      <span class="docs-viz-file-status">Carregado em todo comando</span>
    </div>
    <div class="docs-viz-file-body">
      <div class="docs-viz-file-row">
        <span class="docs-viz-file-k">Registro</span>
        <span class="docs-viz-file-v">Produto. O design serve à tarefa.</span>
      </div>
      <div class="docs-viz-file-row">
        <span class="docs-viz-file-k">Usuários</span>
        <span class="docs-viz-file-v">SREs de plantão, lendo rápido, muitas vezes no escuro.</span>
      </div>
      <div class="docs-viz-file-row">
        <span class="docs-viz-file-k">Voz da marca</span>
        <span class="docs-viz-file-v">Calma, clínica, sem hype.</span>
      </div>
      <div class="docs-viz-file-row">
        <span class="docs-viz-file-k">Antirreferências</span>
        <span class="docs-viz-file-v">Gradientes roxos. Glassmorphism. "Turbine sua produtividade."</span>
      </div>
    </div>
    <div class="docs-viz-file-footer">Todo comando lê isto antes de escrever uma linha de código.</div>
  </div>
  <p class="docs-viz-caption">Um PRODUCT.md finalizado. Só estratégia: quem, o quê, por quê. Sem cores, sem fontes, sem valores em pixel, esses moram no DESIGN.md.</p>
</div>

## Quando usar

Rode `/tektone init` uma vez no início de um projeto. Sem ele, todo outro comando precisa adivinhar: voz genérica de SaaS, fontes seguras por padrão, a paleta de cores da IA. Com ele, todo comando lê suas respostas antes de gerar.

Recorra a ele quando:

- **Você acabou de instalar o Tektone em um projeto novo.** A primeira coisa a rodar. Outros comandos vão te empurrar nessa direção se você pular.
- **A direção de marca do projeto mudou.** Novo posicionamento, novo público, nova voz. Rode `init` de novo e o contexto atualizado flui por todos os comandos.
- **Outro comando disse "no design context found"** e parou. Esse é o sinal: rode o init e depois retome.

## How it works

One codebase scan feeds everything init writes:

- **`PRODUCT.md`** is the strategic file. It stores the audience, product purpose, voice, anti-references, design principles, accessibility needs, and the brand/product choice. Answers "who, what, why".
- **`DESIGN.md`** is the visual file. Colors, typography, elevation, components, do's and don'ts. Answers "how it looks". Written by the delegated `/tektone document` command, which init invokes at the end.
- **Live mode config.** Since the same crawl already knows your framework and entry files, init pre-configures `/tektone live` so it opens straight into variant mode with no first-time setup.

The flow scans the codebase first (README, package.json, components, tokens, brand assets) and asks you to confirm one core choice: is this a brand surface or a product surface?

- **Brand:** landing pages, marketing pages, portfolios, campaigns. The impression is the product.
- **Product:** app UI, dashboards, admin screens, tools. The design helps someone finish a task.

The docs call that choice **register**. It shapes typography, motion, color, and density. After that, init asks only what it could not infer: users, personality in three real words, references and anti-references, accessibility requirements.

PRODUCT.md is strategic only. No colors, no fonts, no pixel values. Those live in DESIGN.md. Keeping the two files separate is deliberate: strategy can stay stable while the visual system evolves.

It closes by pointing you at the best commands to run next, picked from what the scan turned up: `craft` or `shape` for new work, `critique` or `audit` for what is already there, `live` to iterate visually. No guessing where to begin.

## Try it

```
/tektone init
```

Expect a 5 to 8 minute interview. The first question is usually the brand/product choice; the rest are short. Init will quote back what it inferred from your code ("from the routes, this looks like a product surface, match?") so you are confirming, not starting from scratch.

Along the way it offers to run `/tektone document` for you. Say yes unless you have a specific reason to hold off. A real DESIGN.md is what keeps variants, polishes, and audits on-brand.

## Pitfalls

- **Skipping it to "just try a command quickly".** Every other command will interview you mid-flight instead. Running init first is faster, not slower.
- **Giving generic answers.** "Modern and clean" is not useful. "Warm, mechanical, opinionated" is. Be specific. Be willing to disagree with safe defaults.
- **Treating PRODUCT.md as immutable.** The file is yours. If init put something in there that is not quite right, edit it. Every command reads the current file.
- **Listing only adjectives for references.** Brands, products, printed objects: named, not described. "Klim Type Foundry specimen pages", not "technical and clean". Anti-references should be equally specific.
