# Como Executar

```bash
npm install
```

## Comandos

```bash
# Exibir ajuda
npx tsx ./index.ts

# Consultar todos os servidores para um domínio
npx tsx ./index.ts scan <dominio>

# Consultar todos os domínios de teste (gera CSV)
npx tsx ./index.ts scan-all --csv

# Benchmark de desempenho — 10 consultas por servidor
npx tsx ./index.ts benchmark www.example.com 10 --csv

# Comparar UDP vs DNS over TLS
npx tsx ./index.ts dot www.example.com 10

# Listar servidores configurados
npx tsx ./index.ts servidores
```

## Exemplos

```bash
npx tsx ./index.ts scan reddit.com
npx tsx ./index.ts scan internetbadguys.com
npx tsx ./index.ts scan-all --csv
npx tsx ./index.ts benchmark www.example.com 10 --csv
npx tsx ./index.ts dot www.example.com 10
```
