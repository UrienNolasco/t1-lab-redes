/**
 Medir e calcular estatísticas de desempenho dos servidores DNS.  
 */

import { ClienteUdpDns } from "../dns/client.js";
import { RecordType } from "../dns/types.js";

/** Estatísticas de desempenho de um servidor DNS após N consultas */
export interface EstatisticasServidor {
  /** Nome legível do servidor */
  servidor: string;
  /** Endereço IP do servidor */
  ip: string;
  /** Tempo médio de resposta em milissegundos (apenas consultas bem-sucedidas) */
  mediaMseg: number;
  /** Menor tempo de resposta registrado */
  minimoMseg: number;
  /** Maior tempo de resposta registrado */
  maximoMseg: number;
  /** Proporção de consultas que falharam (0.0 = nenhuma, 1.0 = todas) */
  taxaPerda: number;
  /** Total de consultas realizadas */
  amostras: number;
}

export class BenchmarkDesempenho {
  /**
   * Calcula as estatísticas a partir de um array de tempos de resposta (RTTs).
   * Valores iguais a 0 representam consultas que falharam (timeout ou erro).
   *
   * @param rtts - Array de tempos em ms; 0 indica falha
   */
  static calcularEstatisticas(
    rtts: number[],
  ): Omit<EstatisticasServidor, "servidor" | "ip"> {
    const falhas = rtts.filter((r) => r === 0).length;
    const sucedidas = rtts.filter((r) => r > 0);
    const taxaPerda = falhas / rtts.length;
    const minimoMseg = sucedidas.length ? Math.min(...sucedidas) : Infinity;
    const maximoMseg = sucedidas.length ? Math.max(...sucedidas) : 0;
    const mediaMseg = sucedidas.length
      ? sucedidas.reduce((a, b) => a + b, 0) / sucedidas.length
      : 0;
    return {
      mediaMseg,
      minimoMseg,
      maximoMseg,
      taxaPerda,
      amostras: rtts.length,
    };
  }

  /**
   * Executa N consultas sequenciais para um domínio em um servidor específico
   * e retorna as estatísticas consolidadas.
   *
   * @param nomeServidor - Nome legível do servidor (para exibição)
   * @param ip           - Endereço IP do servidor
   * @param dominio      - Domínio a consultar em cada rodada
   * @param amostras     - Número de consultas a realizar (padrão: 10)
   * @param timeoutMs    - Timeout por consulta em milissegundos (padrão: 3000)
   */
  static async executar(
    nomeServidor: string,
    ip: string,
    dominio: string,
    amostras: number = 10,
    timeoutMs: number = 3000,
  ): Promise<EstatisticasServidor> {
    const cliente = new ClienteUdpDns(ip, 53, timeoutMs);
    const rtts: number[] = [];

    for (let i = 0; i < amostras; i++) {
      const resultado = await cliente.consultar(dominio, RecordType.A);
      rtts.push(resultado.error ? 0 : resultado.rttMs);
    }

    return {
      servidor: nomeServidor,
      ip,
      ...BenchmarkDesempenho.calcularEstatisticas(rtts),
    };
  }
}
