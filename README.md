# @freelensapp/eso-extension

Extensão Freelens para o **External Secrets Operator (ESO)**. Projeto criado a partir do
template oficial [`freelensapp/freelens-example-extension`](https://github.com/freelensapp/freelens-example-extension)
(Freelens >= 2.0.0, extension API v2).

## O que a extensão faz

Três páginas de cluster, uma por recurso do ESO:

- **External Secrets** (`es`) — colunas espelhando `kubectl get es`: Name, Namespace, Store
  Type, Store, Refresh Interval, Status, Ready, Last Sync e Age.
- **Secret Stores** (`ss`) — colunas espelhando `kubectl get ss`: Name, Namespace, Provider,
  Status, Capabilities, Ready e Age.
- **Cluster Secret Stores** (`css`) — o mesmo, sem Namespace.

O status vem da condition `Ready` de cada recurso: `success`/`error`/`warning`, com o reason do
controller (`SecretSynced`, `SecretSyncedError`, `Valid`, `ValidationFailed`, ...). Quando a CRD
não está instalada no cluster, a página mostra "Not Available".

Cada recurso tem um painel de detalhes no drawer: target Secret, store, refresh policy/interval,
última sincronização, resource version sincronizada e as conditions com tooltip da message.

**Force Sync**: o menu do `ExternalSecret` ganha a ação "Force Sync", que grava um timestamp novo
na annotation `external-secrets.io/force-sync` — o mesmo que
`kubectl annotate es <name> force-sync=$(date +%s) --overwrite`. O controller reconcilia quando a
annotation muda. SecretStore e ClusterSecretStore não têm essa ação.

## Requisitos

- Freelens 2.x (extension API v2).
- Um cluster com o External Secrets Operator instalado (`external-secrets.io/v1`).

## Pré-requisitos deste ambiente

- **Node**: `C:\Users\nidio\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe`
- **pnpm 11.28.6** (vendored em `.tools/pnpm11/`; o pnpm 12 do harness usa um lock de
  store em `%LOCALAPPDATA%`, que o sandbox bloqueia). Um shim está em
  [`.tools/bin/pnpm.cmd`](.tools/bin/pnpm.cmd) — adicione `.tools\bin` ao `PATH`:

```powershell
$env:PATH = "C:\Users\nidio\GitHub\freelens-extension\.tools\bin;" + $env:PATH
```

## Setup

```powershell
$env:ELECTRON_SKIP_BINARY_DOWNLOAD = "1"   # pular binário do electron (types apenas)
$env:NPM_CONFIG_CACHE = "C:\Users\nidio\GitHub\freelens-extension\.npm-cache"
pnpm install
node .tools\patch-vite.mjs                  # patch idempotente do vite p/ o sandbox
```

Caches ficam dentro do workspace: `.pnpm-store`, `.pnpm-cache`, `.pnpm-state`,
`.npm-cache` (ver `.npmrc` e `pnpm-workspace.yaml`).

> O patch aplica duas correções de ambiente em `node_modules/vite` (o sandbox DSH
> bloqueia spawn com stdio em pipe): `net use` do realpath (try/catch) e uso do
> compilador Sass JS puro (`sass`) em vez do `sass-embedded`, que spawna o binário
> Dart Sass. Rode o script novamente após qualquer `pnpm install` que recrie o vite.

## Comandos de desenvolvimento

```powershell
pnpm type:check     # todos os programas (sources, tests, tooling, environments)
pnpm test:unit      # vitest
pnpm build          # vite build (renderer) + vite build --mode main → dist/
pnpm dev            # watch do renderer e do main (instalação por diretório)
pnpm biome:fix      # formatação/lint (TypeScript, TSX, JSON, CSS, HTML)
pnpm biome:check
pnpm knip:check     # arquivos e dependências não usados (requer download via pnpm dlx)
pnpm pack:dev       # bump prerelease + build + .tgz para instalar no Freelens
pnpm clean          # remove dist/
```

> `biome:*` e `knip:*` rodam via `pnpm dlx`, cujo cache padrão fica em
> `%LOCALAPPDATA%` (bloqueado no sandbox). Redirecione para dentro do workspace antes de
> rodá-los: `$env:LOCALAPPDATA = "C:\Users\nidio\GitHub\freelens-extension\.localappdata"`.
> O `test:unit` usa `--pool=threads` porque o pool forks do vitest spawna processos filhos,
> bloqueados no sandbox.

## Instalar no Freelens

1. `pnpm install && pnpm build` (ou deixe `pnpm dev` rodando para o watch).
2. No Freelens, em **Extensions**, escolha **Install from directory** e aponte para este
   diretório. Confirme carregar a extensão "in place" para que os rebuilds recarreguem sozinhos.

## Testar com os exemplos

Aplique os objetos de exemplo em um cluster com o ESO instalado:

```powershell
kubectl apply -f examples/eso/secretstore.yaml
kubectl apply -f examples/eso/clustersecretstore.yaml
kubectl apply -f examples/eso/externalsecret.yaml
```

As páginas "Secret Stores", "Cluster Secret Stores" e "External Secrets" devem listar
`fake-store`, `fake-cluster-store` e `hello-world`, e o details do ExternalSecret mostra a
condition `Ready=SecretSynced` depois do primeiro sync (o provider `fake` serve o par
`/hello → world`, usado para criar o Secret `hello-world` com a chave `hello`).

## Estrutura

```text
src/
  main/index.ts                                    # entry main (sem estado)
  renderer/index.tsx                               # registros: 3 páginas, details, menu
  renderer/api/types.ts                            # tipos do spec/status do ESO
  renderer/api/store-helpers.ts                    # helpers puros de status dos stores
  renderer/api/externalsecret/externalsecret-v1.ts # modelo ExternalSecret (+ Api/Store, teste)
  renderer/api/secretstore/secretstore-v1.ts       # modelo SecretStore (+ Api/Store, teste)
  renderer/api/clustersecretstore/clustersecretstore-v1.ts # modelo ClusterSecretStore (+ Api/Store, teste)
  renderer/pages/                                  # 3 páginas + CSS module
  renderer/details/                                # 3 painéis de detalhes
  renderer/menus/                                  # Force Sync (ExternalSecret)
  renderer/icons/                                  # ícone cadeado + seta de refresh
  renderer/components/                             # createAvailableVersionPage, error boundaries
examples/eso/                                      # objetos de teste (kubectl apply -f)
```

Build em `dist/main.js`, `dist/renderer.js` e `dist/renderer.css`.

## Versões da API

A extensão suporta **somente `external-secrets.io/v1`** (uma versão por kind, com a página
"Not Available" quando a CRD não está instalada). O `v1beta1` está unserved desde o ESO 0.9
(2023); para adicioná-lo depois, siga o mesmo padrão de modelo/página/details por versão e
liste as duas em `createAvailableVersionPage`, da mais nova para a mais antiga.

## Desvios do template

- `packageManager` = `pnpm@11.28.6` (pnpm 12 exige lock em `%LOCALAPPDATA%`, negado no sandbox).
- `nodeLinker: hoisted` em `pnpm-workspace.yaml` (resolução do pacote nativo do `typescript@7` no Windows).
- `build/vite-plugin-standard-decorators.mjs` usa Babel (`@babel/core`,
  `@babel/preset-typescript`, `@babel/plugin-proposal-decorators` 2023-11) como
  fallback do esbuild (que spawna binário com pipe, bloqueado no sandbox).
- `sass@1.105.2` adicionado como devDependency (usado pelo patch acima).
- Sem preferências/ExtensionStore: `src/common/store/` não existe e o main é uma classe mínima.
- Sem testes de integração: `integration/`, `vitest.integration.config.ts` e o workflow
  `integration-tests.yaml` foram removidos, junto com a devDependency `playwright`.
