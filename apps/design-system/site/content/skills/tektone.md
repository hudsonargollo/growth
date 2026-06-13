---
tagline: "Receba uma recomendação de próximo passo ou descreva o trabalho de design em português direto."
---

## Quando usar

`/tektone` é o comando principal. Use-o de duas formas:

- Rode `/tektone` sozinho quando quiser que a skill inspecione o projeto e recomende o que fazer em seguida.
- Adicione um pedido em português direto quando você souber o resultado, mas não o comando exato.

Vá direto ao `/tektone` quando:

- **Você não tem certeza por onde começar.** Ele verifica se os arquivos de setup existem, olha o estado atual do projeto e recomenda dois ou três próximos comandos. Ele pergunta antes de rodar qualquer coisa.
- **Você não tem certeza de qual comando se encaixa.** Descreva o que você quer em português direto e deixe a skill escolher a melhor abordagem.
- **O trabalho atravessa várias disciplinas.** "Refaça esta seção de hero" envolve layout, tipografia, cor e motion. Um único comando não consegue dar conta disso.
- **Você quer ajuda livre de design.** Use o comando principal quando nenhum comando especialista mapeia de forma limpa para o trabalho.

Se este for um projeto novo, comece pelo `/tektone init`. Ele cria os arquivos de setup que todos os outros comandos leem.

## Como funciona

A maioria das UIs geradas por IA falha do mesmo jeito: fontes genéricas, gradientes roxos, grids de cards sobre grids de cards, glassmorphism por toda parte. O `/tektone` dá ao modelo instruções de design mais fortes antes de ele escrever o código.

Dois arquivos na raiz do seu projeto moldam tudo o que a skill faz:

- **`PRODUCT.md`** diz para que serve o projeto: público, propósito do produto, voz, antirreferências e se a superfície é brand ou product.
- **`DESIGN.md`** diz como a interface deve parecer: cores, tipografia, componentes, elevação e regras de design.

Todo comando lê os dois arquivos antes de gerar. A escolha de setup mais importante é **brand vs product**: esta é uma superfície de marketing onde a impressão é o produto, ou uma superfície de app onde o design ajuda alguém a concluir uma tarefa? A documentação chama essa escolha de **register**. Veja [Brand vs product](/tutorials/brand-vs-product) para exemplos.

No primeiro uso em um projeto, o `/tektone` pode te encaminhar para o `init`: uma entrevista curta que escreve o `PRODUCT.md` e oferece escrever o `DESIGN.md`. Os comandos futuros leem esses arquivos sem perguntar de novo.

## Experimente

Rode sem nenhum comando para se situar:

```
/tektone
```

Ele avalia o projeto e te aponta o melhor próximo movimento. Por exemplo: ainda não há `DESIGN.md`, rode `document`; há achados não resolvidos nos arquivos que você está editando, rode `polish`. Ele espera você escolher.

Ou descreva o que você quer e ele faz o trabalho diretamente:

```
/tektone redo this hero section
```

```
/tektone build me a pricing page for a developer tool
```

Os dois prompts são vagos de propósito. O `/tektone` vai escolher o comando certo ou rodar o trabalho diretamente, usando seus arquivos de setup quando eles existirem.

Para iteração visual no navegador em vez do chat:

```
/tektone live
```

Escolha qualquer elemento no seu dev server em execução. Deixe um comentário ou um traço. Receba três variantes de qualidade de produção trocadas a quente via HMR. Aceite a que você quiser e ele escreve de volta no código-fonte.

## Fixe comandos de volta como atalhos

A v3.0 consolidou 18 skills independentes em um único `/tektone` com 23 comandos. Se você sente falta da forma curta de um comando, fixe-o de volta:

```
/tektone pin critique
```

From now on, `/critique` invokes `/tektone critique` directly. It writes a lightweight redirect skill that delegates to the parent, so updates to the skill flow through without re-pinning.

Useful pins to try:

- `/tektone pin polish` for final-pass work
- `/tektone pin audit` for deterministic a11y/perf checks
- `/tektone pin live` for the browser iteration flow
- `/tektone pin critique` for design review

To remove: `/tektone unpin critique`. Pins live as directories named after the command in your harness skills folder (`.claude/skills/critique/`, `.cursor/skills/critique/`, etc.), so you can also delete them manually.

## Pitfalls

- **Treating it like a style guide.** It is an opinionated design partner, not a linter. The defaults exist to raise the floor, not to overrule your judgment. If you have a real reason to push back (brand guideline, accessibility constraint, user research), push back and explain why. The skill will work with you. What produces worse output is ignoring the opinion without a reason.
- **Expecting it to fix existing code.** `/tektone` is for creation. For refinement, reach for `/tektone polish`, `/tektone distill`, or `/tektone critique` instead.
- **Running it before `init` has saved context.** On a fresh project it will interview you mid-flight, which is fine but slower. Running `/tektone init` first is smoother.
- **Picking the wrong brand/product lane.** Marketing pages and app screens need different defaults. If `PRODUCT.md` has no `## Register` field (legacy), run `/tektone init` to add it.
