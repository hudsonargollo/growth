export interface DayTask { label: string }
export interface DayData { n: string; label: string; day: string; title: string; body?: string; tasks: DayTask[] }
export interface IncludedItem { mark: string; name: string; desc: string }
export interface Turma { n: string; range: string }
export interface Faq { q: string; a: string }
export interface Cred { label: string }

export interface Copy {
  navCta: string;
  heroEyebrow: string;
  heroH1a: string;
  heroH1b: string;
  heroSub: string;
  heroItalic: string;
  heroTriggerCta: string;
  heroLockHint: string;
  urgencyPrefix: string;
  urgencyDate: string;
  urgencyMid: string;
  urgencyShort?: string;
  vslLabel: string;
  heroWatch: string;
  gateTitle: string;
  gateHint: string;
  vslSimNote: string;
  vslLockMsg: string;
  vslReopenLabel: string;
  heroTrust: { label: string }[];
  mech1: string;
  mech2a: string;
  mech2b: string;
  mech3: string;
  daysTitle: string;
  daysIntro: string;
  days: DayData[];
  inclLabel: string;
  inclTitle: string;
  included: IncludedItem[];
  tableLabel: string;
  tableTitle: string;
  tableQuote: string;
  tableBody: string;
  tableStatV: string;
  tableStatL: string;
  mentorLabel: string;
  mentorName: string;
  mentorRole: string;
  mentorBio: string;
  mentorQuote: string;
  mentorCreds: Cred[];
  priceLabel: string;
  priceCrossed: string;
  priceMain: string;
  priceMath: string;
  priceInstLabel: string;
  priceInst: string;
  priceInclLabel: string;
  priceInclVal: string;
  turmasLabel: string;
  turmas: Turma[];
  scarcity: string;
  priceCta: string;
  faqLabel: string;
  faqTitle: string;
  faqs: Faq[];
  ctaLabel: string;
  ctaTitle: string;
  ctaBody: string;
  appIntro?: string;
  appIntro2?: string;
  psLine: string;
  formName: string;
  formWhats: string;
  formEmail: string;
  formTurma: string;
  formRevenue: string;
  formSubmit: string;
  revenueOptions: { label: string }[];
  sentTitle: string;
  sentBody: string;
  footerTagline: string;
  footerContactLabel: string;
  footerDisclaimer: string;
  footerRights: string;
  navCta2?: string;
}

export const PT: Copy = {
  navCta: 'Quero minha vaga',
  heroEyebrow: 'O CÓDIGO INTERNACIONAL',
  heroH1a: 'Como fazer parte do grupo de empresários brasileiros que estão zerando o imposto',
  heroH1b: 'em 7 dias no Paraguai.',
  heroSub: 'Em 7 dias no Paraguai, você sai com a residência fiscal no bolso.',
  heroItalic: 'Tudo feito pelos órgãos oficiais do governo.',
  heroTriggerCta: 'Iniciar processo de seleção',
  heroLockHint: 'Assista ao vídeo para liberar o conteúdo',
  urgencyPrefix: 'Próxima turma',
  urgencyDate: '12/07',
  urgencyMid: 'inscrições encerram em',
  urgencyShort: 'Turma 12/07 encerra em',
  vslLabel: 'VSL · 3 MINUTOS',
  heroWatch: 'Assistir ao vídeo',
  gateTitle: 'Assista antes de qualquer coisa.',
  gateHint: 'Ao assistir, você libera o conteúdo da página.',
  vslSimNote: 'Incorpore seu VSL aqui — /public/vsl.webm',
  vslLockMsg: 'Conteúdo liberado em',
  vslReopenLabel: 'Rever vídeo',
  heroTrust: [{ label: '100% legal' }, { label: 'Órgãos oficiais do governo' }, { label: 'Residência protocolada' }],
  mech1: 'Enquanto o seu CPF for residente fiscal brasileiro, ele funciona como um rastreador no seu dinheiro.',
  mech2a: 'Se você consegue a residência no Paraguai legalmente, o rastreador desliga.',
  mech2b: 'Você fecha o mês e o dinheiro é seu.',
  mech3: 'O patrimônio que o Brasil taxava todo ano, ninguém toca.',
  daysTitle: 'Do aeroporto ao documento.',
  daysIntro: 'O que acontece em cada um dos 7 dias.',
  days: [
    { n: '01', label: 'Dia 01', day: 'Domingo', title: 'Você chega.', tasks: [{ label: 'Check-in no hotel' }, { label: 'Jantar de boas-vindas com o grupo' }, { label: 'Todo mundo se apresenta — a semana começa' }] },
    { n: '02', label: 'Dia 02', day: 'Segunda', title: 'O processo começa.', tasks: [{ label: 'Você é conduzido ao lugar correto' }, { label: 'A fila certa, na hora certa' }, { label: 'Pedindo o documento certo' }] },
    { n: '03', label: 'Dia 03', day: 'Terça', title: 'Economize na hora de comprar seus presentes.', tasks: [{ label: 'Tour de compras' }, { label: 'Eletrônicos e produtos importados a preço de fronteira' }, { label: 'À noite, livre' }] },
    { n: '04', label: 'Dia 04', day: 'Quarta', title: 'O networking de verdade. Em grande estilo.', tasks: [{ label: 'Churrasco e rodada de hot seat' }, { label: 'Seu negócio é apresentado pro grupo' }, { label: 'Saem conexões, parcerias e soluções' }] },
    { n: '05', label: 'Dia 05', day: 'Quinta', title: 'Momento livre.', tasks: [{ label: 'Aprofundar as conversas' }, { label: 'Explorar a cidade' }, { label: 'Recarregar para a reta final' }] },
    { n: '06', label: 'Dia 06', day: 'Sexta', title: 'A residência fica pronta.', tasks: [{ label: 'Residência protocolada' }, { label: 'Passagem pela Interpol' }, { label: 'Departamento de Migração — está feito' }] },
    { n: '07', label: 'Dia 07', day: 'Sábado', title: 'Você volta ao Brasil.', tasks: [{ label: 'Residência no bolso' }, { label: 'Contatos que podem mudar o seu ano' }, { label: 'De volta para casa' }] },
  ],
  inclLabel: 'O QUE ESTÁ INCLUSO',
  inclTitle: 'Tudo resolvido. Você só embarca.',
  included: [
    { mark: '❖', name: 'Hospedagem inclusa', desc: 'Os sete dias de hotel já fazem parte do investimento.' },
    { mark: '✦', name: 'Transporte local', desc: 'Deslocamento entre hotel, órgãos e compromissos resolvido.' },
    { mark: '◆', name: 'Condução nos órgãos', desc: 'A fila certa, na hora certa, pedindo o documento certo — guiado.' },
    { mark: '✜', name: 'Jantar & churrasco', desc: 'A mesa onde o grupo se conecta e os negócios acontecem.' },
    { mark: '❉', name: 'Rodada de hot seat', desc: 'Seu negócio apresentado ao grupo: conexões, parcerias e soluções.' },
    { mark: '◈', name: 'Residência fiscal protocolada', desc: 'Você volta ao Brasil com a residência no bolso.' },
  ],
  tableLabel: 'A MESA',
  tableTitle: 'A conversa de jantar que vale mais que um ano de consultoria.',
  tableQuote: 'Um contato feito nessa mesa pode pagar a viagem inteira.',
  tableBody: 'Dez empresários sob o mesmo teto por sete dias. Cada um apresenta sua empresa, onde está travado, o que está buscando. Você sai com a residência no bolso e 9 contatos no celular que valem mais que o processo inteiro.',
  tableStatV: '+9',
  tableStatL: 'contatos no celular que podem mudar o seu ano',
  mentorLabel: 'SEU MENTOR',
  mentorName: 'Pedro Silvestrini',
  mentorRole: 'Quem conduz você no Paraguai',
  mentorBio: 'Pedro percorreu — e refez dezenas de vezes — o caminho que a maioria só teme. É ele quem conduz cada turma pessoalmente: ao lugar certo, na fila certa, pedindo o documento certo. Do desembarque no domingo à residência protocolada na sexta, tudo feito pelos órgãos oficiais do governo.',
  mentorQuote: '"Não vendo promessa. Conduzo você pelo caminho que eu já andei."',
  mentorCreds: [{ label: 'Conduzido pessoalmente' }, { label: 'Órgãos oficiais' }, { label: 'Turmas enxutas' }],
  priceLabel: 'O INVESTIMENTO',
  priceCrossed: 'R$ 162.000 por ano…',
  priceMain: 'ou R$ 25.000 uma vez.',
  priceMath: 'Se você fatura R$ 50k por mês e entrega 27% ao governo, são R$ 162.000 por ano. O Código Internacional custa R$ 25.000, com hospedagem, transporte e condução inclusos.',
  priceInstLabel: 'DIVIDIDO EM 12X',
  priceInst: 'R$ 2.083,00',
  priceInclLabel: 'JÁ INCLUSO',
  priceInclVal: 'Hotel + transporte',
  turmasLabel: 'São 5 turmas. Uma por semana. Quando fechar, fechou.',
  turmas: [
    { n: 'Turma 1', range: '12 – 19 jul' },
    { n: 'Turma 2', range: '19 – 26 jul' },
    { n: 'Turma 3', range: '26 jul – 02 ago' },
    { n: 'Turma 4', range: '02 – 09 ago' },
    { n: 'Turma 5', range: '09 – 16 ago' },
  ],
  scarcity: 'São 5 turmas. Uma por semana. Quando fechar, fechou.',
  priceCta: 'Quero minha vaga no Código Internacional',
  faqLabel: 'DÚVIDAS',
  faqTitle: 'Ainda restou alguma dúvida?',
  faqs: [
    { q: 'Isso é legal?', a: 'Sim. Todo o processo é feito pelos órgãos oficiais do governo paraguaio. A residência fiscal é conquistada dentro da lei, do desembarque ao protocolo — sem atalhos, esquemas ou "jeitinhos".' },
    { q: 'O que está incluso nos R$ 25.000?', a: 'Hospedagem, transporte local e condução em todos os órgãos durante os sete dias, além do jantar de boas-vindas e do churrasco com a rodada de hot seat. Você organiza apenas a sua passagem.' },
    { q: 'Preciso morar no Paraguai?', a: 'Não. Você conquista a residência fiscal durante os sete dias presenciais. A manutenção é simples e você é orientado sobre como operar a partir dali.' },
    { q: 'Quantas pessoas por turma?', a: 'Grupos enxutos — cerca de dez empresários por semana. São 5 turmas no total, uma por semana. Quando fechar, fechou.' },
    { q: 'Posso parcelar?', a: 'Sim. O investimento de R$ 25.000 pode ser dividido em até 12x de R$ 2.083.' },
    { q: 'Como garanto minha vaga?', a: 'Você preenche a aplicação e escolhe a turma. Confirmada a vaga, enviamos os próximos passos e a preparação antes do embarque.' },
  ],
  ctaLabel: 'SUA VAGA',
  ctaTitle: 'Quero minha vaga no Código Internacional.',
  appIntro: 'São apenas 10 empresários por turma, 5 turmas, uma por semana. Depois disso, o programa encerra com um grupo de 50 empresários brasileiros pagando zero imposto — com uma experiência de networking e conexão que vale o seu tempo.',
  appIntro2: 'Cada aplicação é lida pessoalmente pelo Pedro. Capriche nas respostas.',
  ctaBody: 'Escolha a sua turma e preencha a aplicação. As vagas são limitadas — uma turma por semana, e quando fechar, fechou.',
  psLine: 'Você não paga imposto porque é obrigado a ser honesto. Você paga porque ainda não conhecia uma saída inteligente.',
  formName: 'Nome completo',
  formWhats: 'WhatsApp',
  formEmail: 'E-mail',
  formTurma: 'Turma desejada',
  formRevenue: 'Faturamento mensal',
  formSubmit: 'Garantir minha vaga',
  revenueOptions: [{ label: 'Até R$ 50 mil/mês' }, { label: 'R$ 50 mil – R$ 150 mil/mês' }, { label: 'R$ 150 mil – R$ 500 mil/mês' }, { label: 'Acima de R$ 500 mil/mês' }],
  sentTitle: 'Aplicação recebida.',
  sentBody: 'Vamos confirmar a disponibilidade da sua turma e entrar em contato pelo WhatsApp com os próximos passos. Fique de olho no seu celular.',
  footerTagline: 'O selo de quem já fez o caminho — e tem os carimbos para provar.',
  footerContactLabel: 'CONTATO',
  footerDisclaimer: 'Código Internacional conduz a conquista de residência fiscal no Paraguai por meio dos órgãos oficiais do governo. Resultados variam conforme o perfil e a operação de cada cliente. Esta página não constitui aconselhamento jurídico, contábil ou tributário.',
  footerRights: '© 2026 Código Internacional',
};

export const EN: Copy = {
  navCta: 'I want my spot',
  heroEyebrow: 'O CÓDIGO INTERNACIONAL',
  heroH1a: 'How to join the group of Brazilian entrepreneurs zeroing their taxes',
  heroH1b: 'in 7 days in Paraguay.',
  heroSub: 'In 7 days in Paraguay, you walk out with tax residency in your pocket.',
  heroItalic: 'All done through the official government bodies.',
  heroTriggerCta: 'Start the selection process',
  heroLockHint: 'Watch the video to unlock the content',
  urgencyPrefix: 'Next cohort',
  urgencyDate: 'Jul 12',
  urgencyMid: 'enrollment closes in',
  urgencyShort: 'Cohort Jul 12 closes in',
  vslLabel: 'VSL · 3 MINUTES',
  heroWatch: 'Watch the video',
  gateTitle: 'Watch this before anything else.',
  gateHint: 'Watching unlocks the rest of the page.',
  vslSimNote: 'Embed your VSL here — /public/vsl.webm',
  vslLockMsg: 'Content unlocks in',
  vslReopenLabel: 'Replay video',
  heroTrust: [{ label: '100% legal' }, { label: 'Official government bodies' }, { label: 'Residency filed' }],
  mech1: 'As long as your CPF is a Brazilian tax resident, it works like a tracker on your money.',
  mech2a: 'Get residency in Paraguay legally, and the tracker switches off.',
  mech2b: 'You close the month and the money is yours.',
  mech3: 'The wealth Brazil taxed every year — no one touches it.',
  daysTitle: 'From the airport to the document.',
  daysIntro: 'What happens on each of the seven days — from landing on Sunday to flying home to Brazil on Saturday.',
  days: [
    { n: '01', label: 'Day 01', day: 'Sunday', title: 'You arrive.', tasks: [{ label: 'Hotel check-in' }, { label: 'Welcome dinner with the group' }, { label: 'Everyone introduces themselves — the week begins' }] },
    { n: '02', label: 'Day 02', day: 'Monday', title: 'The process begins.', tasks: [{ label: "You're guided to the right place" }, { label: 'The right line, at the right time' }, { label: 'Requesting the right document' }] },
    { n: '03', label: 'Day 03', day: 'Tuesday', title: 'Border prices.', tasks: [{ label: 'Shopping tour' }, { label: 'Electronics and imports at border prices' }, { label: 'Evening free' }] },
    { n: '04', label: 'Day 04', day: 'Wednesday', title: 'Real networking.', tasks: [{ label: 'Churrasco with the group' }, { label: 'Hot-seat round' }, { label: 'Your business presented — connections, partnerships and solutions emerge' }] },
    { n: '05', label: 'Day 05', day: 'Thursday', title: 'Free time.', tasks: [{ label: 'Deepen the conversations' }, { label: 'Explore the city' }, { label: 'Recharge for the home stretch' }] },
    { n: '06', label: 'Day 06', day: 'Friday', title: 'Residency is ready.', tasks: [{ label: 'Residency filed' }, { label: 'Stop at Interpol' }, { label: "Department of Migration — it's done" }] },
    { n: '07', label: 'Day 07', day: 'Saturday', title: 'You fly home.', tasks: [{ label: 'Residency in your pocket' }, { label: 'Contacts that can change your year' }, { label: 'Back home' }] },
  ],
  inclLabel: "WHAT'S INCLUDED",
  inclTitle: 'All handled. You just board.',
  included: [
    { mark: '❖', name: 'Lodging included', desc: 'All seven hotel nights are part of the investment.' },
    { mark: '✦', name: 'Local transport', desc: 'Getting between hotel, offices and appointments — handled.' },
    { mark: '◆', name: 'Guidance at every office', desc: 'The right line, at the right time, requesting the right document — guided.' },
    { mark: '✜', name: 'Dinner & churrasco', desc: 'The table where the group connects and business happens.' },
    { mark: '❉', name: 'Hot-seat round', desc: 'Your business presented to the group: connections, partnerships and solutions.' },
    { mark: '◈', name: 'Tax residency filed', desc: 'You fly back to Brazil with residency in your pocket.' },
  ],
  tableLabel: 'THE TABLE',
  tableTitle: 'The dinner conversation worth more than a year of consulting.',
  tableQuote: 'One contact made at this table can pay for the whole trip.',
  tableBody: "Ten entrepreneurs under one roof for seven days. Each one presents their company, where they're stuck, what they're after. You leave with residency in your pocket and contacts in your phone worth more than the entire process.",
  tableStatV: '+9',
  tableStatL: 'contacts in your phone that can change your year',
  mentorLabel: 'WHO GUIDES YOU',
  mentorName: 'Pedro Silvestrini',
  mentorRole: 'The one who guides you in Paraguay',
  mentorBio: "Pedro has walked — and re-walked dozens of times — the path most people only fear. He personally guides each cohort: to the right place, in the right line, requesting the right document. From Sunday's landing to Friday's filed residency, everything done through the official government bodies.",
  mentorQuote: '"I don\'t sell promises. I walk you down the path I\'ve already walked."',
  mentorCreds: [{ label: 'Personally guided' }, { label: 'Official bodies' }, { label: 'Small cohorts' }],
  priceLabel: 'THE INVESTMENT',
  priceCrossed: 'R$ 162,000 a year…',
  priceMain: 'or R$ 25,000 once.',
  priceMath: "If you bill R$ 50k a month and hand 27% to the government, that's R$ 162,000 a year. Código Internacional costs R$ 25,000 — with lodging, transport and guidance included.",
  priceInstLabel: 'UP TO 12×',
  priceInst: 'R$ 2,083',
  priceInclLabel: 'INCLUDED',
  priceInclVal: 'Hotel + transport',
  turmasLabel: 'COHORTS · ONE PER WEEK',
  turmas: [
    { n: 'Cohort 1', range: 'Jul 12 – 19' },
    { n: 'Cohort 2', range: 'Jul 19 – 26' },
    { n: 'Cohort 3', range: 'Jul 26 – Aug 02' },
    { n: 'Cohort 4', range: 'Aug 02 – 09' },
    { n: 'Cohort 5', range: 'Aug 09 – 16' },
  ],
  scarcity: "Five cohorts. One per week. When it's full, it's full.",
  priceCta: 'I want my spot in Código Internacional',
  faqLabel: 'QUESTIONS',
  faqTitle: 'Before you claim your spot.',
  faqs: [
    { q: 'Is this legal?', a: 'Yes. The entire process is done through the official Paraguayan government bodies. Tax residency is obtained within the law, from landing to filing — no shortcuts or schemes.' },
    { q: "What's included in the R$ 25,000?", a: 'Lodging, local transport and guidance through every office across the seven days, plus the welcome dinner and the churrasco with the hot-seat round. You only arrange your own flight.' },
    { q: 'Do I need to live in Paraguay?', a: "No. You obtain tax residency during the seven days on the ground. Maintenance is simple and you're guided on how to operate from there." },
    { q: 'How many people per cohort?', a: "Small groups — around ten entrepreneurs per week. Five cohorts total, one per week. When it's full, it's full." },
    { q: 'Can I pay in installments?', a: 'Yes. The R$ 25,000 investment can be split into up to 12× of R$ 2,083.' },
    { q: 'How do I claim my spot?', a: "You fill out the application and pick your cohort. Once your spot is confirmed, we send the next steps and the preparation before you fly." },
  ],
  ctaLabel: 'YOUR SPOT',
  ctaTitle: 'I want my spot in Código Internacional.',
  ctaBody: "Pick your cohort and fill out the application. Spots are limited — one cohort per week, and when it's full, it's full.",
  appIntro: "Just 10 entrepreneurs per cohort, 5 cohorts, one per week. After that, the program closes with a group of 50 Brazilian entrepreneurs paying zero tax — with a networking and connection experience worth your time.",
  appIntro2: 'Every application is read personally by Pedro. Put care into your answers.',
  psLine: "You don't pay tax because you're forced to be honest. You pay because you didn't yet know a smart way out.",
  formName: 'Full name',
  formWhats: 'WhatsApp',
  formEmail: 'Email',
  formTurma: 'Preferred cohort',
  formRevenue: 'Monthly revenue',
  formSubmit: 'Claim my spot',
  revenueOptions: [{ label: 'Up to R$ 50k/mo' }, { label: 'R$ 50k – R$ 150k/mo' }, { label: 'R$ 150k – R$ 500k/mo' }, { label: 'Above R$ 500k/mo' }],
  sentTitle: 'Application received.',
  sentBody: "We'll confirm your cohort's availability and reach out on WhatsApp with the next steps. Keep an eye on your phone.",
  footerTagline: 'The seal of someone who has walked the path — with the stamps to prove it.',
  footerContactLabel: 'CONTACT',
  footerDisclaimer: 'Código Internacional guides the obtaining of tax residency in Paraguay through the official government bodies. Results vary by each client\'s profile and operation. This page does not constitute legal, accounting or tax advice.',
  footerRights: '© 2026 Código Internacional',
};
