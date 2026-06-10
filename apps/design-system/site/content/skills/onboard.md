---
tagline: "Desenhe experiências de primeiro uso, empty states e caminhos até o valor."
---

## Quando usar

`/tektone onboard` é para os momentos que decidem se um novo usuário vai ficar: a primeira tela, o empty state, o fluxo de configuração, o tour do produto, a lacuna do "e agora, o que eu faço". Recorra a ele quando a ativação está fraca, quando novos usuários abandonam antes de chegar ao valor, ou quando seu produto tem empty states que dizem "nenhum item ainda" e param por aí.

## Como funciona

O comando parte de uma única pergunta: qual é o momento "aha", e quão rápido um novo usuário consegue chegar até ele. Cada decisão de design aponta para esse momento.

Ele atua nas superfícies que moldam as primeiras impressões:

1. **Experiência de primeiro uso**: os momentos imediatamente após o cadastro. O usuário deve ver um tour, uma tela em branco, um exemplo preenchido, ou nada? Escolha a abordagem que combina com o produto.
2. **Empty states**: toda tela sem dados ganha orientação. Onde estou, por que isso está vazio, o que faço a seguir, como vai ficar quando estiver cheia.
3. **Configuração e instalação**: a configuração obrigatória é minimizada, os padrões são inteligentes, cada passo explica por que importa.
4. **Divulgação progressiva**: recursos avançados ficam fora do caminho até serem conquistados.
5. **Eventos de ativação**: o momento em que um usuário experimenta o valor central pela primeira vez é instrumentado e celebrado, discretamente.

O comando resiste a dois modos de falha comuns: o onboarding excessivamente tutorializado, em que os usuários passam por um carrossel antes de poderem tocar em qualquer coisa, e o onboarding zero, em que os usuários são jogados em um app vazio e devem se virar sozinhos.

## Experimente

```
/tektone onboard the editor
```

Saída típica:

- Primeiro uso: substitui o editor vazio por um documento de exemplo preenchido que o usuário pode modificar. O botão Cancelar descarta o exemplo, e editar substitui o conteúdo pelo trabalho do usuário.
- Empty state na lista de documentos: "Nenhum documento ainda. Crie o seu primeiro, ou importe do Notion, Google Docs ou Markdown."
- Configuração: reduzida de 6 campos obrigatórios para 1 (nome do workspace). Todo o resto tem um padrão inteligente e pode ser editado depois nas configurações.
- Ativação: na primeira vez que um usuário salva um documento, um toast discreto diz "Salvo. Seu trabalho está na nuvem agora." Uma única vez, sem repetir.

## Armadilhas

- **Adicionar um tour de produto como resposta padrão.** A maioria dos produtos não precisa de um tour. Eles precisam de uma primeira tela melhor. Tours são uma muleta.
- **Desenhar o onboarding sem definir o momento "aha".** Se você não consegue dizer em uma frase o que o usuário deve sentir nos primeiros 60 segundos, volte para `/tektone shape` primeiro.
- **Rodar o onboard em um fluxo quebrado.** Conserte o fluxo primeiro. O onboarding não consegue resgatar um produto em que a ação central está quebrada.
