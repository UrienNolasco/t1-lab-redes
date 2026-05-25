/**
 * Enviar consultas DNS criptografadas via DNS over TLS (DoT).
 */
import * as tls from 'tls';
import { MensagemDns } from './message.js';
import { RecordType, type QueryResult } from './types.js';

/** Configuração de um servidor que suporta DNS over TLS */
export interface ServidorDot {
  /** Nome legível do servidor */
  nome: string;
  /** Endereço IP para conexão TCP/TLS */
  ip: string;
  /** Hostname usado na verificação do certificado TLS (SNI) */
  hostname: string;
}

export const SERVIDORES_DOT: ServidorDot[] = [
  { nome: 'Google DoT',     ip: '8.8.8.8', hostname: 'dns.google'       },
  { nome: 'Cloudflare DoT', ip: '1.1.1.1', hostname: 'one.one.one.one'  },
  { nome: 'Quad9 DoT',      ip: '9.9.9.9', hostname: 'dns.quad9.net'    },
];

export class ClienteDotDns {
  /**
   * @param servidor   - Servidor DoT a ser consultado
   * @param timeoutMs  - Tempo máximo de espera em milissegundos (padrão: 5000ms)
   *                     DoT precisa de mais tempo que UDP por causa do handshake TLS
   */
  constructor(
    private readonly servidor: ServidorDot,
    private readonly timeoutMs: number = 5000,
  ) {}

  /**
   * Envia uma consulta DNS criptografada via TLS na porta 853.
   * @param dominio - Nome do domínio a consultar (ex: "www.pucrs.br")
   * @param tipo    - Tipo de registro desejado (padrão: A = IPv4)
   */
  consultar(dominio: string, tipo: RecordType = RecordType.A): Promise<QueryResult> {
    return new Promise((resolve) => {
      const id          = Math.floor(Math.random() * 0xffff);
      const cargaDns    = MensagemDns.construirConsulta(dominio, tipo, id);

      const prefixo = Buffer.alloc(2); 
      prefixo.writeUInt16BE(cargaDns.length, 0);
      const pacote = Buffer.concat([prefixo, cargaDns]);

      const inicio    = Date.now();
      let finalizado  = false;

      const finalizar = (resultado: Omit<QueryResult, 'server' | 'serverIp' | 'domain'>) => {
        if (finalizado) return;
        finalizado = true;
        resolve({
          server:   this.servidor.nome,
          serverIp: this.servidor.ip,
          domain:   dominio,
          ...resultado,
        });
      };

      const temporizador = setTimeout(() => {
        socket.destroy();
        finalizar({ response: null, rttMs: Date.now() - inicio, error: 'timeout' });
      }, this.timeoutMs);

      const socket = tls.connect(
        {
          host:       this.servidor.ip,
          port:       853,
          servername: this.servidor.hostname,
        },
        () => {
          socket.write(pacote);
        },
      );

      let bufferRecebido = Buffer.alloc(0);
      socket.on('data', (chunk: Buffer) => {
        bufferRecebido = Buffer.concat([bufferRecebido, chunk]);

        if (bufferRecebido.length < 2) return;
        const tamanhoEsperado = bufferRecebido.readUInt16BE(0) + 2;
        if (bufferRecebido.length < tamanhoEsperado) return;

        clearTimeout(temporizador);
        const rttMs = Date.now() - inicio;
        try {
          const resposta = MensagemDns.analisarResposta(bufferRecebido.slice(2, tamanhoEsperado));
          socket.destroy();
          finalizar({ response: resposta, rttMs, error: null });
        } catch (e) {
          socket.destroy();
          finalizar({ response: null, rttMs, error: `erro de parse: ${(e as Error).message}` });
        }
      });

      socket.on('error', (err) => {
        clearTimeout(temporizador);
        finalizar({ response: null, rttMs: Date.now() - inicio, error: err.message });
      });
    });
  }
}
