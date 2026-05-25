/**
 * Responsabilidade: Ponto de entrada da ferramenta DNS Scanner.
 * Interpreta o subcomando passado na linha de comando e delega para o módulo correto.
 *
 * Subcomandos disponíveis:
 *   scan <dominio> [--csv]           Consulta todos os servidores para um domínio
 *   scan-all [--csv]                 Consulta todos os domínios de teste
 *   benchmark [dominio] [n] [--csv]  Mede desempenho de todos os servidores (UDP)
 *   servidores                       Lista os servidores configurados
 *   dot-query <dominio>              Consulta única via DNS over TLS (Parte 3)
 *   dot <dominio> [n]                Compara UDP vs DoT com N amostras (Parte 3)
 */

import { executarScanner } from './cli/scanner.js';
import { executarBenchmark } from './cli/benchmark.js';
import { exportarResultadosScan, exportarBenchmark } from './cli/export.js';
import { DOMINIOS_TESTE, DOMINIO_BENCHMARK } from './config/domains.js';

const [,, comando, ...args] = process.argv;

const USO = `
DNS Scanner — Ferramenta de Análise DNS
========================================
Uso: npx tsx ./index.ts <subcomando> [opções]

Subcomandos:
  scan <dominio> [--csv]            Consulta todos os servidores para o domínio
  scan-all [--csv]                  Consulta todos os domínios de teste
  benchmark [dominio] [n] [--csv]   Benchmark de desempenho UDP (padrão: ${DOMINIO_BENCHMARK}, 10 consultas)
  servidores                        Lista todos os servidores DNS configurados
  dot-query <dominio>               Consulta única via DNS over TLS (Google, Cloudflare, Quad9)
  dot [dominio] [n]                 Compara UDP vs DoT com N amostras (padrão: ${DOMINIO_BENCHMARK}, 10)

Exemplos:
  npx tsx ./index.ts scan www.pucrs.br
  npx tsx ./index.ts scan polymarket.com --csv
  npx tsx ./index.ts scan-all --csv
  npx tsx ./index.ts benchmark www.example.com 10 --csv
  npx tsx ./index.ts servidores
  npx tsx ./index.ts dot-query www.pucrs.br
  npx tsx ./index.ts dot www.example.com 10
`;

switch (comando) {
  case 'scan': {
    const dominio = args[0];
    if (!dominio || dominio.startsWith('--')) {
      console.error('Erro: informe um domínio.\nUso: npm start scan <dominio> [--csv]');
      process.exit(1);
    }
    const gerarCsv = args.includes('--csv');
    executarScanner(dominio).then((resultados) => {
      if (gerarCsv) {
        const nomeArquivo = `scan-${dominio.replace(/\./g, '_')}.csv`;
        exportarResultadosScan(dominio, resultados, nomeArquivo);
      }
    }).catch(console.error);
    break;
  }

  case 'scan-all': {
    const gerarCsv = args.includes('--csv');
    (async () => {
      for (const dt of DOMINIOS_TESTE) {
        console.log(`\n${'='.repeat(122)}`);
        console.log(`Domínio: ${dt.dominio} — ${dt.descricao}`);
        const resultados = await executarScanner(dt.dominio);
        if (gerarCsv) {
          const nomeArquivo = `scan-${dt.dominio.replace(/\./g, '_')}.csv`;
          exportarResultadosScan(dt.dominio, resultados, nomeArquivo);
        }
      }
    })().catch(console.error);
    break;
  }

  case 'benchmark': {
    const dominio   = args[0] && !args[0].startsWith('--') ? args[0] : DOMINIO_BENCHMARK;
    const amostras  = parseInt(args[1] ?? '10', 10);
    const gerarCsv  = args.includes('--csv');
    executarBenchmark(dominio, amostras).then((estatisticas) => {
      if (gerarCsv) {
        exportarBenchmark(estatisticas, `benchmark-${dominio.replace(/\./g, '_')}.csv`);
      }
    }).catch(console.error);
    break;
  }

  case 'servidores': {
    import('./config/servers.js').then(({ SERVIDORES_DNS }) => {
      console.log('\nServidores DNS Configurados:\n');
      console.log('Nome'.padEnd(26) + 'IP'.padEnd(18) + 'Categoria');
      console.log('-'.repeat(60));
      SERVIDORES_DNS.forEach(s =>
        console.log(`${s.nome.padEnd(26)}${s.ip.padEnd(18)}${s.categoria}`),
      );
    });
    break;
  }

  case 'dot-query': {
    const dominio = args[0];
    if (!dominio) {
      console.error('Erro: informe um domínio.\nUso: npm start dot-query <dominio>');
      process.exit(1);
    }
    import('./cli/dot-compare.js').then(({ consultaSimplesDot }) => {
      consultaSimplesDot(dominio).catch(console.error);
    });
    break;
  }

  case 'dot': {
    const dominio  = args[0] && !args[0].startsWith('--') ? args[0] : DOMINIO_BENCHMARK;
    const amostras = parseInt(args[1] ?? '10', 10);
    import('./cli/dot-compare.js').then(({ executarComparacaoDot }) => {
      executarComparacaoDot(dominio, amostras).catch(console.error);
    });
    break;
  }

  default:
    console.log(USO);
}
