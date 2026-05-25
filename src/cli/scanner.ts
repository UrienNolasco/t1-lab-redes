/**
 * Responsabilidade: Consultar um domínio em todos os servidores DNS configurados
 * e exibir os resultados em uma tabela colorida no terminal.
 * Detecta bloqueios comparando as respostas com o IP consenso.
 * Retorna os resultados brutos para que possam ser exportados em CSV.
 */

import { ClienteUdpDns } from '../dns/client.js';
import { RecordType, RCode, type QueryResult } from '../dns/types.js';
import { DetectorBloqueio, StatusBloqueio } from '../analysis/block-detector.js';
import { SERVIDORES_DNS } from '../config/servers.js';

/** Cores ANSI para cada status de bloqueio no terminal */
const COR_STATUS: Record<StatusBloqueio, string> = {
  [StatusBloqueio.OK]:           '\x1b[32m', // verde
  [StatusBloqueio.NXDOMAIN]:     '\x1b[31m', // vermelho
  [StatusBloqueio.RECUSADO]:     '\x1b[31m', // vermelho
  [StatusBloqueio.ROTA_NULA]:    '\x1b[33m', // amarelo
  [StatusBloqueio.REDIRECIONADO]: '\x1b[33m', // amarelo
  [StatusBloqueio.TIMEOUT]:      '\x1b[90m', // cinza
  [StatusBloqueio.ERRO]:         '\x1b[31m', // vermelho
};
const RESET = '\x1b[0m';

/**
 * Converte o código numérico de resposta (RCODE) para texto legível.
 * Ex: 0 → "NOERROR", 3 → "NXDOMAIN"
 */
function rotuloRcode(codigo: RCode): string {
  return RCode[codigo] ?? `RCODE(${codigo})`;
}

/**
 * Consulta o domínio informado em todos os servidores DNS da lista e exibe
 * uma tabela comparativa no terminal com status de bloqueio, IPs retornados e RTT.
 * Todas as consultas são feitas em paralelo para agilizar a execução.
 *
 * @param dominio - Nome do domínio a ser consultado (ex: "polymarket.com")
 * @returns Lista de resultados brutos de cada servidor (para exportação CSV)
 */
export async function executarScanner(dominio: string): Promise<QueryResult[]> {
  console.log(`\nConsultando domínio: ${dominio}\n`);
  console.log(
    'Servidor'.padEnd(26) +
    'IP'.padEnd(18) +
    'Categoria'.padEnd(22) +
    'Status'.padEnd(22) +
    'IPs Retornados'.padEnd(32) +
    'RTT(ms)',
  );
  console.log('-'.repeat(122));

  const resultados: QueryResult[] = [];

  // Consulta todos os servidores em paralelo
  await Promise.all(
    SERVIDORES_DNS.map(async (srv) => {
      const cliente = new ClienteUdpDns(srv.ip, 53, 3000);
      const resultado = await cliente.consultar(dominio, RecordType.A);
      resultado.server = srv.nome;
      resultados.push(resultado);
    }),
  );

  const ipConsenso = DetectorBloqueio.calcularIpConsenso(resultados);

  // Exibe na ordem da lista de servidores (não na ordem de chegada das respostas)
  for (const srv of SERVIDORES_DNS) {
    const resultado = resultados.find(r => r.serverIp === srv.ip)!;
    const status    = DetectorBloqueio.classificar(resultado, ipConsenso);
    const cor       = COR_STATUS[status];
    const ips       = resultado.response?.answers
      .filter(a => a.type === RecordType.A)
      .map(a => a.data)
      .join(', ') ?? '-';
    const rcode     = resultado.response ? ` (${rotuloRcode(resultado.response.rcode)})` : '';
    const rtt       = resultado.error ? '-' : `${resultado.rttMs}`;
    const statusTexto = `${status}${rcode}`;

    console.log(
      srv.nome.padEnd(26) +
      srv.ip.padEnd(18) +
      srv.categoria.padEnd(22) +
      `${cor}${statusTexto}${RESET}`.padEnd(22 + cor.length + RESET.length) +
      ips.padEnd(32) +
      rtt,
    );
  }

  console.log(`\nIP Consenso: ${ipConsenso || 'nenhum'}`);
  return resultados;
}
