/**
 * Responsabilidade: Construir e interpretar mensagens DNS no formato binário
 */

import { RecordType, RecordClass, type DnsResponse, type DnsRecord, type DnsQuestion, RCode } from './types.js';

export class MensagemDns {
  /**
   * Codifica um nome de domínio no formato de rótulos (labels) do DNS.
   * Ex: "www.example.com" → [3]"www"[7]"example"[3]"com"[0]
   */
  static codificarNome(dominio: string): Buffer {
    const partes = dominio.split('.');
    const buffers: Buffer[] = [];
    for (const parte of partes) {
      const rotulo = Buffer.alloc(1 + parte.length);
      rotulo[0] = parte.length;
      rotulo.write(parte, 1, 'ascii');
      buffers.push(rotulo);
    }
    buffers.push(Buffer.alloc(1)); // rótulo raiz (zero) indica fim do nome
    return Buffer.concat(buffers);
  }

  /**
   * Monta um pacote binário de consulta DNS pronto para ser enviado via UDP.
   * O pacote segue o formato da RFC 1035: cabeçalho de 12 bytes + seção de pergunta.
   *
   * @param dominio  - Nome do domínio a consultar (ex: "www.pucrs.br")
   * @param tipo     - Tipo de registro desejado (padrão: A = endereço IPv4)
   * @param id       - Identificador da consulta (gerado aleatoriamente se omitido)
   */
  static construirConsulta(
    dominio: string,
    tipo: RecordType = RecordType.A,
    id: number = Math.floor(Math.random() * 0xffff),
  ): Buffer {
    const cabecalho = Buffer.alloc(12);
    cabecalho.writeUInt16BE(id, 0);      // ID da transação
    cabecalho.writeUInt16BE(0x0100, 2);  // Flags: RD=1 (pedir recursão)
    cabecalho.writeUInt16BE(1, 4);       // QDCOUNT = 1 pergunta
    cabecalho.writeUInt16BE(0, 6);       // ANCOUNT = 0
    cabecalho.writeUInt16BE(0, 8);       // NSCOUNT = 0
    cabecalho.writeUInt16BE(0, 10);      // ARCOUNT = 0

    const qnome   = MensagemDns.codificarNome(dominio);
    const qtipo   = Buffer.alloc(2); qtipo.writeUInt16BE(tipo, 0);
    const qclasse = Buffer.alloc(2); qclasse.writeUInt16BE(RecordClass.IN, 0);

    return Buffer.concat([cabecalho, qnome, qtipo, qclasse]);
  }

  /**
   * Decodifica um nome de domínio a partir de uma posição no buffer.
   * @returns [nome, bytesConsumidos] — o nome decodificado e quantos bytes foram lidos
   * no offset original.
   */
  static decodificarNome(buf: Buffer, offset: number): [string, number] {
    const rotulos: string[] = [];
    const offsetInicial = offset;
    let salto = false;
    let bytesAntesDoSalto = 0;

    while (true) {
      if (offset >= buf.length) break;
      const tamanho = buf[offset];
      if ((tamanho & 0xc0) === 0xc0) {
        if (!salto) {
          bytesAntesDoSalto = offset - offsetInicial + 2; 
          salto = true;
        }
        const destino = ((tamanho & 0x3f) << 8) | buf[offset + 1];
        offset = destino;
        continue;
      }

      if (tamanho === 0) break;

      offset++;
      rotulos.push(buf.slice(offset, offset + tamanho).toString('ascii'));
      offset += tamanho;
    }

    const consumidos = salto ? bytesAntesDoSalto : offset - offsetInicial + 1;
    return [rotulos.join('.'), consumidos];
  }

  /**
   * Interpreta um pacote binário de resposta DNS recebido do servidor.
   * @param buf - Buffer bruto recebido via UDP contendo a resposta DNS completa
   */
  static analisarResposta(buf: Buffer): DnsResponse {
    const id        = buf.readUInt16BE(0);
    const flags     = buf.readUInt16BE(2);
    const qdcount   = buf.readUInt16BE(4);
    const ancount   = buf.readUInt16BE(6);
    const rcode: RCode    = flags & 0x0f;
    const autoritativo    = !!(flags & 0x0400);
    const truncado        = !!(flags & 0x0200);

    let offset = 12;
    const perguntas: DnsQuestion[] = [];

    for (let i = 0; i < qdcount; i++) {
      const [nome, consumidos] = MensagemDns.decodificarNome(buf, offset);
      offset += consumidos;
      const tipo: RecordType   = buf.readUInt16BE(offset);
      const classe: RecordClass = buf.readUInt16BE(offset + 2);
      offset += 4;
      perguntas.push({ name: nome, type: tipo, class: classe });
    }

    const respostas: DnsRecord[] = [];
    for (let i = 0; i < ancount; i++) {
      const [nome, consumidos] = MensagemDns.decodificarNome(buf, offset);
      offset += consumidos;
      const tipo: RecordType    = buf.readUInt16BE(offset);
      const classe: RecordClass = buf.readUInt16BE(offset + 2);
      const ttl    = buf.readUInt32BE(offset + 4);
      const rdlen  = buf.readUInt16BE(offset + 8);
      offset += 10;

      let dado = '';
      if (tipo === RecordType.A && rdlen === 4) {
        dado = `${buf[offset]}.${buf[offset + 1]}.${buf[offset + 2]}.${buf[offset + 3]}`;
      } else if (tipo === RecordType.CNAME || tipo === RecordType.NS) {
        const [cname] = MensagemDns.decodificarNome(buf, offset);
        dado = cname;
      } else {
        dado = buf.slice(offset, offset + rdlen).toString('hex');
      }
      offset += rdlen;
      respostas.push({ name: nome, type: tipo, class: classe, ttl, data: dado });
    }

    return {
      id,
      rcode,
      questions: perguntas,
      answers: respostas,
      authoritative: autoritativo,
      truncated: truncado,
    };
  }
}
