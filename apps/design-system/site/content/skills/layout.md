---
tagline: "Corrija layout, espaçamento e ritmo visual."
---

## Quando usar

`/tektone layout` serve para páginas onde nada está tecnicamente errado, mas nada respira também. Padding igual em todo lugar, grids de cards monótonos, conteúdo que vai de ponta a ponta, hierarquia que se apoia só no tamanho. Recorra a ele quando um layout "parece estranho" e você não consegue dizer por quê.

Bons gatilhos: "está tudo apertado", "parece uma parede de texto", "não sei para onde olhar primeiro".

## Como funciona

A skill percorre cinco dimensões de layout:

1. **Espaçamento**: a escala de espaçamento é consistente ou existem gaps aleatórios de 13px, os elementos relacionados estão agrupados de forma justa com espaço generoso entre os grupos, há algum ritmo afinal.
2. **Hierarquia visual**: o olho encontra a ação principal em até 2 segundos, a hierarquia está fazendo um trabalho real ou está tudo gritando.
3. **Grid e estrutura**: existe um grid por baixo ou o layout é aleatório, os elementos estão alinhados às baselines.
4. **Ritmo**: a página alterna entre espaçamento justo e generoso, ou está tudo uniforme.
5. **Densidade**: o layout está apertado ou desperdiça espaço, a densidade combina com o tipo de conteúdo.

As correções normalmente envolvem reconstruir a escala de espaçamento, introduzir assimetria, colapsar grids monótonos em um layout misto com elementos hero e de apoio, e dar espaço de verdade para a ação principal.

## Experimente

```
/tektone layout the settings page
```

Mudanças típicas:

- Escala de espaçamento unificada em 8 / 16 / 24 / 48 / 96px
- Quebras de seção em 48px, gaps de linha em 16px, grupos de campos de formulário em 8px
- Ações principais retiradas do fluxo do formulário com 32px de folga
- Bordas decorativas removidas, substituídas por agrupamento via espaçamento
- Proporções da sidebar e da coluna principal reequilibradas (280 / flex vs 25 / 75)

## Armadilhas

- **Confundir organizar com destilar.** Se o problema é coisas demais, rode `/tektone distill` primeiro. Layout serve para organizar o que já é o conjunto certo.
- **Esperar que ele resgate um grid quebrado.** Se a página não tem grid algum, o arrange vai construir um. Só saiba que o diff vai ser maior do que você espera.
- **Ignorar o veredito de hierarquia.** Se o arrange diz "nada é principal", nenhum trabalho de espaçamento resolve isso. Você precisa de uma decisão de conteúdo, não de um ajuste de layout.
