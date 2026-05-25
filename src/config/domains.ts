/**
 * Lista de domínios de teste usados nas análises.
 */

export interface DominioTeste {
  /** Nome do domínio (ex: "www.pucrs.br") */
  dominio: string;
  /** Descrição do propósito do domínio no contexto dos testes */
  descricao: string;
  /** true = domínio de controle que não deve ser bloqueado por nenhum servidor */
  controle: boolean;
}

export const DOMINIOS_TESTE: DominioTeste[] = [
  // Controle
  { dominio: 'www.example.com',     descricao: 'Controle — nenhum servidor deve bloquear',          controle: true  },
  { dominio: 'www.pucrs.br',        descricao: 'Controle regional',                                 controle: true  },
  // Filtros de segurança
  { dominio: 'internetbadguys.com', descricao: 'Teste OpenDNS — bloqueado por filtros de segurança', controle: false },
  // Filtros familiares
  { dominio: 'reddit.com',          descricao: 'Rede social — pode ser bloqueado por filtro familiar', controle: false },
  { dominio: 'tinder.com',          descricao: 'Aplicativo de encontros — bloqueado por filtro familiar', controle: false },
  // Bloqueio judicial no Brasil
  { dominio: 'polymarket.com',      descricao: 'Bloqueado no Brasil por ordem judicial (Anatel)',    controle: false },
  // Adicionais
  { dominio: 'bet365.com',          descricao: 'Apostas — potencialmente bloqueado no Brasil',       controle: false },
  { dominio: 'thepiratebay.org',    descricao: 'Torrents — potencialmente bloqueado',               controle: false },
  { dominio: 'xvideos.com',         descricao: 'Conteúdo adulto — bloqueado por filtro familiar',   controle: false },
];

export const DOMINIO_BENCHMARK = 'www.example.com';
