<div align = center>
<h1>Teiú</h1>
</div>
<div align = center>
<img width="104" height="111" alt="Captura de tela_2-11-2026_154715 com" src="https://github.com/user-attachments/assets/d458e562-4d4f-4555-b1cd-c7bd9193948c" />
</div>
<div align=center>

> **"Infra pronta, do jeito certo."**  
> _Toolkit de Entrega, Infraestrutura e Unificação_
</div>

<div align=center>
  
[![CI](https://github.com/Matheus-a31/teiu/actions/workflows/ci.yml/badge.svg)](https://github.com/Matheus-a31/teiu/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node: >=18](https://img.shields.io/badge/node-%3E%3D18-blue.svg)](https://nodejs.org/)
</div>

CLI que **detecta** sua stack (Spring Boot / NestJS), **gera** Dockerfile multi-stage otimizado + docker-compose + pipeline CI/CD, e **audita** o que já existe — tudo em segundos, direto no seu terminal.

---

## Como funciona (Preview)

```bash
cd meu-projeto
npx teiu init
```

```
 Teiú v0.1.0 — detectando seu projeto...

✔ Stack detectada: Spring Boot 3.2 · Java 21 · Maven
✔ Testes detectados: JUnit + Testcontainers
? Qual provider de CI?          › GitHub Actions
? Precisa de banco no compose?  › PostgreSQL
? Registry da imagem?           › GHCR

Arquivos que serão gerados:
  Dockerfile
  .dockerignore
  docker-compose.yml
  .env.example
  .github/workflows/ci.yml

✔ Dockerfile gerado (multi-stage, non-root, healthcheck)
✔ docker-compose.yml gerado
✔ Pipeline GitHub Actions gerado
✔ .env.example gerado
```

## Comandos da CLI (Roadmap)

| Comando        | O que faz                                         | Flags principais                                      |
| -------------- | ------------------------------------------------- | ----------------------------------------------------- |
| `teiu init`    | Detecta stack e gera tudo (Docker + compose + CI) | `--dry-run`, `--force`, `--yes`, `--provider`, `--db` |
| `teiu docker`  | Gera só Dockerfile + `.dockerignore`              | `--force`, `--dry-run`, `--base-image`                |
| `teiu compose` | Gera só docker-compose + `.env.example`           | `--db`, `--cache`, `--force`                          |
| `teiu ci`      | Gera só pipeline de CI/CD                         | `--provider github\|gitlab`, `--force`, `--dry-run`   |
| `teiu audit`   | Analisa infra existente e dá score + sugestões    | `--json`, `--fix`                                     |
| `teiu habitat` | Mostra o que foi detectado no projeto             | `--json`                                              |
| `teiu doctor`  | Checa ambiente local (Docker, Git, Node)          | `--json`                                              |

## Desenvolvimento Local

### Pré-requisitos

- Node.js ≥ 18
- npm ≥ 9

### Instalação

```bash
git clone https://github.com/Matheus-a31/teiu.git
cd teiu
npm install
```

### Scripts disponíveis

- `npm run dev`: Compilação contínua em modo watch (`tsup`)
- `npm run build`: Compila TypeScript para ESM em `dist/`
- `npm test`: Executa suíte de testes unitários com `vitest`
- `npm run test:watch`: Executa testes em modo interativo
- `npm run typecheck`: Validação de tipos do TypeScript sem emitir arquivos
- `npm run lint`: Checagem de formatação e boas práticas com ESLint
- `npm run format`: Formatação automática de arquivos com Prettier

### Testando a CLI localmente

```bash
npm run build
node bin/teiu.js --help
node bin/teiu.js --version
```

## Licença

Distribuído sob a licença [MIT](LICENSE).
