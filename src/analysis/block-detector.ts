/**
 * Detectar e classificar bloqueios DNS nas respostas recebidas.
 */

import { RCode, RecordType } from '../dns/types.js';
import type { QueryResult } from '../dns/types.js';

/** Status possível de uma resposta após análise de bloqueio */
export enum StatusBloqueio {
  OK           = 'OK',
  NXDOMAIN     = 'NXDOMAIN',
  RECUSADO     = 'RECUSADO',
  ROTA_NULA    = 'ROTA_NULA',
  REDIRECIONADO = 'REDIRECIONADO',
  TIMEOUT      = 'TIMEOUT',
  ERRO         = 'ERRO',
}

/** IPs que indicam bloqueio por rota nula */
const IPS_NULOS = new Set(['0.0.0.0', '127.0.0.1', '::']);

export class DetectorBloqueio {
  /**
   * Classifica o resultado de uma consulta como bloqueado, redirecionado ou legítimo.
   * @param resultado   - Resultado da consulta a ser analisado
   * @param ipConsenso  - IP retornado pela maioria dos servidores sem filtro.
   *                      Passe string vazia para pular a verificação de redirecionamento.
   */
  static classificar(resultado: QueryResult, ipConsenso: string): StatusBloqueio {
    if (resultado.error) {
      return resultado.error === 'timeout' ? StatusBloqueio.TIMEOUT : StatusBloqueio.ERRO;
    }

    const resp = resultado.response!;

    if (resp.rcode === RCode.NXDOMAIN) return StatusBloqueio.NXDOMAIN;
    if (resp.rcode === RCode.REFUSED)  return StatusBloqueio.RECUSADO;

    const registrosA = resp.answers
      .filter(a => a.type === RecordType.A)
      .map(a => a.data);

    if (registrosA.some(ip => IPS_NULOS.has(ip))) return StatusBloqueio.ROTA_NULA;

    if (ipConsenso && registrosA.length > 0 && !registrosA.includes(ipConsenso)) {
      return StatusBloqueio.REDIRECIONADO;
    }

    return StatusBloqueio.OK;
  }

  /**
   * Calcula o IP consenso.
   * @param resultados - Lista de resultados de consulta de múltiplos servidores
   * @returns O IP mais comum, ou string vazia se nenhuma resposta A foi recebida
   */
  static calcularIpConsenso(resultados: QueryResult[]): string {
    const frequencia = new Map<string, number>();
    for (const r of resultados) {
      if (!r.response) continue;
      for (const registro of r.response.answers.filter(a => a.type === RecordType.A)) {
        frequencia.set(registro.data, (frequencia.get(registro.data) ?? 0) + 1);
      }
    }
    if (frequencia.size === 0) return '';
    return [...frequencia.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }
}
