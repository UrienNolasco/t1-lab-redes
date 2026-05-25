/**
 * Responsabilidade: Comparar o desempenho de consultas DNS via UDP (sem criptografia)
 * e via DoT — DNS over TLS (com criptografia).
 */

import { ClienteDotDns, SERVIDORES_DOT } from '../dns/dot-client.js';
import { BenchmarkDesempenho } from '../analysis/performance.js';
import { RecordType } from '../dns/types.js';

/**
 * Executa a comparação de desempenho UDP vs DoT para cada servidor da lista.
 * @param dominio  - Domínio usado nas consultas (ex: "www.example.com")
 * @param amostras - Número de consultas por protocolo por servidor (padrão: 10)
 */
export async function executarComparacaoDot(
  dominio: string,
  amostras: number = 10,
): Promise<void> {
  console.log(`\nComparação UDP vs DoT`);
  console.log(`Domínio: ${dominio} | Amostras por protocolo: ${amostras}\n`);
  console.log(
    'Servidor'.padEnd(22) +
    'Protocolo'.padEnd(12) +
    'Média(ms)'.padEnd(12) +
    'Mín(ms)'.padEnd(10) +
    'Máx(ms)'.padEnd(10) +
    'Perda%',
  );
  console.log('-'.repeat(70));

  for (const srv of SERVIDORES_DOT) {
    // --- Benchmark UDP ---
    const estatUdp = await BenchmarkDesempenho.executar(srv.nome, srv.ip, dominio, amostras, 3000);

    // --- Benchmark DoT ---
    const clienteDot = new ClienteDotDns(srv, 5000);
    const rttsDoT: number[] = [];
    for (let i = 0; i < amostras; i++) {
      const resultado = await clienteDot.consultar(dominio, RecordType.A);
      rttsDoT.push(resultado.error ? 0 : resultado.rttMs);
    }
    const estatDot = BenchmarkDesempenho.calcularEstatisticas(rttsDoT);

    // Overhead = diferença entre o tempo médio do DoT e do UDP
    const overhead = estatDot.mediaMseg - estatUdp.mediaMseg;
    const sinalOverhead = overhead >= 0 ? '+' : '';

    // Exibe linha UDP
    console.log(
      srv.nome.padEnd(22) +
      'UDP'.padEnd(12) +
      estatUdp.mediaMseg.toFixed(1).padEnd(12) +
      (estatUdp.minimoMseg === Infinity ? 'N/A' : estatUdp.minimoMseg.toFixed(0)).padEnd(10) +
      (estatUdp.maximoMseg === 0 ? 'N/A' : estatUdp.maximoMseg.toFixed(0)).padEnd(10) +
      `${(estatUdp.taxaPerda * 100).toFixed(0)}%`,
    );

    // Exibe linha DoT
    console.log(
      ''.padEnd(22) +
      'DoT (TLS)'.padEnd(12) +
      estatDot.mediaMseg.toFixed(1).padEnd(12) +
      (estatDot.minimoMseg === Infinity ? 'N/A' : estatDot.minimoMseg.toFixed(0)).padEnd(10) +
      (estatDot.maximoMseg === 0 ? 'N/A' : estatDot.maximoMseg.toFixed(0)).padEnd(10) +
      `${(estatDot.taxaPerda * 100).toFixed(0)}%`,
    );

    // Exibe linha de overhead
    console.log(
      ''.padEnd(22) +
      `\x1b[33mOverhead TLS: ${sinalOverhead}${overhead.toFixed(1)} ms em média\x1b[0m`,
    );
    console.log('');
  }
}

/**
 * Executa uma única consulta DoT em todos os servidores suportados e exibe
 * o resultado: IP retornado e tempo de resposta.
 * Útil para verificar rapidamente se o DoT está funcionando.
 *
 * @param dominio - Nome do domínio a consultar
 */
export async function consultaSimplesDot(dominio: string): Promise<void> {
  console.log(`\nConsulta DoT — domínio: ${dominio}\n`);
  console.log('Servidor'.padEnd(22) + 'IP Retornado'.padEnd(32) + 'RTT(ms)');
  console.log('-'.repeat(60));

  for (const srv of SERVIDORES_DOT) {
    const cliente   = new ClienteDotDns(srv, 5000);
    const resultado = await cliente.consultar(dominio, RecordType.A);
    const ips       = resultado.response?.answers
      .filter(a => a.type === RecordType.A)
      .map(a => a.data)
      .join(', ') ?? '-';
    const saida = resultado.error ?? ips;
    const rtt   = resultado.error ? '-' : `${resultado.rttMs}`;
    console.log(srv.nome.padEnd(22) + saida.padEnd(32) + rtt);
  }
}
