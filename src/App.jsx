import React from 'react';
import { ArrowRight, Cpu, Layers, Workflow } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-[#F5F4F0] text-[#1A1A1A] font-sans antialiased selection:bg-[#A31621] selection:text-[#F5F4F0]">

      {/* Navegação */}
      <nav className="flex items-center justify-between px-6 md:px-8 py-6 max-w-7xl mx-auto border-b border-[#A31621]/10">
        <div className="flex items-center gap-3">
          <svg width="40" height="24" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 3.5L18 12L2 20.5V3.5Z" stroke="#A31621" strokeWidth="3" strokeLinejoin="round"/>
            <path d="M38 3.5L22 12L38 20.5V3.5Z" stroke="#A31621" strokeWidth="3" strokeLinejoin="round"/>
          </svg>
          <div className="flex flex-col tracking-wider font-bold text-[#A31621] leading-tight">
            <span className="text-xl md:text-2xl">GROWTH</span>
            <span className="text-xl md:text-2xl">CLUBE</span>
          </div>
        </div>
        <div className="hidden md:flex gap-8 text-sm font-semibold tracking-wide text-[#A31621]/80">
          <a href="#metodologia" className="hover:text-[#A31621] transition-colors">METODOLOGIA</a>
          <a href="#sistemas" className="hover:text-[#A31621] transition-colors">SISTEMAS</a>
          <a href="#contato" className="hover:text-[#A31621] transition-colors">CONTATO</a>
        </div>
        <button className="hidden sm:block bg-[#A31621] text-[#F5F4F0] px-6 py-2.5 font-bold tracking-wide hover:bg-[#8B121C] transition-all duration-300">
          SOLICITAR AUDITORIA
        </button>
      </nav>

      {/* Seção Hero */}
      <main className="max-w-7xl mx-auto px-6 md:px-8 pt-16 md:pt-24 pb-24 md:pb-32 grid lg:grid-cols-2 gap-12 md:gap-16 items-center">
        <div className="space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#A31621]/10 border border-[#A31621]/20 text-[#A31621] text-xs font-bold tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-[#A31621] animate-pulse"></span>
            Feito para Negócios Físicos
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-[#A31621] leading-[1.05] tracking-tight">
            Funis Automatizados.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A31621] to-[#D42A38]">Lucros Previsíveis.</span>
          </h1>
          <p className="text-lg md:text-xl text-[#333333] leading-relaxed max-w-lg font-medium">
            Nós projetamos fluxos de trabalho sofisticados com IA, funis de vendas de alta conversão e copy persuasiva para transformar o seu negócio físico em uma máquina de receita escalável e automatizada.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button className="group flex items-center justify-center gap-2 bg-[#A31621] text-[#F5F4F0] px-8 py-4 font-bold tracking-wide text-lg hover:bg-[#8B121C] transition-all duration-300">
              Escale Suas Operações
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <a href="#sistemas" className="flex items-center justify-center gap-2 border-2 border-[#A31621] text-[#A31621] px-8 py-4 font-bold tracking-wide text-lg hover:bg-[#A31621]/5 transition-colors">
              Ver Nossos Sistemas
            </a>
          </div>
        </div>

        {/* Elemento Visual Hero (Dashboard ao Vivo) */}
        <div className="relative w-full max-w-md mx-auto lg:max-w-none">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#A31621]/5 to-transparent z-0 transform translate-x-4 translate-y-4"></div>
          <div className="relative z-10 border border-[#A31621]/20 bg-[#F5F4F0] p-6 md:p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-8 border-b border-[#A31621]/10 pb-4">
              <span className="text-[#A31621] font-bold tracking-wider text-sm">DASHBOARD AO VIVO</span>
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-[#A31621] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#A31621]"></span>
              </span>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Taxa de Captura de Leads', value: '+42%', metric: 'vs mês anterior' },
                { label: 'Follow-ups Automatizados', value: '1.284', metric: 'fluxos ativos' },
                { label: 'Conversões de Tripwire', value: '28%', metric: 'otimizado por IA' },
              ].map((stat, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white/50 border border-[#A31621]/10 hover:border-[#A31621]/30 transition-colors group cursor-default">
                  <span className="text-[#555555] font-semibold group-hover:text-[#1A1A1A] transition-colors">{stat.label}</span>
                  <div className="text-right">
                    <span className="block text-xl md:text-2xl font-bold text-[#A31621]">{stat.value}</span>
                    <span className="text-xs text-[#777777] uppercase tracking-wider">{stat.metric}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t border-[#A31621]/10 flex items-center justify-between">
              <span className="text-xs font-bold text-[#A31621]/60 uppercase tracking-widest">Status do Sistema</span>
              <span className="text-xs font-bold text-[#10B981] uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full"></span> Ativo
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Seção de Recursos/Metodologia */}
      <section id="metodologia" className="bg-[#EBE8DF] border-y border-[#A31621]/10 py-24">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-[#A31621] tracking-tight mb-4">A Tríade da Escala</h2>
            <p className="text-lg text-[#555555] max-w-2xl mx-auto font-medium">
              Nossa combinação única de engenharia nível CTO, copywriting estratégico e design de growth implementados diretamente em negócios físicos.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[#F5F4F0] p-8 border border-[#A31621]/10 hover:shadow-xl hover:border-[#A31621]/30 hover:-translate-y-1 transition-all duration-300">
              <Workflow className="w-10 h-10 text-[#A31621] mb-6" />
              <h3 className="text-xl font-bold text-[#A31621] mb-3 uppercase tracking-wide">Arquitetura de Funis</h3>
              <p className="text-[#555555] leading-relaxed">
                Caminhos estratégicos desenhados para capturar clientes na sua loja e leads digitais, convertendo-os através de ofertas tripwire de alta margem e ofertas principais automatizadas.
              </p>
            </div>
            <div className="bg-[#F5F4F0] p-8 border border-[#A31621]/10 hover:shadow-xl hover:border-[#A31621]/30 hover:-translate-y-1 transition-all duration-300">
              <Cpu className="w-10 h-10 text-[#A31621] mb-6" />
              <h3 className="text-xl font-bold text-[#A31621] mb-3 uppercase tracking-wide">IA e Automações</h3>
              <p className="text-[#555555] leading-relaxed">
                Infraestrutura técnica automatizada que gerencia a retenção de clientes, follow-ups instantâneos e roteamento de dados sem intervenção manual.
              </p>
            </div>
            <div className="bg-[#F5F4F0] p-8 border border-[#A31621]/10 hover:shadow-xl hover:border-[#A31621]/30 hover:-translate-y-1 transition-all duration-300">
              <Layers className="w-10 h-10 text-[#A31621] mb-6" />
              <h3 className="text-xl font-bold text-[#A31621] mb-3 uppercase tracking-wide">Motor de Persuasão</h3>
              <p className="text-[#555555] leading-relaxed">
                Copy psicologicamente projetada que fala diretamente com os desejos do seu mercado local, gerando urgência e aumentando o LTV (Lifetime Value) do cliente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Seção Sistemas */}
      <section id="sistemas" className="bg-[#F5F4F0] py-24">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-[#A31621] tracking-tight mb-4">Nossos Sistemas</h2>
            <p className="text-lg text-[#555555] max-w-2xl mx-auto font-medium">
              Ferramentas e integrações que conectam cada ponto da jornada do cliente — do primeiro contato ao pós-venda automatizado.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                tag: '01',
                title: 'CRM Inteligente',
                desc: 'Pipeline de vendas com scoring automático de leads, segmentação comportamental e alertas em tempo real para sua equipe fechar mais negócios.',
              },
              {
                tag: '02',
                title: 'Sequências de E-mail & WhatsApp',
                desc: 'Fluxos multicanal disparados por gatilhos de comportamento — abandono de carrinho, aniversário, inatividade — sem nenhuma ação manual.',
              },
              {
                tag: '03',
                title: 'Páginas de Alta Conversão',
                desc: 'Landing pages e checkouts otimizados com testes A/B contínuos, integrados diretamente ao seu sistema de pagamento e CRM.',
              },
              {
                tag: '04',
                title: 'Relatórios & Analytics',
                desc: 'Dashboard unificado com métricas de CAC, LTV, taxa de recompra e ROI por canal — tudo em tempo real para decisões baseadas em dados.',
              },
            ].map((item) => (
              <div key={item.tag} className="flex gap-6 p-8 border border-[#A31621]/10 bg-white/60 hover:border-[#A31621]/30 hover:shadow-lg transition-all duration-300 group">
                <span className="text-4xl font-extrabold text-[#A31621]/15 group-hover:text-[#A31621]/25 transition-colors leading-none select-none">{item.tag}</span>
                <div>
                  <h3 className="text-lg font-bold text-[#A31621] mb-2 uppercase tracking-wide">{item.title}</h3>
                  <p className="text-[#555555] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seção Footer / CTA */}
      <footer id="contato" className="bg-[#1A1A1A] py-16 px-6 md:px-8 text-[#F5F4F0]">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 border-b border-white/10 pb-16 mb-8">
          <div className="max-w-xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Pronto para escalar sua infraestrutura?</h2>
            <p className="text-[#AAAAAA] text-lg">Pare de depender de processos manuais de vendas. Deixe-nos construir seu motor de crescimento automatizado.</p>
          </div>
          <button className="bg-[#A31621] text-[#F5F4F0] px-10 py-5 font-bold tracking-wide text-lg hover:bg-[#8B121C] transition-all duration-300 w-full lg:w-auto text-center whitespace-nowrap">
            Agendar Consultoria Estratégica
          </button>
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-sm text-[#777777] gap-6">
          <div className="flex items-center gap-3">
            <svg width="24" height="14" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 3.5L18 12L2 20.5V3.5Z" stroke="#F5F4F0" strokeWidth="3" strokeLinejoin="round"/>
              <path d="M38 3.5L22 12L38 20.5V3.5Z" stroke="#F5F4F0" strokeWidth="3" strokeLinejoin="round"/>
            </svg>
            <span className="font-bold text-[#F5F4F0] tracking-wider text-base">GROWTH CLUBE</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 items-center">
            <a href="mailto:growth@clubemkt.digital" className="hover:text-[#F5F4F0] transition-colors">growth@clubemkt.digital</a>
            <a href="https://growth.clubemkt.digital" className="hover:text-[#F5F4F0] transition-colors">growth.clubemkt.digital</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
