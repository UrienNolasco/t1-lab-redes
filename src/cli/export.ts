/**
 * Responsabilidade: Exportar os resultados das análises DNS para arquivos CSV.
 */

import * as fs from "fs";
import type { QueryResult } from "../dns/types.js";
import type { EstatisticasServidor } from "../analysis/performance.js";
import { DetectorBloqueio } from "../analysis/block-detector.js";
import { RecordType } from "../dns/types.js";

/**
 * Exporta os resultados de uma varredura multi-servidor para um arquivo CSV.
 * Cada linha representa a resposta de um servidor para o domínio consultado,
 * incluindo status de bloqueio, IPs retornados, RTT e possíveis erros.
 *
 * @param dominio   - Domínio que foi consultado
 * @param resultados - Lista de resultados retornada pelo scanner
 * @param caminho   - Caminho do arquivo CSV a criar (ex: "scan-polymarket.csv")
 */
export function exportarResultadosScan(
  dominio: string,
  resultados: QueryResult[],
  caminho: string,
): void {
  const ipConsenso = DetectorBloqueio.calcularIpConsenso(resultados);
  const linhas = [
    "servidor,ip,dominio,status,rcode,ips_retornados,rtt_ms,erro",
  ];

  for (const r of resultados) {
    const status = DetectorBloqueio.classificar(r, ipConsenso);
    const rcode = r.response?.rcode ?? "";
    const ips =
      r.response?.answers
        .filter((a) => a.type === RecordType.A)
        .map((a) => a.data)
        .join("|") ?? "";
    const rtt = r.error ? "" : r.rttMs;
    linhas.push(
      `"${r.server}","${r.serverIp}","${dominio}","${status}","${rcode}","${ips}","${rtt}","${r.error ?? ""}"`,
    );
  }

  fs.writeFileSync(caminho, linhas.join("\n"), "utf-8");
  console.log(`CSV salvo: ${caminho}`);
}

/**
 * Exporta o ranking de desempenho do benchmark para um arquivo CSV.
 * Cada linha representa as estatísticas de um servidor: média, mínimo, máximo e taxa de perda.
 *
 * @param estatisticas - Lista de estatísticas retornada pelo benchmark
 * @param caminho      - Caminho do arquivo CSV a criar (ex: "benchmark.csv")
 */
export function exportarBenchmark(
  estatisticas: EstatisticasServidor[],
  caminho: string,
): void {
  const linhas = [
    "servidor,ip,media_ms,minimo_ms,maximo_ms,taxa_perda,amostras",
  ];
  for (const s of estatisticas) {
    linhas.push(
      `"${s.servidor}","${s.ip}","${s.mediaMseg.toFixed(2)}","${s.minimoMseg}","${s.maximoMseg}","${s.taxaPerda.toFixed(4)}","${s.amostras}"`,
    );
  }
  fs.writeFileSync(caminho, linhas.join("\n"), "utf-8");
  console.log(`CSV salvo: ${caminho}`);
}
