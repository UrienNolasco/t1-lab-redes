/**
 * Lista de todos os servidores DNS a serem testados.
 */

export type CategoriaServidor = 'sem-filtro' | 'filtro-seguranca' | 'filtro-familiar';

export interface ServidorDns {
  /** Nome legível do servidor (usado na exibição dos resultados) */
  nome: string;
  /** Endereço IP para envio das consultas UDP */
  ip: string;
  /** Categoria de filtragem do servidor */
  categoria: CategoriaServidor;
}

export const SERVIDORES_DNS: ServidorDns[] = [
  // --- Sem filtro ---
  { nome: 'Google',              ip: '8.8.8.8',         categoria: 'sem-filtro' },
  { nome: 'Google Secundário',   ip: '8.8.4.4',         categoria: 'sem-filtro' },
  { nome: 'Cloudflare',          ip: '1.1.1.1',         categoria: 'sem-filtro' },
  { nome: 'Cloudflare Secund.',  ip: '1.0.0.1',         categoria: 'sem-filtro' },
  { nome: 'Quad9 Sem Filtro',    ip: '9.9.9.10',        categoria: 'sem-filtro' },
  { nome: 'Verisign',            ip: '64.6.64.6',       categoria: 'sem-filtro' },
  // Adicionais sem filtro
  { nome: 'Control D',           ip: '76.76.2.0',       categoria: 'sem-filtro' },
  { nome: 'Comodo Secure',       ip: '8.26.56.26',      categoria: 'sem-filtro' },
  { nome: 'Level3',              ip: '4.2.2.2',         categoria: 'sem-filtro' },
  { nome: 'OpenNIC',             ip: '94.247.43.254',   categoria: 'sem-filtro' },

  // --- Filtro de segurança (bloqueia malware e phishing) ---
  { nome: 'Quad9',               ip: '9.9.9.9',         categoria: 'filtro-seguranca' },
  { nome: 'OpenDNS',             ip: '208.67.222.222',  categoria: 'filtro-seguranca' },
  { nome: 'CleanBrowsing Seg.',  ip: '185.228.168.9',   categoria: 'filtro-seguranca' },
  { nome: 'AdGuard',             ip: '94.140.14.14',    categoria: 'filtro-seguranca' },

  // --- Filtro familiar (bloqueia adulto + segurança) ---
  { nome: 'Cloudflare Family',   ip: '1.1.1.3',         categoria: 'filtro-familiar' },
  { nome: 'OpenDNS Family',      ip: '208.67.222.123',  categoria: 'filtro-familiar' },
  { nome: 'CleanBrowsing Fam.',  ip: '185.228.168.168', categoria: 'filtro-familiar' },
  { nome: 'AdGuard Family',      ip: '94.140.14.15',    categoria: 'filtro-familiar' },
];
