export type InstitutionalSection = {
  title: string
  paragraphs?: string[]
  items?: string[]
  links?: Array<{ label: string; href: string }>
}

export type InstitutionalPageContent = {
  path: string
  eyebrow: string
  title: string
  intro: string
  updatedAt: string
  sections: InstitutionalSection[]
  notice?: string
}

export const LEGAL_ENTITY = {
  corporateName: '69.725.785 ANNA CAROLINA SANTOS NASCIMENTO',
  taxId: '69.725.785/0001-66',
  registrationStatus: 'ATIVA',
  city: 'Itumbiara',
  publicAddress: 'Rua 20, nº 552, Bairro Paranaíba, Itumbiara/GO, CEP 75526-270',
  electronicContact: 'https://wa.me/556493026564',
} as const

export const PUBLIC_FOOTER_IDENTITY = {
  brand: 'BELLMONT',
  taxId: `CNPJ: ${LEGAL_ENTITY.taxId}`,
} as const

export const institutionalPages = {
  privacy: {
    path: '/privacidade', eyebrow: 'BELLMONT / TRANSPARÊNCIA', title: 'POLÍTICA DE PRIVACIDADE', updatedAt: '22 de outubro de 2026',
    intro: 'Esta política explica como os dados pessoais podem ser tratados durante a navegação no site e no atendimento comercial da BELLMONT.',
    sections: [
      { title: '1. Quem é o responsável', paragraphs: [`O responsável pelo tratamento é ${LEGAL_ENTITY.corporateName}, CNPJ ${LEGAL_ENTITY.taxId}, com endereço público informado em ${LEGAL_ENTITY.publicAddress}. BELLMONT e IMPÉRIO FIT são as identificações comerciais usadas neste site; não se declara registro de nome fantasia ou vínculo societário distinto sem documentação específica.`] },
      { title: '2. Dados tratados neste site', items: ['A sacola guarda, no próprio navegador, os identificadores dos produtos e variantes e as quantidades selecionadas.', 'Os favoritos guardam, no próprio navegador, os identificadores dos produtos escolhidos.', 'Ao carregar o catálogo público, o navegador pode realizar comunicações técnicas com a infraestrutura do site e com o Supabase, incluindo dados de conexão necessários à entrega e à segurança do serviço.', 'O site não solicita pagamento online e, na auditoria atual do código, não foram identificados cookies publicitários, ferramentas de analytics ou rastreadores de marketing.'] },
      { title: '3. Atendimento por serviços externos', paragraphs: ['Ao escolher atendimento, o site abre WhatsApp ou Instagram. O envio de mensagem é uma ação voluntária do usuário e passa a observar também as políticas do serviço externo. A BELLMONT recebe apenas as informações que o usuário decidir compartilhar no atendimento.'] },
      { title: '4. Finalidades e bases legais', paragraphs: ['Os dados podem ser tratados para viabilizar funcionalidades solicitadas, atender contatos, adotar procedimentos preliminares de uma possível compra, cumprir obrigações legais e proteger direitos e a segurança da operação. A base aplicável depende do fluxo efetivamente realizado; consentimento não é apresentado como fundamento universal.'] },
      { title: '5. Armazenamento, segurança e retenção', paragraphs: ['Sacola e favoritos permanecem no armazenamento local do navegador até serem alterados, apagados pelo usuário ou removidos nas configurações do dispositivo. Informações fornecidas no atendimento podem ser conservadas pelo período necessário às finalidades informadas e às obrigações legais aplicáveis. Não é estabelecido nesta política um prazo operacional que ainda não tenha sido validado.'] },
      { title: '6. Direitos do titular', paragraphs: ['Nos termos da LGPD, o titular pode solicitar, conforme aplicável, confirmação e acesso, correção, informações sobre o tratamento e o compartilhamento, anonimização, bloqueio ou eliminação de dados tratados em desconformidade, portabilidade, oposição, revogação do consentimento e revisão de decisões automatizadas. A eliminação não é irrestrita: dados podem ser conservados quando houver obrigação legal ou outra hipótese legítima. O exercício desses direitos é gratuito.'] },
      { title: '7. Como fazer uma solicitação', paragraphs: ['O titular pode iniciar pelo WhatsApp BELLMONT uma solicitação de acesso, correção, exclusão quando cabível, informações sobre o tratamento, oposição ou revogação do consentimento quando essa for a base utilizada. Descreva o pedido sem enviar documentos sensíveis de forma espontânea. Se for necessário confirmar a identidade do solicitante para proteger os dados, a equipe orientará o procedimento adequado.'], links: [{ label: 'Iniciar solicitação de privacidade pelo WhatsApp', href: 'https://wa.me/556493026564' }] },
      { title: '8. Atualizações', paragraphs: ['Esta política poderá ser atualizada para refletir mudanças legais, técnicas ou comerciais, com indicação da data da versão.'] },
    ],
  },
  terms: {
    path: '/termos', eyebrow: 'BELLMONT / INSTITUCIONAL', title: 'TERMOS DE USO', updatedAt: '22 de outubro de 2026',
    intro: 'Estes termos descrevem o uso do catálogo, da sacola e dos canais de atendimento da BELLMONT + IMPÉRIO FIT.',
    sections: [
      { title: '1. Identificação do fornecedor', paragraphs: [`A identificação legal confirmada do fornecedor é ${LEGAL_ENTITY.corporateName}, CNPJ ${LEGAL_ENTITY.taxId}, endereço ${LEGAL_ENTITY.publicAddress}. O proprietário informou que esse CNPJ é utilizado nas vendas da BELLMONT e da IMPÉRIO FIT. Essa informação comercial não declara registro de nome fantasia ou uma relação societária distinta. Os canais eletrônicos de atendimento permanecem separados por marca. O endereço informado identifica o fornecedor e não é anunciado como loja aberta ao público, ponto de retirada ou endereço de devolução.`], links: [{ label: 'Falar com a BELLMONT', href: LEGAL_ENTITY.electronicContact }, { label: 'Falar com a IMPÉRIO FIT', href: 'https://wa.me/556492659825' }] },
      { title: '2. Finalidade do site', paragraphs: ['O site apresenta produtos de Streetwear, Perfumaria e Fitness. As informações exibidas devem ser confirmadas no atendimento quando estiverem indicadas como indisponíveis, não confirmadas ou sob consulta.'] },
      { title: '3. Modalidades comerciais', paragraphs: ['Produtos Streetwear permitem seleção de variantes válidas e inclusão na sacola para compra assistida. Perfumes podem ser incluídos na sacola BELLMONT para consulta, inclusive quando o valor estiver sob consulta. Produtos IMPÉRIO FIT permanecem fora dessa sacola e são atendidos diretamente pelo WhatsApp próprio.'] },
      { title: '4. Sacola e WhatsApp', paragraphs: ['A sacola BELLMONT reúne Streetwear e perfumes e monta uma única mensagem para o WhatsApp BELLMONT. O subtotal considera somente itens com preço conhecido e não representa necessariamente o total final. A IMPÉRIO FIT possui atendimento comercial separado pelo WhatsApp +55 64 9265-9825. Abrir o WhatsApp não envia automaticamente a mensagem e não representa pedido confirmado, pagamento, reserva de produto ou baixa de estoque.'] },
      { title: '5. Compra e disponibilidade', paragraphs: ['O site atualmente não processa pagamentos online, não cria pedidos automaticamente e não realiza reserva automática de estoque. Disponibilidade, preço aplicável, frete, prazo, forma de pagamento e demais condições são confirmados no atendimento antes da conclusão da compra. Produtos sem preço confirmado são apresentados como valor sob consulta.'] },
      { title: '6. Responsabilidades', paragraphs: ['O usuário deve conferir os itens, variantes, quantidades e dados informados no atendimento. A BELLMONT deve apresentar informações claras e observar os direitos do consumidor. Indisponibilidades técnicas podem interromper temporariamente o catálogo ou os links externos.'] },
      { title: '7. Propriedade intelectual', paragraphs: ['A identidade visual, os textos e os elementos próprios do site são protegidos pela legislação aplicável. Marcas, imagens e conteúdos de terceiros pertencem aos respectivos titulares. O uso do site não transfere direitos de propriedade intelectual.'] },
      { title: '8. Atualizações e contato', paragraphs: ['Estes termos podem ser atualizados para refletir mudanças da operação ou da legislação. Dúvidas comerciais devem ser encaminhadas pelos canais exibidos na página de contato, respeitando a loja responsável por cada produto.'] },
    ],
  },
  returns: {
    path: '/trocas-e-devolucoes', eyebrow: 'BELLMONT / PÓS-VENDA', title: 'TROCAS E DEVOLUÇÕES', updatedAt: '22 de outubro de 2026',
    intro: 'Esta página apresenta os direitos básicos e o procedimento inicial para solicitar troca, devolução ou atendimento por defeito.',
    sections: [
      { title: '1. Direito de arrependimento', paragraphs: ['Nas contratações realizadas fora do estabelecimento comercial, o consumidor pode exercer o direito de arrependimento no prazo legal de 7 dias, contado da assinatura do contrato ou do recebimento do produto, conforme o Código de Defesa do Consumidor.'] },
      { title: '2. Como solicitar', items: ['Para Streetwear e Perfumaria, inicie a solicitação pelo WhatsApp BELLMONT. Para produtos Fitness, utilize o WhatsApp IMPÉRIO FIT. Informe o produto e a situação encontrada.', 'Preserve os comprovantes do atendimento, da compra e do recebimento.', 'A equipe orientará o procedimento aplicável e informará como o produto deverá ser enviado, quando necessário.', 'A solicitação será analisada com respeito aos direitos legais, e o atendimento comunicará os próximos passos.'], links: [{ label: 'Atendimento BELLMONT', href: 'https://wa.me/556493026564' }, { label: 'Atendimento IMPÉRIO FIT', href: 'https://wa.me/556492659825' }] },
      { title: '3. Envio do produto', paragraphs: ['O endereço de devolução e as instruções de envio serão fornecidos pelo atendimento conforme o caso. Não envie produtos ao endereço cadastral do CNPJ sem orientação expressa. Esta política não promete coleta, retirada ou transportadora específica.'] },
      { title: '4. Avaliação do produto', paragraphs: ['O produto poderá ser avaliado para identificação de uso indevido, avaria ou defeito, sem reduzir os direitos previstos em lei. Perfumes e cosméticos serão analisados conforme o caso concreto; esta política não estabelece exclusão genérica de direitos para embalagens abertas.'] },
      { title: '5. Defeitos e garantias', paragraphs: ['Produtos com possível vício ou defeito serão tratados conforme as garantias legais e os prazos aplicáveis. Eventual garantia contratual, quando existir, será complementar à garantia legal.'] },
      { title: '6. Reembolso', paragraphs: ['Quando o reembolso for devido, a forma e o procedimento serão informados no atendimento, observando o meio utilizado na compra e a legislação. Não é prometido prazo operacional específico enquanto esse procedimento não for formalmente confirmado.'] },
    ],
  },
  delivery: {
    path: '/entregas', eyebrow: 'BELLMONT / ATENDIMENTO', title: 'POLÍTICA DE ENTREGA', updatedAt: '22 de outubro de 2026',
    intro: 'Frete, prazo e modalidade de envio são combinados no atendimento, pois o site ainda não possui cálculo automático de entrega.',
    sections: [
      { title: '1. Seleção e atendimento', paragraphs: ['O cliente seleciona os produtos no site. A sacola BELLMONT prepara a solicitação para o WhatsApp; produtos IMPÉRIO FIT seguem para o atendimento próprio. O atendimento confirma a disponibilidade antes da conclusão da compra.'] },
      { title: '2. Endereço, frete e prazo', paragraphs: ['Durante o atendimento, o cliente informa os dados necessários à entrega. O valor do frete, o prazo e a modalidade de envio são apresentados e acordados antes da conclusão da compra. O site não calcula frete automaticamente.'] },
      { title: '3. Regiões e modalidades', paragraphs: ['O site não promete frete fixo ou grátis, entrega nacional, transportadora específica, entrega expressa ou retirada presencial. Essas condições dependem da localização e da opção confirmada individualmente pelo atendimento.'] },
      { title: '4. Acompanhamento', paragraphs: ['O meio de acompanhamento depende da modalidade acordada. Não há promessa de rastreamento automático ou de código de rastreio para todas as entregas. Para informações sobre um envio, o cliente deve procurar o atendimento responsável.'] },
      { title: '5. Atrasos e problemas', paragraphs: ['Em caso de atraso, extravio, avaria ou divergência, entre em contato com a loja responsável pelo pedido. A ocorrência será analisada com base nas informações da compra e do transporte, sem prejuízo dos direitos previstos em lei.'] },
    ],
  },
  about: {
    path: '/sobre', eyebrow: 'BELLMONT / SOBRE', title: 'PRESENÇA EM CADA ESCOLHA.', updatedAt: '22 de outubro de 2026',
    intro: 'A BELLMONT reúne Streetwear e Perfumaria em uma experiência direta, visual e acompanhada de perto pelo atendimento.',
    sections: [
      { title: 'Streetwear', paragraphs: ['Peças com identidade urbana, escolhas objetivas e foco na expressão pessoal. Variantes e disponibilidade são apresentadas no catálogo e confirmadas no atendimento quando necessário.'] },
      { title: 'Perfumaria', paragraphs: ['Uma seleção de fragrâncias apresentada com os dados comerciais já confirmados. Informações ainda pendentes permanecem sob consulta, sem preenchimento artificial.'] },
      { title: 'Uma compra assistida', paragraphs: ['A sacola organiza as escolhas e prepara a conversa com a BELLMONT pelo WhatsApp. O atendimento confirma disponibilidade, entrega e pagamento; o site não realiza cobrança online nem cria reserva automática.'] },
      { title: 'IMPÉRIO FIT', paragraphs: [`A IMPÉRIO FIT possui vitrine e atendimento comercial próprios dentro da experiência do site. O proprietário confirmou que as vendas apresentadas sob a marca utilizam o CNPJ ${LEGAL_ENTITY.taxId}, também utilizado pela BELLMONT. Essa confirmação comercial não equivale à declaração de registro de nome fantasia ou de vínculo societário distinto.`] },
    ],
  },
} as const satisfies Record<string, InstitutionalPageContent>

export const institutionalRoutes = Object.values(institutionalPages).map(page => page.path)

export const institutionalFooterLinks = [
  { label: 'Política de Privacidade', href: institutionalPages.privacy.path },
  { label: 'Termos de Uso', href: institutionalPages.terms.path },
  { label: 'Trocas e Devoluções', href: institutionalPages.returns.path },
  { label: 'Política de Entrega', href: institutionalPages.delivery.path },
  { label: 'Sobre a BELLMONT', href: institutionalPages.about.path },
] as const
