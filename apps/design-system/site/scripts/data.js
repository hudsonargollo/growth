// ============================================
// DATA: Skill focus areas, command processes, relationships
// ============================================

// Items that are fully complete and ready for public use
// All others will show "Coming Soon"
export const readySkills = [
  'tektone'  // Consolidated skill with all design domains
];

export const readyCommands = [
  'layout'  // First command to be fully completed
];

// Commands marked as alpha — shown with a badge in the UI
export const alphaCommands = [
  'live'
];

// Consolidated tektone skill with reference domains
export const skillFocusAreas = {
  'tektone': [
    { area: 'Typography', detail: 'Escala, ritmo, hierarquia, expressão' },
    { area: 'Color & Contrast', detail: 'Acessibilidade, sistemas, temas' },
    { area: 'Spatial Design', detail: 'Layout, espaçamento, composição' },
    { area: 'Responsive', detail: 'Layouts fluidos, alvos de toque' },
    { area: 'Interaction', detail: 'Estados, feedback, affordances' },
    { area: 'Motion', detail: 'Microinterações, transições' },
    { area: 'UX Writing', detail: 'Clareza, voz, mensagens de erro' }
  ]
};

// Slop tells we prevent in each discipline. Same seven categories, but the
// detail line communicates what bad-default we catch — not what we teach.
export const slopFocusAreas = {
  'tektone': [
    { area: 'Typography', detail: 'Uma escala tipográfica com contraste real, em uma fonte escolhida de propósito, não Inter por reflexo.' },
    { area: 'Color & Contrast', detail: 'Paletas que passam no WCAG e se comprometem com um matiz. O gradiente roxo padrão nunca é publicado.' },
    { area: 'Spatial Design', detail: 'Estrutura a partir de espaçamento e ritmo, não uma grade de cards idênticos aninhados em mais cards.' },
    { area: 'Responsive', detail: 'Feito primeiro para a tela pequena, com breakpoints que seguem o conteúdo.' },
    { area: 'Interaction', detail: 'Estados honestos e affordances claras, sem recorrer a um modal ou texto em gradiente.' },
    { area: 'Motion', detail: 'Movimento que suaviza como física e se acomoda. Nada quica ou salta além do ponto.' },
    { area: 'UX Writing', detail: 'Texto específico que nomeia o que a coisa faz, não "Bem-vindo à nossa plataforma."' }
  ]
};

// Guideline counts per dimension (verified from reference files)
export const dimensionGuidelineCounts = {
  'Typography': 33,
  'Color & Contrast': 29,
  'Spatial Design': 27,
  'Motion': 32,
  'Interaction': 36,
  'Responsive': 23,
  'UX Writing': 32
};

// Reference domains within the tektone skill
export const skillReferenceDomains = [
  'typography',
  'color-and-contrast',
  'spatial-design',
  'responsive-design',
  'interaction-design',
  'motion-design',
  'ux-writing'
];

export const commandProcessSteps = {
  'tektone': ['Dirigir', 'Projetar', 'Construir', 'Refinar'],
  'craft': ['Moldar', 'Referenciar', 'Construir', 'Iterar'],
  'shape': ['Entrevistar', 'Sintetizar', 'Briefar', 'Confirmar'],
  'overdrive': ['Avaliar', 'Escolher', 'Construir', 'Polir'],
  'critique': ['Avaliar', 'Criticar', 'Priorizar', 'Sugerir'],
  'audit': ['Escanear', 'Documentar', 'Priorizar', 'Recomendar'],
  'typeset': ['Avaliar', 'Selecionar', 'Escalar', 'Refinar'],
  'layout': ['Avaliar', 'Grade', 'Ritmo', 'Equilibrar'],
  'colorize': ['Analisar', 'Estratégia', 'Aplicar', 'Equilibrar'],
  'animate': ['Identificar', 'Projetar', 'Implementar', 'Polir'],
  'delight': ['Identificar', 'Projetar', 'Implementar'],
  'bolder': ['Analisar', 'Amplificar', 'Impacto'],
  'quieter': ['Analisar', 'Reduzir', 'Refinar'],
  'distill': ['Auditar', 'Remover', 'Clarear'],
  'clarify': ['Ler', 'Simplificar', 'Melhorar', 'Testar'],
  'adapt': ['Analisar', 'Ajustar', 'Otimizar'],
  'polish': ['Descobrir', 'Revisar', 'Refinar', 'Verificar'],
  'optimize': ['Perfilar', 'Identificar', 'Melhorar', 'Medir'],
  'harden': ['Avaliar', 'Implementar', 'Testar', 'Verificar'],
  'onboard': ['Identificar', 'Projetar', 'Guiar', 'Medir'],
  'init': ['Explorar', 'Entrevistar', 'Configurar', 'Recomendar'],
  'document': ['Escanear', 'Extrair', 'Descrever', 'Escrever'],
  'extract': ['Identificar', 'Abstrair', 'Migrar', 'Documentar'],
  'live': ['Iniciar', 'Selecionar', 'Gerar', 'Aceitar']
};

export const commandCategories = {
  // CREATE - build something new
  'tektone': 'create',
  'craft': 'create',
  'shape': 'create',
  // EVALUATE - review and assess
  'critique': 'evaluate',
  'audit': 'evaluate',
  // REFINE - improve existing design
  'typeset': 'refine',
  'layout': 'refine',
  'colorize': 'refine',
  'animate': 'refine',
  'delight': 'refine',
  'bolder': 'refine',
  'quieter': 'refine',
  'overdrive': 'refine',
  // SIMPLIFY - reduce and clarify
  'distill': 'simplify',
  'clarify': 'simplify',
  'adapt': 'simplify',
  // HARDEN - production-ready
  'polish': 'harden',
  'optimize': 'harden',
  'harden': 'harden',
  'onboard': 'harden',
  // SYSTEM - setup and tooling
  'init': 'system',
  'document': 'system',
  'extract': 'system',
  'live': 'system'
};

// Skill relationships - now consolidated into tektone skill
// The tektone skill contains all domains as reference files
export const skillRelationships = {
  'tektone': {
    description: 'Inteligência de design abrangente com carregamento progressivo de referências',
    referenceDomains: ['typography', 'color-and-contrast', 'spatial-design', 'responsive-design', 'interaction-design', 'motion-design', 'ux-writing']
  }
};

export const commandRelationships = {
  'tektone': { flow: 'Criar: Design livre com inteligência de design completa' },
  'craft': { flow: 'Criar: Fluxo completo de moldar e construir com iteração visual' },
  'shape': { flow: 'Criar: Planejar UX e UI por descoberta estruturada' },
  'critique': { leadsTo: ['polish', 'distill', 'bolder', 'quieter', 'typeset', 'layout'], flow: 'Avaliar: Revisão de UX e design com pontuação' },
  'audit': { leadsTo: ['harden', 'optimize', 'adapt', 'clarify'], flow: 'Avaliar: Auditoria de qualidade técnica' },
  'typeset': { combinesWith: ['bolder', 'polish'], flow: 'Refinar: Corrigir tipografia e hierarquia de tipos' },
  'layout': { combinesWith: ['distill', 'adapt'], flow: 'Refinar: Corrigir layout e espaçamento' },
  'colorize': { combinesWith: ['bolder', 'delight'], flow: 'Refinar: Adicionar cor estratégica' },
  'animate': { combinesWith: ['delight'], flow: 'Refinar: Adicionar movimento com propósito' },
  'delight': { combinesWith: ['bolder', 'animate'], flow: 'Refinar: Adicionar personalidade e alegria' },
  'bolder': { pairs: 'quieter', flow: 'Refinar: Amplificar designs tímidos' },
  'quieter': { pairs: 'bolder', flow: 'Refinar: Suavizar designs agressivos' },
  'overdrive': { combinesWith: ['animate', 'delight'], flow: 'Refinar: Efeitos tecnicamente extraordinários' },
  'distill': { combinesWith: ['quieter', 'polish'], flow: 'Simplificar: Reduzir à essência' },
  'clarify': { combinesWith: ['polish', 'adapt'], flow: 'Simplificar: Melhorar o texto de UX' },
  'adapt': { combinesWith: ['polish', 'clarify'], flow: 'Simplificar: Adaptar para contextos diferentes' },
  'polish': { flow: 'Reforçar: Passagem final e alinhamento ao design system' },
  'optimize': { flow: 'Reforçar: Melhorias de performance' },
  'harden': { combinesWith: ['optimize'], flow: 'Reforçar: Casos extremos, tratamento de erros e i18n' },
  'onboard': { combinesWith: ['clarify', 'delight'], flow: 'Reforçar: Experiências de primeiro uso e estados vazios' },
  'init': { flow: 'Sistema: Configuração única do projeto. Contexto, config ao vivo, próximos passos' },
  'extract': { flow: 'Sistema: Extrair componentes e tokens do design system' },
  'live': { flow: 'Sistema: Modo de variações visuais no navegador' }
};
