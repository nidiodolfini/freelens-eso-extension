# freelens-eso-extension

Extensão Freelens para o **External Secrets Operator (ESO)**. Portado da extension API v2
para a **API v1 (Freelens 1.x, `engines.freelens: ^1.8.0`)**, seguindo o layout de build da
extensão oficial [`freelensapp/freelens-fluxcd-extension`](https://github.com/freelensapp/freelens-fluxcd-extension)
v5.3.1 (electron-vite, `out/`, bundles CommonJS).

Repositório: <https://github.com/nidiodolfini/freelens-eso-extension> · Pacote npm:
[`freelens-eso-extension`](https://www.npmjs.com/package/freelens-eso-extension)

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

- Freelens 1.10.x (extension API v1; `engines.freelens` exige `^1.8.0`).
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

> O patch aplica três correções de ambiente (o sandbox DSH bloqueia spawn com
> stdio em pipe): o `net use` do realpath (try/catch), o uso do compilador Sass
> JS puro (`sass`) em vez do `sass-embedded` (que spawna o binário Dart Sass) e,
> no electron-vite, a transpilação do config por TypeScript in-process em vez do
> serviço esbuild (que spawna um binário). Rode o script novamente após qualquer
> `pnpm install` que recrie as dependências.

## Comandos de desenvolvimento

```powershell
pnpm type:check     # tsc -p tsconfig.json (um programa único, como no fluxcd)
pnpm test:unit      # vitest
pnpm build          # electron-vite build → out/main e out/renderer (CommonJS)
pnpm biome:fix      # formatação/lint (TypeScript, TSX, JSON, CSS, HTML)
pnpm biome:check
pnpm knip:check     # arquivos e dependências não usados (requer download via pnpm dlx)
pnpm pack:dev       # bump prerelease + build + .tgz para instalar no Freelens
pnpm clean          # remove out/
```

> `biome:*` e `knip:*` rodam via `pnpm dlx`, cujo cache padrão fica em
> `%LOCALAPPDATA%` (bloqueado no sandbox). Redirecione para dentro do workspace antes de
> rodá-los: `$env:LOCALAPPDATA = "C:\Users\nidio\GitHub\freelens-extension\.localappdata"`.
> O `test:unit` usa `--pool=threads` porque o pool forks do vitest spawna processos filhos,
> bloqueados no sandbox.

## Instalar pelo nome (npm)

Depois de publicado, o Freelens instala a extensão pelo nome, como as extensões oficiais:

1. No Freelens, em **Extensions**, escolha **Install** e digite `freelens-eso-extension`
   (sem caminho de diretório). O Freelens resolve o pacote no registry do npm.
2. Confirme e habilite a extensão; as três páginas aparecem na sidebar de cada cluster.

Para publicar uma nova versão:

```powershell
pnpm bump-version patch        # ou minor/major/prerelease
pnpm build
pnpm publish --no-git-checks   # requer NODE_AUTH_TOKEN do npmjs.com
```

O workflow `.github/workflows/release.yaml` também publica automaticamente no push de uma tag
`v*` (requer o secret `NPM_TOKEN` do registry npm no repositório GitHub).

## Instalar no Freelens (a partir do diretório, para desenvolvimento)

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
electron.vite.config.js                         # config do electron-vite (main + renderer em preload)
build/global-externals.js                       # plugin: react/mobx/... → globals do host (v1)
src/
  main/index.ts                                 # entry main (sem estado)
  renderer/index.tsx                            # registros v1: apiManager, 3 páginas, details, menu
  renderer/api/types.ts                         # tipos do spec/status do ESO
  renderer/api/store-helpers.ts                 # helpers puros de status dos stores
  renderer/api/externalsecret/externalsecret-v1.ts # modelo ExternalSecret (+ Api/Store consts, teste)
  renderer/api/secretstore/secretstore-v1.ts       # modelo SecretStore (+ Api/Store consts, teste)
  renderer/api/clustersecretstore/clustersecretstore-v1.ts # modelo ClusterSecretStore (+ Api/Store consts, teste)
  renderer/pages/                               # 3 páginas + CSS module
  renderer/details/                             # 3 painéis de detalhes
  renderer/menus/                               # Force Sync (ExternalSecret)
  renderer/icons/                               # ícone cadeado + seta de refresh
  renderer/components/                          # createAvailableVersionPage, error boundaries
examples/eso/                                   # objetos de teste (kubectl apply -f)
```

Build em `out/main/index.js` e `out/renderer/index.js` (bundles CommonJS, como as extensões
Freelens 1.x); `package.json` aponta `main`/`renderer` para esses arquivos.

## Versões da API

A extensão suporta **somente `external-secrets.io/v1`** (uma versão por kind, com a página
"Not Available" quando a CRD não está instalada). O `v1beta1` está unserved desde o ESO 0.9
(2023); para adicioná-lo depois, siga o mesmo padrão de modelo/página/details por versão e
liste as duas em `createAvailableVersionPage`, da mais nova para a mais antiga.

## Desvios do template

- `packageManager` = `pnpm@11.28.6` (pnpm 12 exige lock em `%LOCALAPPDATA%`, negado no sandbox).
- `nodeLinker: hoisted` em `pnpm-workspace.yaml`.
- O build usa electron-vite (`electron.vite.config.js` + `build/global-externals.js`, espelhando
  o fluxcd v5.3.1): `react`/`react-dom`/`mobx`/`mobx-react`/`@freelensapp/extensions` são
  fornecidos pelo host v1 via `global.*` e ficam externos; main e renderer saem como CommonJS.
- A seção `preload` do electron-vite compila o renderer (sem HTML de entrada) para `out/renderer`.
- CSS dos módulos entra nas páginas via `?inline` + `<style>` (padrão do fluxcd v1), porque o
  build com `preserveModules` não garante um único `renderer.css` carregado pelo host.
- O config do electron-vite **não** usa `@vitejs/plugin-react` (ao contrário do fluxcd): o
  carregador CommonJS do config não consegue `require()` o grafo ESM do plugin (tem
  top-level `await`) e o sandbox não executa o bundler esbuild do electron-vite; o JSX do
  renderer usa o transform automático nativo do Vite (`react/jsx-runtime` → global do host).
  O plugin permanece como devDependency (espelho do fluxcd) e o knip o ignora.
- `test:unit` usa `--pool=threads` porque o pool forks do vitest spawna processos filhos,
  bloqueados no sandbox.
- `knip:check` usa `&&` em vez do padrão regex `pnpm "/^...$/"` (sintaxe de aspas quebra no
  `cmd.exe` do Windows).
- Sem preferências/ExtensionStore e sem testes de integração (o main é uma classe mínima).
