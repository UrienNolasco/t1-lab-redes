/**
 * Responsabilidade: Executar o benchmark de desempenho de todos os servidores DNS
 */

import {
  BenchmarkDesempenho,
  type EstatisticasServidor,
} from "../analysis/performance.js";
import { SERVIDORES_DNS } from "../config/servers.js";
import { DOMINIO_BENCHMARK } from "../config/domains.js";

/**
 * Executa N consultas para cada servidor DNS cadastrado e exibe um ranking
 * de desempenho ordenado do mais rápido ao mais lento.
 *
 * @param dominio  - Domínio usado nas consultas de benchmark (padrão: www.example.com)
 * @param amostras - Número de consultas por servidor (padrão: 10)
 * @returns Lista de estatísticas ordenada por desempenho (para exportação CSV)
 */
export async function executarBenchmark(
  dominio: string = DOMINIO_BENCHMARK,
  amostras: number = 10,
): Promise<EstatisticasServidor[]> {
  console.log(
    `\nBenchmark: ${amostras} consultas para "${dominio}" por servidor\n`,
  );
  console.log("Executando consultas em paralelo...\n");

  const todasEstatisticas: EstatisticasServidor[] = [];

  await Promise.all(
    SERVIDORES_DNS.map(async (srv) => {
      const stats = await BenchmarkDesempenho.executar(
        srv.nome,
        srv.ip,
        dominio,
        amostras,
      );
      todasEstatisticas.push(stats);
      process.stdout.write(`  ✓ ${srv.nome} concluído\n`);
    }),
  );

  todasEstatisticas.sort((a, b) => a.mediaMseg - b.mediaMseg);

  console.log("\n--- Ranking de Desempenho ---\n");
  console.log(
    "#".padEnd(4) +
      "Servidor".padEnd(26) +
      "IP".padEnd(18) +
      "Média(ms)".padEnd(12) +
      "Mín(ms)".padEnd(10) +
      "Máx(ms)".padEnd(10) +
      "Perda%",
  );
  console.log("-".repeat(84));

  todasEstatisticas.forEach((s, i) => {
    const perda =
      s.taxaPerda === 1 ? "N/A" : `${(s.taxaPerda * 100).toFixed(0)}%`;
    const media = s.taxaPerda === 1 ? "N/A" : s.mediaMseg.toFixed(1);
    const minimo = s.minimoMseg === Infinity ? "N/A" : s.minimoMseg.toFixed(0);
    const maximo = s.maximoMseg === 0 ? "N/A" : s.maximoMseg.toFixed(0);
    console.log(
      `${i + 1}`.padEnd(4) +
        s.servidor.padEnd(26) +
        s.ip.padEnd(18) +
        media.padEnd(12) +
        minimo.padEnd(10) +
        maximo.padEnd(10) +
        perda,
    );
  });

  return todasEstatisticas;
}
