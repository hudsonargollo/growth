import { getDb } from '../lib/db.js'
import { uid } from '../lib/uid.js'

const FALLBACK_BLUEPRINTS = {
  // ── PRAC: Long-Form Listicle (8-12 min, "Me Ajuda Na Escolha" formula) ──────
  'prac-type-long-form': {
    name: 'PRAC · Top 5 Afiliado (Longo)',
    maxTokens: 10000,
    sections: [
      {
        id: 's0', type: 'intro', label: 'Título SEO',
        duration: 0,
        instructions: 'Gere APENAS o título SEO nesta fórmula exata: "As/Os 5 Melhores [Produto Geral] de [Ano Atual] ([Gancho de Curiosidade])". O gancho deve criar urgência ou curiosidade (ex: "A Campeã vai te Surpreender", "Qual Não Vale a Pena?", "Testamos Todas"). Retorne SOMENTE o título, sem mais nada.',
      },
      {
        id: 's1', type: 'intro', label: 'Abertura (Hook)',
        duration: 45,
        instructions: `Abertura de ~100 palavras seguindo EXATAMENTE este modelo do roteiro de referência:

ESTRUTURA OBRIGATÓRIA (nesta ordem):
1. DOR DO CONSUMIDOR: Abra identificando um problema específico e frustrante que o espectador já viveu com este tipo de produto. Seja concreto — cite problemas reais como instabilidade, espaço ocupado, resistência insuficiente, ruído, etc. NÃO comece com pergunta.
   Exemplo de referência: "Escolher a [produto] ideal para a sua casa é muito mais do que apenas comprar um equipamento; é um compromisso direto com a sua saúde e com o respeito que você tem pelo seu corpo. Se você está cansado de [problema1], [problema2] ou [problema3], você está no lugar certo."

2. AUTORIDADE (frase obrigatória, adapte para o produto): "Nossa equipe realizou uma varredura profunda no mercado atual, analisando desde a engenharia dos [componente técnico] até a experiência de milhares de usuários reais, para selecionar as 5 melhores opções para você comprar com total confiança este ano."

3. LOOP DE RETENÇÃO (frase obrigatória): "Fique comigo até o final, pois a campeã desta lista não apenas [benefício 1], como garante que [benefício emocional poderoso]."

4. CTA DE CARRINHO (frase obrigatória): "Já aproveite para clicar nos links abaixo e adicionar a sua favorita ao carrinho para não perder a oportunidade de vista."

5. CTA DE LINKS (frase obrigatória): "Todos os links com as promoções ativas estão no primeiro comentário fixado para você garantir o melhor negócio."`,
      },
      {
        id: 's2', type: 'product', label: '5º ao 3º Lugar',
        duration: 600,
        instructions: `MÍNIMO 500 PALAVRAS. Escreva 3 blocos separados (um por produto), do 5º ao 3º lugar, nesta ordem.

FÓRMULA OBRIGATÓRIA PARA CADA PRODUTO (baseada no roteiro de referência):

① ABERTURA COM PERFIL DO COMPRADOR (1-2 frases):
   Comece identificando PARA QUEM é este produto — o perfil exato do comprador ideal.
   Modelo: "Para quem [situação específica do comprador], o [Nome do Produto] é a escolha mais inteligente."
   Exemplo ref.: "Para quem está começando e precisa otimizar cada centímetro do seu ambiente, a [produto] é a escolha mais inteligente."

② PRINCIPAL DIFERENCIAL (1-2 frases):
   "O grande diferencial deste modelo é [diferencial técnico concreto]; ele/ela [benefício direto que o diferencial entrega]."

③ PROVA TÉCNICA (3-4 frases):
   Cite specs reais do produto fornecido. Explique POR QUE cada spec importa para o treino/uso real. Use o modelo: "[Spec] significa que [benefício prático concreto]."

④ PROVA SOCIAL — avaliação entre vírgulas (integrada naturalmente na frase):
   Modelo: "Com uma avaliação sólida de [X.X] de 5 estrelas, ela se prova [conclusão que confirma o posicionamento]."

⑤ ÂNCORA DE PREÇO — integrada naturalmente:
   Modelo: "tudo isso com um investimento de aproximadamente [X reais]."

⑥ CTA POR PRODUTO (frase obrigatória ao final de cada produto):
   Modelo: "Se você busca [benefício principal deste produto], o link para conferir este modelo está no primeiro comentário fixado."

⑦ BRIDGE PARA O PRÓXIMO (última frase de cada produto exceto o 3º):
   Escale a qualidade com uma frase curta de curiosidade que NÃO anuncia a próxima posição nem o nome do próximo produto. Apenas sugira que o próximo é superior em algum aspecto.
   Modelo: "Mas o próximo da lista resolve isso de um jeito que poucos esperam…"
   ⚠️ NUNCA escreva "No 4º lugar…" / "No 3º lugar…" nesta frase de transição. A posição de cada produto é anunciada UMA ÚNICA VEZ, no início do próprio bloco — nunca duas vezes.

REGRA ANTI-REDUNDÂNCIA (obrigatória): Cada bloco de produto começa anunciando a sua posição UMA vez (ex: "Em 4º lugar…"). NÃO encerre o bloco anterior anunciando essa mesma posição e depois a repita na abertura do bloco seguinte. Uma posição = um único anúncio.`,
      },
      {
        id: 's3', type: 'product', label: '2º Lugar',
        duration: 180,
        instructions: `Bloco de 180-220 palavras para o SEGUNDO MELHOR produto.

FÓRMULA (mesmo padrão do roteiro de referência para o 2º lugar):

① Abertura que eleva a aposta: "Se você busca uma [categoria] que realmente se comporte como [metáfora forte que ressoa com o público], o [Produto] é a sua melhor escolha."

② DIFERENCIAL ESTRUTURAL PRINCIPAL: O que torna este produto superior aos anteriores. Use dados técnicos concretos e explique por que isso importa no uso real. Destaque 2-3 diferenciais em profundidade.

③ DURABILIDADE / LONGEVIDADE: Fale sobre resistência ao uso intenso, materiais, construção. Modelo ref.: "Ela foi projetada para quem valoriza a longevidade, sendo resistente a [condição], o que significa que ela vai te acompanhar por muitos anos."

④ PROVA SOCIAL + PREÇO (integrados): "Com uma nota impressionante de [X.X] de 5 estrelas e saindo por cerca de [X reais], ela é o investimento perfeito para quem [perfil do comprador ideal]."

⑤ CTA + BRIDGE para o campeão: "O caminho seguro para garantir a sua está fixado no primeiro comentário." Depois: suspense máximo — "Mas se o [Produto 2] já impressiona, o que vem a seguir vai redefinir o que você espera de um [produto]..."`,
      },
      {
        id: 's4', type: 'product', label: '1º Lugar — Campeã',
        duration: 200,
        instructions: `Bloco de 220-270 palavras. Tom de GRANDE REVELAÇÃO — este é o momento mais importante do vídeo.

FÓRMULA (baseada no modelo de referência para o campeão):

① ABERTURA ÉPICA: "Chegamos à campeã absoluta, o/a [Nome do Produto]."
   Imediatamente prove com dado de volume se disponível: "Ele/ela não conquistou [X mil vendas / X avaliações] por acaso."

② O QUE COLOCA NO TOPO (frase central): "O que o/a coloca no topo é a sua capacidade de [benefício transformador único] — resolvendo o dilema de quem busca [benefit A], mas [situação limitante do comprador]."

③ DIFERENCIAIS TÉCNICOS DE PERFORMANCE (3-4 frases):
   Cite os specs mais impressionantes. Use linguagem de impacto: "ultra preciso", "de última geração", "nível atlético", "profissional". Explique o impacto prático de cada spec.

④ PROVA SOCIAL (maior nota da lista): "Com [X.X] de 5 estrelas de nota," — a pontuação mais alta entre todos os modelos.

⑤ ÂNCORA DE PREÇO com enquadramento emocional: "este investimento de cerca de [X reais] vai mudar a sua relação com [atividade/objetivo do comprador]."

⑥ CTA FINAL FORTE (obrigatório — use o tom do roteiro de referência):
   "Não corra o risco de escolher um equipamento que vai [consequência negativa engraçada/real]; garanta o/a campeão/ã agora mesmo clicando no link do comentário fixado e inicie sua transformação ainda hoje."`,
      },
      {
        id: 's5', type: 'cta', label: 'CTA Final',
        duration: 45,
        instructions: `Encerramento curto de ~50 palavras:
• Recapitule o campeão em uma frase de fechamento natural
• "Todos os links com os melhores preços estão no primeiro comentário fixado — é só clicar e garantir o seu."
• Pergunta de engajamento para comentários: algo que gere opinião (ex: "Qual desses você escolheria?")
• Pedido leve de like e inscrição: conversacional, nunca imperativo
• NUNCA mencione nome de loja ou marketplace`,
      },
    ],
  },

  // ── PRAC: Short-Form (TikTok / Reels / Shorts, 30-60s) ────────────────────
  'prac-short-form': {
    name: 'PRAC · Short-Form (Reels/Shorts)',
    maxTokens: 400,
    sections: [
      {
        id: 's1', type: 'intro', label: 'Hook 3 Segundos',
        duration: 3,
        instructions: `1 única frase que PARA O SCROLL. Use a dor do comprador, não uma pergunta genérica.
MODELOS (adapte ao produto específico):
• DOR DIRETA: "Se você está cansado de [problema específico com este tipo de produto], presta atenção."
• ÂNCORA DE PREÇO CHOCANTE: "[R$X] por [produto que parece premium]? Sim, é real."
• AFIRMAÇÃO OUSADA: "Esse [produto] vai acabar com [frustração real do comprador] de uma vez por todas."
NÃO comece com "Você sabia que" ou perguntas genéricas. Seja VISUAL e CONCRETO.`,
      },
      {
        id: 's2', type: 'product', label: 'Produto + Diferencial',
        duration: 20,
        instructions: `2-3 frases rápidas seguindo este padrão:
① Nome do produto: direto, sem floreios.
② DIFERENCIAL PRINCIPAL — "O grande diferencial deste modelo é [spec técnico concreto], o que significa que [benefício prático visual que apareceria em B-roll]."
③ SPEC SURPRESA: A funcionalidade ou dado técnico mais impressionante que justifica o investimento.
Tom: como um amigo animado mostrando algo que acabou de descobrir.`,
      },
      {
        id: 's3', type: 'verdict', label: 'Prova Social + Âncora de Preço',
        duration: 12,
        instructions: `1-2 frases integrando prova social e preço naturalmente (padrão do roteiro de referência):
• PROVA SOCIAL: "Com [X.X] de 5 estrelas e mais de [N] avaliações,"
• ÂNCORA DE PREÇO: "tudo isso por um investimento de aproximadamente [X reais] — [enquadramento de valor, ex: menos do que uma mensalidade de academia por mês]."
Integre em UMA frase fluida, não em lista.`,
      },
      {
        id: 's4', type: 'cta', label: 'CTA Impulsivo',
        duration: 5,
        instructions: `1-2 frases que removem a fricção de compra ANTES do loop. Para Short-Form, combine add-to-cart + urgência em uma frase só:
MODELOS:
• "Adiciona ao carrinho pelo link fixado — não perde de vista." (11 palavras)
• "Link no comentário fixado — salva no carrinho antes que acabe."
• "Abre o link fixado e já adiciona ao carrinho agora."
NUNCA mencione nome de loja. Máximo 15 palavras.

RESTRIÇÃO TOTAL: O roteiro completo (TODOS os blocos) deve ter 75-130 palavras. Telegráfico e visual.`,
      },
    ],
  },

  // ── PRAC: Comparação 1x1 (5-8 min) ────────────────────────────────────────
  'prac-comparison': {
    name: 'PRAC · Comparação 1x1',
    maxTokens: 4000,
    sections: [
      {
        id: 's0', type: 'intro', label: 'Título SEO',
        duration: 0,
        instructions: 'Gere APENAS o título SEO: "[Produto A] vs [Produto B]: Qual Vale Mais a Pena em [Ano Atual]? (Análise Honesta)". Use os nomes exatos dos dois produtos. Retorne SOMENTE o título.',
      },
      {
        id: 's1', type: 'intro', label: 'Abertura — O Dilema',
        duration: 60,
        instructions: `Abertura de ~90 palavras com o mesmo espírito do roteiro de referência:

① DOR DO DILEMA: Abra identificando a frustração específica de quem está comparando estes dois produtos. "Se você está em dúvida entre o [A] e o [B], você não está sozinho — e a decisão errada pode significar [consequência real e frustrante]."

② AUTORIDADE: "Nossa equipe analisou os dois modelos em profundidade, comparando desde [aspecto técnico] até a experiência de centenas de usuários reais."

③ PROMESSA DE RESOLUÇÃO + RETENÇÃO: "Fique comigo até o veredicto final, porque a resposta pode surpreender você — e vai depender exatamente do seu perfil de uso."

④ ADD-TO-CART (obrigatório — 1 frase concisa e natural): Peça ao espectador para já abrir o comentário fixado e adicionar ao carrinho o modelo que chamar atenção enquanto assiste. Framing de conveniência, não de pressão. Ex: "Já aproveita e abre o link fixado — salva no carrinho o que chamar atenção para não perder de vista."

⑤ CTA DE LINKS: "Os links de ambos estão no primeiro comentário fixado."`,
      },
      {
        id: 's2', type: 'product', label: 'Produto A — Análise Completa',
        duration: 150,
        instructions: `~160 palavras. Siga o padrão de análise do roteiro de referência:

① PERFIL DO COMPRADOR (abertura): "Para quem [situação/necessidade específica], o [Produto A] é a escolha mais inteligente."

② DIFERENCIAL PRINCIPAL: "O grande diferencial deste modelo é [spec técnico]; isso significa que [benefício prático concreto para o uso real]."

③ PROVA TÉCNICA: 2-3 specs com o "por que importa" de cada um.

④ CONTRA HONESTO (1 ponto): "O único ponto que vale mencionar é [limitação real] — o que pode ser um problema para quem [perfil específico que sofre com isso]."

⑤ PROVA SOCIAL + PREÇO (integrados): "Com [X.X] de 5 estrelas, ele se destaca [conclusão]. O investimento gira em torno de [X reais]."

⑥ ENQUADRAMENTO FINAL: "O [Produto A] é perfeito para quem prioriza [Benefício A]."
⑦ BRIDGE: "Mas quando falamos do [Produto B], o cenário muda em um ponto crucial..."`,
      },
      {
        id: 's3', type: 'product', label: 'Produto B — Análise Completa',
        duration: 150,
        instructions: `~160 palavras. Mesmo padrão do Produto A, mas com CONTRASTE EXPLÍCITO:

① ABERTURA COM CONTRASTE: "Enquanto o [Produto A] prioriza [X], o [Produto B] foi construído em torno de [Y] — e para um perfil específico de usuário, isso muda tudo."

② DIFERENCIAL PRINCIPAL (diferente do A): "O grande diferencial aqui é [spec/feature diferente] — o que entrega [benefício que o A não tem]."

③ PROVA TÉCNICA com comparação direta: cite specs e compare com o Produto A quando relevante.

④ CONTRA HONESTO (1 ponto): Seja honesto — a credibilidade aumenta a conversão.

⑤ PROVA SOCIAL + PREÇO: "Com [X.X] de 5 estrelas e um investimento de [X reais],"

⑥ ENQUADRAMENTO: "O [Produto B] é ideal para quem precisa de [Benefício B]."`,
      },
      {
        id: 's4', type: 'verdict', label: 'Veredicto PRAC',
        duration: 90,
        instructions: `~110 palavras. Veredicto direto — sem rodeios.

① FRASE OBRIGATÓRIA DE VEREDICTO (adapte os benefícios):
"Se você busca [Benefício A principal do Produto A], o [Produto A] é a melhor escolha. Mas se você precisa de [Benefício B principal do Produto B], vá de [Produto B] sem hesitar."

② ÂNCORA DE VALOR comparativa: Compare o custo-benefício de cada um — "Para o investimento de [X], o [A] entrega [resultado]. Para [Y], o [B] entrega [resultado diferente]."

③ VENCEDOR ABSOLUTO (quando houver): "Para o perfil mais comum de quem assiste este canal, o vencedor é o [Produto] — e o link com o melhor preço está no primeiro comentário fixado."`,
      },
      {
        id: 's5', type: 'cta', label: 'CTA Final',
        duration: 45,
        instructions: `~50 palavras:
• "Os links de ambos os modelos estão no primeiro comentário fixado — você decide qual faz mais sentido para o seu perfil."
• Pergunta de engajamento que divide opiniões: "Você é Team [Produto A] ou Team [Produto B]? Me conta nos comentários!"
• Like + inscrição conversacional
• NUNCA cite nome de loja`,
      },
    ],
  },

  // ── PRAC: Review Aprofundado de Produto Único (4-6 min) ───────────────────
  'prac-single-review': {
    name: 'PRAC · Review Completo (Produto Único)',
    maxTokens: 4000,
    sections: [
      {
        id: 's0', type: 'intro', label: 'Título SEO',
        duration: 0,
        instructions: 'Gere APENAS o título SEO: "[Nome do Produto]: Vale a Pena Comprar em [Ano Atual]? (Análise Completa e Honesta)". Use o nome exato do produto. Retorne SOMENTE o título.',
      },
      {
        id: 's1', type: 'intro', label: 'Abertura — Validação da Dor',
        duration: 60,
        instructions: `Abertura de ~90 palavras com o mesmo espírito do roteiro de referência:

① DOR ESPECÍFICA: Abra identificando o problema EXATO que levou o espectador a pesquisar por este produto. Seja concreto — cite situações reais (não genéricas). NÃO comece com pergunta.
   Modelo: "Escolher [produto] ideal é muito mais do que comprar um equipamento; é [compromisso emocional relacionado ao objetivo do comprador]. Se você está cansado de [problema1], [problema2] ou simplesmente não sabe em quem confiar, você está no lugar certo."

② AUTORIDADE: "Nossa equipe realizou uma análise profunda do [Nome do Produto], testando desde [aspecto técnico] até a experiência de [N] usuários reais, para te dar a resposta mais honesta que você vai encontrar."

③ LOOP DE RETENÇÃO: "Fique comigo até o veredicto final — a resposta sobre se vale ou não a pena vai depender de um detalhe específico do seu perfil."

④ ADD-TO-CART (obrigatório — 1 frase, tom de conveniência): Peça para o espectador já abrir o link fixado e adicionar ao carrinho enquanto assiste, para não perder de vista. Ex: "Já aproveita para abrir o comentário fixado e salvar no carrinho — assim você tem o link guardado independente da decisão."`,
      },
      {
        id: 's2', type: 'product', label: 'Review Técnico Aprofundado',
        duration: 240,
        instructions: `MÍNIMO 260 PALAVRAS. Este é o coração do vídeo — profundidade que gera confiança.

ESTRUTURA (baseada no padrão do roteiro de referência):

① DIFERENCIAL CENTRAL: "O que coloca o [produto] num patamar diferente é [diferencial técnico principal]. Por que isso importa? Porque [benefício prático concreto que o espectador sente no uso real]."

② SPECS COM SIGNIFICADO PRÁTICO: Para CADA spec técnico relevante, use o padrão:
   "[Spec técnico concreto] — o que na prática significa que [benefício direto e concreto]."
   Cite pelo menos 4-5 specs do produto fornecido.

③ EXPERIÊNCIA DE USO REAL: "Na prática, [produto] se comporta como [metáfora ou comparação que o público entende]. [Detalhe de uso que só quem testou sabe]."

④ DESIGN E CONSTRUÇÃO: Materiais, acabamento, durabilidade — com dados concretos quando disponíveis.

⑤ CONTEXTO DE MERCADO: "Comparado ao padrão da categoria nessa faixa de preço, o [produto] [supera/empata/perde] em [aspecto], o que o coloca [posição competitiva]."

Tom: especialista amigo que testou de verdade — não copy de e-commerce, não vendedor.`,
      },
      {
        id: 's3', type: 'pros_cons', label: 'O Que Amamos e O Que Poderia Melhorar',
        duration: 90,
        instructions: `~110 palavras. Honestidade gera confiança — e confiança gera conversão.

"O QUE AMAMOS:" — 3-4 pontos positivos REAIS e específicos (nunca genéricos como "boa qualidade"):
• Cada ponto: "[Feature específica] — isso é importante porque [impacto real no uso]."

"O QUE PODERIA SER MELHOR:" — 1-2 limitações HONESTAS e contextualizadas:
• Modelo: "[Limitação real], o que pode ser um problema para quem [perfil específico que sofre com isso]. Para quem [perfil que não sofre], isso não vai importar."

Esta seção aumenta a autoridade e reduz a hesitação do comprador — não a omita.`,
      },
      {
        id: 's4', type: 'verdict', label: 'Prova Social + Âncora de Preço',
        duration: 60,
        instructions: `~75 palavras. Integre prova social e preço NATURALMENTE na narrativa (padrão do roteiro de referência):

"Com [X.X] de 5 estrelas e mais de [N] avaliações no [Amazon/Mercado Livre], o [produto] prova que [conclusão que confirma o posicionamento feito no review]."

"O investimento gira em torno de [X reais] — o que, considerando que [contexto de valor: durabilidade, uso diário, alternativa mais cara], coloca ele como um dos melhores custo-benefício da categoria."`,
      },
      {
        id: 's5', type: 'verdict', label: 'Veredicto Final — Para Quem Vale?',
        duration: 60,
        instructions: `~90 palavras. Responda a pergunta do título com clareza cirúrgica.

① VALE A PENA?: Resposta direta sem rodeios.

② PERFIL IDEAL — para quem comprar: "O [produto] é a escolha perfeita para quem [perfil específico + situação de uso ideal]."

③ PERFIL QUE DEVE AVALIAR — para quem talvez não: "Se você [situação diferente], pode ser que [alternativa genérica] atenda melhor."

④ CTA DE CONVERSÃO (obrigatório — padrão do roteiro de referência):
"Se você se encaixa no primeiro perfil, não corra o risco de pagar mais caro em outro lugar; o link mais seguro está no primeiro comentário fixado."`,
      },
      {
        id: 's6', type: 'cta', label: 'CTA Final',
        duration: 45,
        instructions: `~50 palavras:
• Reforce o veredicto em uma frase de fechamento natural
• "O link com o melhor preço está no primeiro comentário fixado — é só garantir o seu."
• Pergunta de engajamento ligada à experiência pessoal: "Você já usa [produto ou categoria]? Me conta nos comentários!"
• Like + inscrição conversacional e leve
• NUNCA cite nome de loja ou marketplace`,
      },
    ],
  },


  'top-5-custo-beneficio': {
    name: 'Top 5 Custo-Benefício',
    sections: [
      { id: 's1', type: 'intro',   label: 'Abertura',                    duration: 60,  instructions: 'Hook forte com a promessa de revelar os 5 melhores produtos custo-benefício..' },
      { id: 's2', type: 'product', label: 'Critérios de Seleção',        duration: 45,  instructions: 'Explique brevemente os critérios usados para ranquear os produtos.' },
      { id: 's3', type: 'product', label: 'Produto #5',                  duration: 90,  instructions: 'Apresente o produto, preço, pontos positivos e para quem vale.' },
      { id: 's4', type: 'product', label: 'Produto #4',                  duration: 90,  instructions: 'Apresente o produto, destaque o diferencial em relação ao #5.' },
      { id: 's5', type: 'product', label: 'Produto #3',                  duration: 120, instructions: 'Análise mais detalhada, prós e contras principais.' },
      { id: 's6', type: 'product', label: 'Produto #2',                  duration: 120, instructions: 'Análise detalhada, por que quase chegou ao topo.' },
      { id: 's7', type: 'product', label: 'Produto #1 — Melhor Escolha', duration: 150, instructions: 'O campeão: análise completa, por que é o melhor custo-benefício, link afiliado com destaque.' },
      { id: 's8', type: 'cta',     label: 'CTA Final',                   duration: 45,  instructions: 'Convite para se inscrever, ativar notificações e acessar os links na descrição.' },
    ],
  },
  'comparacao-1x1': {
    name: 'Comparação 1x1',
    sections: [
      { id: 's1', type: 'intro',   label: 'Abertura',              duration: 60,  instructions: 'Hook: qual dos dois você escolheria? Crie suspense..' },
      { id: 's2', type: 'product', label: 'Apresentação dos Dois', duration: 90,  instructions: 'Apresente ambos os produtos, preços e posicionamento de mercado.' },
      { id: 's3', type: 'product', label: 'Design e Construção',   duration: 90,  instructions: 'Compare qualidade de materiais, ergonomia e acabamento.' },
      { id: 's4', type: 'product', label: 'Performance e Recursos', duration: 120, instructions: 'Compare funcionalidades, testes práticos e resultados.' },
      { id: 's5', type: 'product', label: 'Custo-Benefício',        duration: 90,  instructions: 'Compare preço vs valor entregue por cada um.' },
      { id: 's6', type: 'product', label: 'Veredicto Final',        duration: 75,  instructions: 'Declare o vencedor, para quem cada um é indicado e os links afiliados.' },
      { id: 's7', type: 'cta',     label: 'CTA Final',              duration: 45,  instructions: 'Inscrição, notificações e links na descrição.' },
    ],
  },
  'review-detalhado': {
    name: 'Review Detalhado',
    sections: [
      { id: 's1', type: 'intro',   label: 'Abertura',                  duration: 60,  instructions: 'Hook com a principal dor que o produto resolve..' },
      { id: 's2', type: 'product', label: 'Visão Geral',               duration: 90,  instructions: 'O que é, para quem é, posicionamento de preço no mercado.' },
      { id: 's3', type: 'product', label: 'Unboxing e Design',         duration: 90,  instructions: 'Materiais, acabamento, o que vem na caixa, primeiras impressões.' },
      { id: 's4', type: 'product', label: 'Funcionalidades e Testes',  duration: 150, instructions: 'Teste prático de cada função principal, resultados reais.' },
      { id: 's5', type: 'product', label: 'Prós e Contras',            duration: 90,  instructions: 'Lista honesta de pontos positivos e negativos.' },
      { id: 's6', type: 'product', label: 'Para Quem Vale a Pena?',    duration: 60,  instructions: 'Perfil do comprador ideal, alternativas e faixa de preço justa.' },
      { id: 's7', type: 'cta',     label: 'CTA Final',                 duration: 45,  instructions: 'Link afiliado com urgência, inscrição e notificações.' },
    ],
  },
  'top-n-review': { name: 'Top-N Avaliação de Produtos', sections: [
    { id: 's1', type: 'intro',   label: 'Abertura',   duration: 60,  instructions: '' },
    { id: 's2', type: 'product', label: 'Produto #5', duration: 90,  instructions: '' },
    { id: 's3', type: 'product', label: 'Produto #4', duration: 90,  instructions: '' },
    { id: 's4', type: 'product', label: 'Produto #3', duration: 120, instructions: '' },
    { id: 's5', type: 'product', label: 'Produto #2', duration: 120, instructions: '' },
    { id: 's6', type: 'product', label: 'Produto #1', duration: 150, instructions: '' },
    { id: 's7', type: 'cta',     label: 'CTA Final',  duration: 45,  instructions: '' },
  ]},
}

async function llm(env, opts) {
  const { callLLM } = await import('../lib/llm.js')
  return callLLM(env, opts)
}

// Format a product's price in its OWN currency (USD→$, EUR→€, MXN→MX$, BRL→R$).
function fmtProductPrice(p) {
  if (!p.price) return 'preço não disponível'
  const cur = p.currency || 'BRL'
  const locale = cur === 'BRL' ? 'pt-BR' : cur === 'EUR' ? 'es-ES' : cur === 'MXN' ? 'es-MX' : cur === 'CAD' ? 'en-CA' : 'en-US'
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: cur }).format(p.price)
  } catch {
    const sym = ({ BRL: 'R$', USD: '$', EUR: '€', MXN: 'MX$', CAD: 'CA$' })[cur] || `${cur} `
    return `${sym}${Number(p.price).toFixed(2)}`
  }
}

function buildProductList(products) {
  return products.map((p, i) => {
    const price = fmtProductPrice(p)
    const amazonLink = p.amazonAffiliateLink || (p.marketplace === 'amazon' ? p.affiliateLink : '')
    const mlLink     = p.mlAffiliateLink     || (p.marketplace === 'mercadolivre' ? p.affiliateLink : '')
    const links = [
      amazonLink ? `Amazon: ${amazonLink}` : '',
      mlLink     ? `Mercado Livre: ${mlLink}` : '',
    ].filter(Boolean).join(' | ')

    const reviews = (p.blogReviews ?? []).slice(0, 3)
    const reviewBlock = reviews.length
      ? `\n   Opiniões de blogs:\n${reviews.map(r => `   • [${r.source}] ${r.snippet}`).join('\n')}`
      : ''

    return `${i + 1}. ${p.title}\n   Preço: ${price} | Avaliação: ${p.rating || '—'}★ | Reviews: ${(p.reviews ?? 0).toLocaleString()} | Marketplace: ${p.marketplace}${links ? `\n   Links afiliado: ${links}` : ''}${reviewBlock}`
  }).join('\n\n')
}

function buildChannelContext(profile) {
  if (!profile) return ''
  return `
CANAL: ${profile.channelName || 'canal de reviews'}
NICHO: ${profile.niche || 'produtos de consumo'}
PÚBLICO-ALVO: ${profile.targetAudience || 'consumidores brasileiros'}
TOM DE VOZ: ${profile.tone || 'energético e informativo'}
ESTILO DE ABERTURA: ${profile.introStyle || 'hook_question'}
CTA PADRÃO: ${profile.ctaStyle || 'links na descrição'}
FRASES ASSINATURA: ${profile.signaturePhrases || ''}
`.trim()
}


export async function generateScript(env, { blueprintId, blueprintData, catalogIds, productIds, language, channelProfileId }) {
  const db = getDb(env)

  // Resolve blueprint — prefer explicit blueprintData, then DB lookup, then fallback
  let blueprint = blueprintData
  if (!blueprint && blueprintId) {
    try {
      const { data } = await db.from('blueprints').select('*').eq('id', blueprintId).single()
      if (data) blueprint = data
    } catch {}
    if (!blueprint) blueprint = FALLBACK_BLUEPRINTS[blueprintId] ?? FALLBACK_BLUEPRINTS['top-n-review']
  }
  if (!blueprint) blueprint = FALLBACK_BLUEPRINTS['top-n-review']

  // ── Canonical PRAC alignment ──────────────────────────────────────────────
  // When the incoming blueprint references a known canonical template (PRAC),
  // use the backend's canonical sections (correct labels + rich instructions +
  // durations) as the single source of truth. This keeps the standard blueprint
  // structure consistent regardless of any stale frontend copy. A saved/custom
  // DB blueprint (no templateId) is left untouched so user customizations stick.
  const canonicalId = blueprint?.templateId || blueprintId
  if (canonicalId && FALLBACK_BLUEPRINTS[canonicalId]) {
    const canonical = FALLBACK_BLUEPRINTS[canonicalId]
    blueprint = {
      ...blueprint,
      id:        blueprint?.id ?? null,
      name:      blueprint?.name || canonical.name,
      maxTokens: canonical.maxTokens ?? blueprint?.maxTokens,
      sections:  canonical.sections,   // canonical labels + rich instructions
    }
  }

  // Resolve channel profile
  let profile = null
  if (channelProfileId) {
    try {
      const { data } = await db.from('channel_profiles').select('*').eq('id', channelProfileId).single()
      profile = data
    } catch {}
  }
  if (!profile) {
    try {
      const { data } = await db.from('channel_profiles').select('*').order('createdAt', { ascending: true }).limit(1).maybeSingle()
      profile = data
    } catch {}
  }

  // Resolve products
  let products = []
  const ids = productIds ?? catalogIds ?? []
  if (ids.length) {
    const { data: directProducts } = await db.from('products').select('*').in('id', ids)
    products = directProducts ?? []
  }
  if (!products.length) {
    const { data: top } = await db.from('products').select('*').order('score', { ascending: false }).limit(5)
    products = top ?? []
  }
  if (!products.length) {
    throw new Error('Nenhum produto no catálogo — execute uma sessão de mineração primeiro')
  }

  const sections       = blueprint.sections ?? []
  const productList    = buildProductList(products)
  const channelContext = buildChannelContext(profile)
  const totalSeconds   = sections.reduce((s, sec) => s + (sec.duration ?? 60), 0)
  const sectionLabels  = sections.map((s) => s.label).join(' → ')
  const markerList     = sections.map((s) => `[${s.label}]`).join('\n')

  const langCode    = (language ?? 'pt').toLowerCase()
  const isEnglish   = langCode.startsWith('en')
  const isSpanish   = langCode.startsWith('es')
  // Distinguish Mexico vs Spain Spanish variants. Backward compat: bare 'es' → Mexico.
  const isSpanishMX = isSpanish && (langCode === 'es-mx' || langCode === 'es_mx' || langCode === 'es')
  const isSpanishES = isSpanish && (langCode === 'es-es' || langCode === 'es_es')
  const lang        = isEnglish ? 'en' : isSpanish ? 'es' : 'pt'
  const langLabel   = isEnglish ? 'English'
    : isSpanishMX ? 'Español (México)'
    : isSpanishES ? 'Español (España)'
    : isSpanish   ? 'Spanish'
    : 'Portuguese (Brazilian)'

  // Language guard — placed FIRST so the model cannot miss it
  const langGuard = isEnglish
    ? `CRITICAL INSTRUCTION: Write the ENTIRE script in English. Every word, sentence, and section must be in English. Do NOT use any Portuguese or Spanish words or phrases.\n\n`
    : isSpanishMX
      ? `INSTRUCCIÓN CRÍTICA: Escribe TODO el guion en ESPAÑOL DE MÉXICO. Cada palabra, frase y sección debe estar en español mexicano. Usa expresiones y modismos propios de México ("pesos mexicanos", "está padrísimo", "ahorita", etc.). NO uses portugués ni inglés.\n\n`
      : isSpanishES
        ? `INSTRUCCIÓN CRÍTICA: Escribe TODO el guion en ESPAÑOL DE ESPAÑA. Cada palabra, frase y sección debe estar en español peninsular. Usa expresiones y modismos propios de España ("euros", "mola", "guay", "tío/tía", etc.). NO uses portugués ni inglés.\n\n`
        : `INSTRUÇÃO CRÍTICA: Escreva TODO o roteiro em Português Brasileiro.\n\n`

  // Currency context — USD is always the PRIMARY spoken currency in every script.
  // Local currency appears in parentheses as an approximate conversion so viewers
  // know what to expect when they check the price locally.
  const currencyCtx = isEnglish
    ? ''  // USD is native — no conversion needed
    : isSpanishMX
      ? `MONEDA: Los precios en la lista pueden estar en pesos mexicanos (MXN). SIEMPRE di el precio principal en USD (ej: "$39 dólares") y añade el equivalente en MXN entre paréntesis ("aprox. $680 pesos mexicanos"). Tasa de referencia: 1 USD ≈ 17 MXN. Si el precio ya está en USD, úsalo directamente y añade la conversión a MXN.\n`
      : isSpanishES
        ? `MONEDA: Los precios en la lista pueden estar en euros (EUR). SIEMPRE di el precio principal en USD (ej: "$39 dólares") y añade el equivalente en EUR entre paréntesis ("aprox. €36"). Tasa de referencia: 1 USD ≈ 0,92 EUR. Si el precio ya está en USD, úsalo directamente y añade la conversión a EUR.\n`
        : `MOEDA: Os preços na lista podem estar em reais (BRL). SEMPRE mencione o preço principal em USD (ex: "$39 dólares") e acrescente o equivalente em reais entre parênteses ("aprox. R$215"). Taxa de referência: 1 USD ≈ R$5,50. Se o preço já está em USD, use-o diretamente e acrescente a conversão para reais.\n`

  const isPracLongForm = blueprint.id === 'prac-type-long-form' || (blueprint.name ?? '').includes('Top 5')
  const isPrac = isPracLongForm || (blueprint.id ?? '').startsWith('prac-') || (blueprint.name ?? '').includes('PRAC')

  const systemPrompt = isEnglish
    ? `${langGuard}You are a YouTube scriptwriter specializing in affiliate product reviews.
Write engaging, persuasive scripts that follow the provided structure exactly.
Maintain a ${profile?.tone || 'energetic and informative — like a friend who actually tested the product'} tone.

ADD-TO-CART STRATEGY (MANDATORY in every script — drives sales conversion):
━ WHERE: In the opening/hook, include ONE concise, natural sentence telling the viewer to open the first pinned comment and add the product(s) to cart RIGHT NOW, while watching.
━ WHY: A viewer who adds to cart won't lose track of the product — even if they don't buy immediately, the purchase intent is captured. This significantly increases conversions.
━ HOW: Frame it as CONVENIENCE for the viewer, never as sales pressure. Never use it as an affiliate disclosure.
━ ACCEPTED VARIATIONS (use one per video, adapt to the product):
  • "While we're here, go ahead and open the first pinned comment and add your favorite to cart — that way you won't lose track of it."
  • "Do yourself a favor and save your top pick to cart through the pinned comment, so you don't lose the deal."
  • "Open the pinned comment and drop your favorite in the cart now, before the price changes."
━ Use it ONCE in the opening — subtle, quick, natural.

${isPracLongForm ? `STRATEGIC CTA FRAMEWORK (Top 5):
━ RETENTION: Create "open loops" — tease that the next product is better WITHOUT naming its rank. The champion is only revealed at the end.
━ NO REDUNDANCY: Announce each product's rank EXACTLY ONCE, at the start of that product's block (e.g. "In 4th place…"). NEVER announce the next rank at the end of the previous block and then repeat it at the start of the next. No warning/intro sentence before starting the next position.
━ SOCIAL PROOF: Ratings (X out of 5 stars) must be woven naturally into a sentence, NEVER a separate list. e.g. "With a solid 4.7 out of 5 stars, it proves itself..."
━ PRICE ANCHOR: Use "an investment of around $X" — never "it costs" or "price". Qualifies the lead.
━ PER-PRODUCT CTA: Every product section ENDS with "the link is in the first pinned comment."
━ CHAMPION CTA: End the #1 product with emotional urgency — "Don't risk choosing something that'll let you down; grab the champion right now through the link in the pinned comment."

` : ''}STRICT LINK RULES:
- NEVER embed raw URLs — they are not spoken.
- Use only "first pinned comment" as the link reference.

STRICT PRICE/RATING RULES:
- NEVER mention price or rating in the hook/intro.
- Price and rating appear ONLY inside each product's own section, woven naturally.

When "Blog opinions" are available, use as factual basis — rewrite in channel voice.
Language: ENGLISH`
    : `${langGuard}Você é um roteirista especializado em reviews de afiliados${isSpanishMX ? ' para o público hispanohablante mexicano' : isSpanishES ? ' para o público hispanohablante de España' : ' para o mercado brasileiro'}.
Escreva roteiros conversacionais, envolventes e persuasivos seguindo exatamente a estrutura fornecida.
Tom: ${profile?.tone || 'energético, direto e informativo — como um amigo que já testou o produto'}.

ESTRATÉGIA DE "ADICIONAR AO CARRINHO" (obrigatória em TODO roteiro PRAC):
━ ONDE: Na abertura/hook do vídeo, inclua UMA frase concisa e natural pedindo ao espectador para abrir o primeiro comentário fixado e já adicionar o(s) produto(s) ao carrinho AGORA, enquanto assiste.
━ POR QUÊ: O espectador que adiciona ao carrinho não perde o produto de vista — mesmo que não compre na hora, a intenção de compra fica registrada. Isso aumenta significativamente as conversões.
━ COMO: Frame como uma CONVENIÊNCIA para o espectador, não como pressão de venda. Tom: "Já aproveite para abrir o comentário fixado e adicionar ao carrinho — assim você não perde de vista enquanto assistimos juntos."
━ VARIAÇÕES ACEITAS (use uma por vídeo, adapte ao produto):
  • "Já aproveite para adicionar ao carrinho pelo link no comentário fixado — assim você não perde a promoção de vista."
  • "Enquanto assistimos, abre o link fixado e salva no carrinho o que chamar sua atenção."
  • "Para não perder nenhuma opção, já deixa o link do comentário aberto no outro dedinho."
━ NÃO repita em cada produto — 1x na abertura é o suficiente. Subtil, rápido, natural.

${isPracLongForm ? `FRAMEWORK ESTRATÉGICO COMPLETO (Top 5):
━ RETENÇÃO: Crie "loops abertos" — sugira que o próximo produto é melhor SEM nomear a posição dele. A campeã só é revelada no final.
━ ANTI-REDUNDÂNCIA: Anuncie a posição de cada produto UMA ÚNICA VEZ, na abertura do bloco do produto (ex: "Em 4º lugar…"). NUNCA anuncie a próxima posição no fim do bloco anterior para depois repeti-la no início do bloco seguinte. Sem frase de aviso/introdução antes de iniciar a próxima colocação.
━ PROVA SOCIAL: Avaliações integradas naturalmente. Ex: "Com 4.7 de 5 estrelas, ela se prova..."
━ ÂNCORA DE PREÇO: ${isSpanishMX ? 'Usa "una inversión de aproximadamente $X dólares (aprox. $Y pesos mexicanos)" — nunca "cuesta" o "precio". Tasa: 1 USD ≈ 17 MXN.' : isSpanishES ? 'Usa "una inversión de aproximadamente $X dólares (aprox. €Y)" — nunca "cuesta" o "precio". Tasa: 1 USD ≈ 0,92 EUR.' : 'Use "investimento de aproximadamente $X dólares (aprox. R$Y)" — nunca "custa" ou "preço". Taxa: 1 USD ≈ R$5,50.'}
━ CTA POR PRODUTO: Cada produto TERMINA com "o link está no primeiro comentário fixado."
━ CTA CAMPEÃ: Urgência emocional — "Não corra o risco de [consequência negativa]; garanta agora clicando no link do comentário fixado."

` : ''}REGRAS DE LINKS:
- NUNCA cole URLs brutas — não são faladas.
- Use apenas "primeiro comentário fixado" como referência de links.

REGRAS DE PREÇO E AVALIAÇÃO:
- NUNCA mencione preço ou estrelas na abertura/hook.
- Preço e avaliação SOMENTE dentro da seção de cada produto, integrados naturalmente.

Quando "Opiniões de blogs" estiverem disponíveis, use como base factual — reescreva na voz do canal.
IDIOMA DE SAÍDA OBRIGATÓRIO: ${isSpanishMX ? 'ESPAÑOL DE MÉXICO — escribe TODO el guion en español mexicano' : isSpanishES ? 'ESPAÑOL DE ESPAÑA — escribe TODO el guion en español peninsular' : 'PORTUGUÊS BRASILEIRO'}`

  const userPrompt = isEnglish
    ? `${langGuard}Write a "${blueprint.name}" YouTube script approximately ${Math.round(totalSeconds / 60)} minutes long.

${channelContext ? `CHANNEL CONTEXT:\n${channelContext}\n` : ''}
STRUCTURE (sections): ${sectionLabels}
${sections.map((s) => s.instructions ? `- ${s.label}: ${s.instructions}` : '').filter(Boolean).join('\n')}

PRODUCTS TO REVIEW:
${productList}

OUTPUT FORMAT — CRITICAL:
Output EVERY section below, in this EXACT order, each starting with its marker on its OWN line, followed by that section's content:
${markerList}
The VERY FIRST line of your output must be the marker [${sections[0]?.label ?? 'Título SEO'}] — never write any text before the first marker. Do not skip, rename, merge, or reorder markers.

INSTRUCTIONS:
- Prices and ratings only inside each product's own section — never in the hook
- CURRENCY: All products are priced in USD. Use "$X" directly — no conversion needed.
- Links only in CTA or as "the link is in the first pinned comment" — never raw URLs
- CTA encouraging subscribe and bell notification
- Conversational and natural tone in English
- Each section should be approximately ${Math.round(totalSeconds / sections.length / 60 * 100)} words`
    : `${langGuard}${isSpanishMX ? `Escribe un guion de YouTube "${blueprint.name}" de aproximadamente ${Math.round(totalSeconds / 60)} minutos. TODO el guion debe estar en ESPAÑOL MEXICANO.` : isSpanishES ? `Escribe un guion de YouTube "${blueprint.name}" de aproximadamente ${Math.round(totalSeconds / 60)} minutos. TODO el guion debe estar en ESPAÑOL DE ESPAÑA.` : `Escreva um roteiro de YouTube "${blueprint.name}" com duração aproximada de ${Math.round(totalSeconds / 60)} minutos.`}

${channelContext ? `CONTEXTO DO CANAL:\n${channelContext}\n` : ''}
ESTRUTURA (seções): ${sectionLabels}
${sections.map((s) => s.instructions ? `- ${s.label}: ${s.instructions}` : '').filter(Boolean).join('\n')}

PRODUTOS A REVISAR:
${productList}

PRODUTOS: ${products.length} produto(s) no total.
${blueprint.id === 'prac-type-long-form' || (blueprint.name ?? '').includes('Top 5') ? 'ATENÇÃO: São exatamente 5 produtos. A seção "Últimos Colocados" DEVE cobrir os produtos #5, #4 e #3 (MÍNIMO 450 palavras = 3 × 150w). A seção "2º Lugar" cobre o produto #2. A seção "1º Lugar" cobre o produto #1.' : ''}

FORMATO DE SAÍDA — CRÍTICO:
Gere TODAS as seções abaixo, NESTA ordem exata, cada uma começando com seu marcador em uma LINHA PRÓPRIA, seguido do conteúdo da seção:
${markerList}
A PRIMEIRA linha da sua saída deve ser o marcador [${sections[0]?.label ?? 'Título SEO'}] — nunca escreva nenhum texto antes do primeiro marcador. Não pule, renomeie, junte ou reordene marcadores.

INSTRUÇÕES:
- Preços e avaliações APENAS dentro da seção de cada produto — nunca na abertura/hook
- ${currencyCtx.trim()}
- Links APENAS no CTA ou como "link no primeiro comentário fixado" — nunca URLs brutas no meio do texto
- CTA com incentivo a se inscrever e ativar notificações
- Tom conversacional e natural em ${isSpanishMX ? 'ESPAÑOL DE MÉXICO — 100% en español mexicano, nunca en portugués' : isSpanishES ? 'ESPAÑOL DE ESPAÑA — 100% en español peninsular, nunca en portugués' : 'Português Brasileiro'}
- Cada seção deve ter aproximadamente ${Math.round(totalSeconds / sections.length / 60 * 100)} palavras`

  const maxTokens = blueprint.maxTokens ?? 3000
  const text = await llm(env, { system: systemPrompt, prompt: userPrompt, maxTokens })

  // Parse sections from the generated text
  const parsedSections = parseSections(text, sections)

  // ── Smart title: blueprint type + concise product keyword ───────────────────
  // Strip marketplace noise (brand codes, model numbers, long spec strings)
  // and keep the first meaningful 2–4 words from the top product name.
  function cleanProductTitle(raw = '') {
    return raw
      .replace(/\b(com|para|de|do|da|em|no|na|os|as|um|uma)\b/gi, '')  // pt stop words
      .replace(/[()[\]{}_]/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .split(/\s+/)
      .slice(0, 4)
      .join(' ')
  }

  const blueprintLabel = blueprint.name ?? 'Roteiro'
  const topProduct     = products[0]?.title ? cleanProductTitle(products[0].title) : null
  const langSuffix     = isEnglish ? ' [EN]' : isSpanish ? ' [ES]' : ''
  const dateStr        = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const scriptTitle    = topProduct
    ? `${blueprintLabel} — ${topProduct}${langSuffix}`
    : `${blueprintLabel} · ${dateStr}${langSuffix}`

  // ── Auto-create a project for this script ──────────────────────────────────
  let autoProjectId = null
  try {
    const { uid: uidFn } = await import('../lib/uid.js')
    const projId  = uidFn()
    const now     = new Date().toISOString()
    const project = { id: projId, name: scriptTitle, createdAt: now, updatedAt: now, scriptIds: [] }
    if (env.KV1) {
      await env.KV1.put(`project:${projId}`, JSON.stringify(project))
      const idx = (await env.KV1.get('projects:index', { type: 'json' })) ?? []
      idx.unshift(projId)
      await env.KV1.put('projects:index', JSON.stringify(idx))
      autoProjectId = projId
    }
  } catch {}

  const baseRow = {
    id:             uid(),
    catalogEntryId: null,
    blueprintId:    blueprint.id ?? blueprintId ?? 'custom',
    title:          scriptTitle,
    text,
    language:       language ?? 'pt',
    confidence:     92,
    version:        1,
    prompt:         userPrompt,
    productIds:     (productIds ?? catalogIds ?? []).map(String),
    projectId:      autoProjectId,
  }

  // Extract the offending column name from a Supabase/PostgREST schema error message
  function extractBadColumn(msg = '') {
    // "Could not find the 'xyz' column of 'scripts' in the schema cache"
    const m = msg.match(/Could not find (?:the )?[`'""]?(\w+)[`'""]? column/i)
      ?? msg.match(/column ["`']?(\w+)["`']? (?:of|does not exist)/i)
    return m?.[1] ?? null
  }

  function isSchemaErr(e) {
    const m = e?.message ?? ''
    return m.includes('Could not find') || m.includes('column') || m.includes('does not exist') || m.includes('schema cache')
  }

  async function tryInsert(row) {
    const { data, error } = await db.from('scripts').insert(row).select().single()
    return { data, error }
  }

  const fullRow = { ...baseRow, sections: parsedSections, title: scriptTitle, ...(profile?.id ? { channelProfileId: profile.id } : {}) }

  let { data: saved, error: err } = await tryInsert(fullRow)

  // Progressively strip unknown columns and retry (up to 8 attempts)
  let currentRow = { ...fullRow }
  let attempts = 0
  while (err && isSchemaErr(err) && attempts < 8) {
    attempts++
    const badCol = extractBadColumn(err.message)
    if (badCol && badCol in currentRow) {
      // Remove exactly the offending column and retry
      const next = { ...currentRow }
      delete next[badCol]
      currentRow = next
    } else {
      // Can't identify column — fall back to minimal safe set
      currentRow = { id: baseRow.id, blueprintId: baseRow.blueprintId, title: scriptTitle, text, language: language ?? 'pt' }
    }
    ;({ data: saved, error: err } = await tryInsert(currentRow))
  }

  if (err) throw new Error(err.message)

  // ── Belt-and-suspenders: force title via explicit UPDATE ─────────────────
  // In rare Supabase schema-cache edge cases the INSERT may persist but the
  // title field gets silently dropped (schema cache not yet refreshed).
  // A separate UPDATE guarantees the title is always written.
  if (saved?.id) {
    const titleToSet = saved.title || scriptTitle
    if (!saved.title || saved.title !== scriptTitle) {
      const { data: patched } = await db
        .from('scripts')
        .update({ title: scriptTitle })
        .eq('id', saved.id)
        .select()
        .single()
      if (patched) saved = patched
      else saved = { ...saved, title: scriptTitle }  // patch in-memory if DB call fails
    } else {
      saved = { ...saved, title: titleToSet }
    }
  }

  return saved
}

// Normalize a label for fuzzy matching: lowercase, strip accents + punctuation.
function normLabel(s) {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // strip accents
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function parseSections(text, blueprintSections) {
  // Split by [SECTION] markers → [preamble, label1, content1, label2, content2, …]
  const sectionPattern = /\[([^\]]+)\]/g
  const parts    = text.split(sectionPattern)
  const preamble = (parts[0] ?? '').trim()   // text before the very first marker
  const parsed   = []
  for (let i = 1; i < parts.length; i += 2) {
    parsed.push({ label: (parts[i] ?? '').trim(), content: (parts[i + 1] ?? '').trim() })
  }

  const used = new Set()

  // Best-match a blueprint section to one of the parsed blocks by label similarity.
  function matchIndex(secLabel) {
    const target = normLabel(secLabel)
    if (!target) return -1
    // 1) exact normalized label match
    let i = parsed.findIndex((p, idx) => !used.has(idx) && normLabel(p.label) === target)
    if (i !== -1) return i
    // 2) substring match either direction (labels long enough to be meaningful)
    i = parsed.findIndex((p, idx) => {
      if (used.has(idx)) return false
      const pl = normLabel(p.label)
      return pl.length > 2 && (pl.includes(target) || target.includes(pl))
    })
    return i
  }

  const isTitleSection = (sec) =>
    sec.duration === 0 ||
    /\b(titulo|seo|title)\b/.test(normLabel(sec.label))

  // Pass 1: assign by label match
  const result = blueprintSections.map((sec) => {
    const mi = matchIndex(sec.label)
    let content = ''
    if (mi !== -1) { content = parsed[mi].content; used.add(mi) }
    return {
      id:           sec.id ?? uid(),
      type:         sec.type ?? 'product',
      label:        sec.label,
      duration:     sec.duration ?? 60,
      instructions: sec.instructions ?? '',
      content,
      _matched:     mi !== -1,
    }
  })

  // Pass 2: an unmatched SEO/title section (duration 0) with no marker →
  // use the first line of the preamble (the LLM often prints the title there).
  for (const sec of result) {
    if (!sec._matched && !sec.content && isTitleSection(sec) && preamble) {
      sec.content = preamble.split('\n').map(l => l.trim()).filter(Boolean)[0] ?? ''
      sec._matched = !!sec.content
    }
  }

  // Pass 3: fill any still-empty sections positionally from leftover parsed blocks,
  // preserving document order. This recovers cases where the LLM renamed a marker.
  const leftover = parsed.map((_, idx) => idx).filter(idx => !used.has(idx))
  let lp = 0
  for (const sec of result) {
    if (!sec.content && lp < leftover.length) {
      sec.content = parsed[leftover[lp]].content
      used.add(leftover[lp]); lp++
    }
  }

  return result.map(({ _matched, ...sec }) => sec)
}

export async function regenerateSection(env, { scriptId, sectionIndex, instructions }) {
  const db = getDb(env)

  const { data: script, error } = await db.from('scripts').select('*').eq('id', scriptId).single()
  if (error || !script) throw new Error('Roteiro não encontrado')

  const sections = script.sections ?? []
  const section  = sections[sectionIndex]
  if (!section) throw new Error(`Seção ${sectionIndex} não encontrada`)

  // Resolve channel profile for context
  let profile = null
  if (script.channelProfileId) {
    try {
      const { data } = await db.from('channel_profiles').select('*').eq('id', script.channelProfileId).single()
      profile = data
    } catch {}
  }

  const contextSections = sections.map((s, i) => {
    if (i === sectionIndex) return `[${s.label}] (REESCREVER ESTA SEÇÃO)`
    return `[${s.label}]: ${s.content?.slice(0, 100) ?? ''}…`
  }).join('\n')

  const rlc          = (script.language ?? 'pt').toLowerCase()
  const regenIsEn    = rlc.startsWith('en')
  const regenIsEs    = rlc.startsWith('es')
  const regenGuard   = regenIsEn
    ? `CRITICAL: Rewrite ONLY in English. No Portuguese or Spanish.\n\n`
    : regenIsEs
      ? `INSTRUCCIÓN CRÍTICA: Reescribe SOLO en ESPAÑOL neutro. Nada de portugués ni inglés.\n\n`
      : `INSTRUÇÃO: Reescreva APENAS em Português Brasileiro.\n\n`
  const sysPrompt = regenIsEn
    ? `${regenGuard}You are a YouTube scriptwriter. Rewrite ONLY the indicated section while keeping consistency with the rest of the script.\nTone: ${profile?.tone ?? 'energetic and informative'}. Language: ENGLISH.\nReturn ONLY the section content, no extra markers.`
    : regenIsEs
      ? `${regenGuard}Eres un guionista de YouTube. Reescribe SOLO la sección indicada manteniendo coherencia con el resto del guion.\nTono: ${profile?.tone ?? 'enérgico e informativo'}. Idioma: ESPAÑOL.\nDevuelve SOLO el contenido de la sección, sin marcadores extra.`
      : `${regenGuard}Você é um roteirista de YouTube. Reescreva APENAS a seção indicada mantendo consistência com o restante do roteiro.\nTom: ${profile?.tone ?? 'energético e informativo'}. Idioma: PORTUGUÊS BRASILEIRO.\nRetorne APENAS o conteúdo da seção, sem marcadores extras.`

  const userPrompt = `ROTEIRO ATUAL (contexto):
${contextSections}

REESCREVA a seção "${section.label}" com as seguintes instruções adicionais:
${instructions || 'Melhore o engajamento e o apelo à ação. Mantenha o tom do canal.'}

Duração alvo: ~${Math.round((section.duration ?? 60) / 60 * 130)} palavras.`

  const text = await llm(env, { system: sysPrompt, prompt: userPrompt, maxTokens: 800 })

  sections[sectionIndex] = { ...section, content: text.trim() }

  const { data: updated, error: uErr } = await db
    .from('scripts')
    .update({ sections, updatedAt: new Date().toISOString() })
    .eq('id', scriptId)
    .select()
    .single()
  if (uErr) throw new Error(uErr.message)
  return updated
}

export async function listScripts(env) {
  const db = getDb(env)
  const { data, error } = await db
    .from('scripts')
    .select('*')
    .order('createdAt', { ascending: false })
    .limit(50)
  if (error) {
    // Schema cache may be ahead of DB — fall back to stable columns + title + sections
    const { data: fallback, error: e2 } = await db
      .from('scripts')
      .select('id, "catalogEntryId", "blueprintId", title, sections, text, language, confidence, version, "createdAt"')
      .order('createdAt', { ascending: false })
      .limit(50)
    if (e2) {
      // title/sections columns may not exist yet — absolute minimum
      const { data: minimal, error: e3 } = await db
        .from('scripts')
        .select('id, "catalogEntryId", "blueprintId", text, language, confidence, version, "createdAt"')
        .order('createdAt', { ascending: false })
        .limit(50)
      if (e3) throw new Error(e3.message)
      return minimal ?? []
    }
    return fallback ?? []
  }
  return data
}

/**
 * generateShorts — slice a longform script into per-product PRAC Short-Form scripts.
 *
 * For each product section in the parent script, asks the LLM to compress it into
 * a 75-130 word, 30-60s Short. Each short is saved as its own script row and linked
 * to the same project as the parent.
 */
export async function generateShorts(env, parentScriptId) {
  const db = getDb(env)

  const { data: parent, error } = await db.from('scripts').select('*').eq('id', parentScriptId).single()
  if (error || !parent) throw new Error('Roteiro pai não encontrado')

  const sections   = (parent.sections ?? []).filter(s => s.type === 'product' && s.content?.trim())
  if (!sections.length) throw new Error('Nenhuma seção de produto encontrada no roteiro para gerar Shorts')

  const language  = parent.language ?? 'pt'
  const isPT      = !language.toLowerCase().startsWith('en')
  const projectId = parent.projectId ?? null

  const system = isPT
    ? `Você é um roteirista especializado em Short-Form para TikTok, Instagram Reels e YouTube Shorts.
Receba um trecho de review de produto e comprima em um script de 75-130 palavras (30-60 segundos).
ESTRUTURA OBRIGATÓRIA em ordem:
1. Hook (3s): pergunta ou afirmação impactante que para o scroll — sem começar com "Você sabia"
2. Produto + Diferencial: nome do produto e seu principal "wow factor" visual
3. Preço + Avaliação: âncora de preço e nota (ex: "por menos de R$ XXX, com X estrelas")
4. CTA: "Link no comentário fixado" — máximo 10 palavras
REGRAS: sem URLs, sem aviso de afiliado, máximo 130 palavras TOTAIS.`
    : `You are a Short-Form scriptwriter for TikTok, Reels, and YouTube Shorts.
Take a product review excerpt and compress it into a 75-130 word (30-60s) script.
REQUIRED STRUCTURE:
1. Hook (3s): scroll-stopping question or bold statement
2. Product + Wow Factor: product name and main visual differential
3. Price + Rating: price anchor and star rating
4. CTA: "Link in pinned comment" — max 10 words
RULES: no URLs, no affiliate disclosure, max 130 words TOTAL.`

  const shorts = []

  for (const section of sections) {
    try {
      const prompt = isPT
        ? `Trecho do review (seção "${section.label}"):\n\n${section.content}\n\nGere o script Short-Form de 75-130 palavras.`
        : `Review excerpt (section "${section.label}"):\n\n${section.content}\n\nGenerate the 75-130 word Short-Form script.`

      const text = await llm(env, { system, prompt, maxTokens: 400 })

      // Build a short script row
      const shortId    = uid()
      const shortTitle = `Short · ${(parent.title ?? section.label).slice(0, 50)}`

      // Auto-create or reuse project
      let shortProjectId = projectId
      if (!shortProjectId) {
        try {
          const projId  = uid()
          const now     = new Date().toISOString()
          const project = { id: projId, name: parent.title ?? 'Shorts', createdAt: now, updatedAt: now }
          if (env.KV1) {
            await env.KV1.put(`project:${projId}`, JSON.stringify(project))
            const idx = (await env.KV1.get('projects:index', { type: 'json' })) ?? []
            idx.unshift(projId)
            await env.KV1.put('projects:index', JSON.stringify(idx))
            shortProjectId = projId
          }
        } catch {}
      }

      const row = {
        id:          shortId,
        blueprintId: 'prac-short-form',
        title:       shortTitle,
        text,
        language,
        confidence:  90,
        version:     1,
        videoType:   'short',
        parentScriptId: parentScriptId,
        projectId:   shortProjectId,
        sections: [{
          id: uid(), type: 'product', label: section.label,
          duration: 45, instructions: '', content: text,
        }],
        createdAt: new Date().toISOString(),
      }

      const { data: saved } = await db.from('scripts').insert(row).select().single()
      shorts.push(saved ?? row)
    } catch (e) {
      console.error(`[generateShorts] section "${section.label}" failed:`, e.message)
    }
  }

  return shorts
}
