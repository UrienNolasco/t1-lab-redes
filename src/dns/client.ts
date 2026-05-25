/**
 * Responsabilidade: Enviar consultas DNS via UDP (porta 53) e receber respostas.
 */
import * as dgram from 'dgram';
import { MensagemDns } from './message.js';
import { RecordType, type QueryResult } from './types.js';

export class ClienteUdpDns {
  /**
   * @param servidorIp  - Endereço IP do servidor DNS a consultar (ex: "8.8.8.8")
   * @param porta       - Porta do servidor DNS (padrão: 53)
   * @param timeoutMs   - Tempo máximo de espera em milissegundos (padrão: 3000ms)
   */
  constructor(
    private readonly servidorIp: string,
    private readonly porta: number = 53,
    private readonly timeoutMs: number = 3000,
  ) {}

  /**
   * Envia uma consulta DNS para o servidor configurado e aguarda a resposta.
   * @param dominio - Nome do domínio a consultar (ex: "www.pucrs.br")
   * @param tipo    - Tipo de registro desejado (padrão: A = IPv4)
   */
  consultar(dominio: string, tipo: RecordType = RecordType.A): Promise<QueryResult> {
    return new Promise((resolve) => {
      const id      = Math.floor(Math.random() * 0xffff);
      const pacote  = MensagemDns.construirConsulta(dominio, tipo, id);
      const socket  = dgram.createSocket('udp4');
      const inicio  = Date.now();

      const finalizaPrommise = (resultado: Omit<QueryResult, 'server' | 'serverIp' | 'domain'>) => {
        socket.close();
        resolve({ server: '', serverIp: this.servidorIp, domain: dominio, ...resultado });
      };

      const temporizador = setTimeout(() => {
        finalizaPrommise({ response: null, rttMs: Date.now() - inicio, error: 'timeout' });
      }, this.timeoutMs);

      socket.on('error', (err) => {
        clearTimeout(temporizador);
        finalizaPrommise({ response: null, rttMs: Date.now() - inicio, error: err.message });
      });

      socket.on('message', (msg) => {
        clearTimeout(temporizador);
        const rttMs = Date.now() - inicio;
        try {
          const resposta = MensagemDns.analisarResposta(msg);
          finalizaPrommise({ response: resposta, rttMs, error: null });
        } catch (e) {
          finalizaPrommise({ response: null, rttMs, error: `erro de parse: ${(e as Error).message}` });
        }
      });

      socket.send(pacote, this.porta, this.servidorIp);
    });
  }
}
