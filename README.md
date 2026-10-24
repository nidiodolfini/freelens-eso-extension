# freelens-eso-extension

A Freelens extension for the [External Secrets Operator](https://external-secrets.io/) (ESO):
browse ExternalSecrets, SecretStores and ClusterSecretStores, see their sync status at a
glance, and trigger a manual sync from the UI.

Built for the Freelens **extension API v1** (Freelens 1.x, `engines.freelens: ^1.8.0`), with
the build layout of the official
[`freelensapp/freelens-fluxcd-extension`](https://github.com/freelensapp/freelens-fluxcd-extension)
v5.3.1 (electron-vite, CommonJS bundles in `out/`).

Repository: <https://github.com/nidiodolfini/freelens-eso-extension> ·
npm package: [`freelens-eso-extension`](https://www.npmjs.com/package/freelens-eso-extension) ·
Proposed in [freelensapp/freelens discussion #2840](https://github.com/freelensapp/freelens/discussions/2840).

## What the extension does

Three cluster pages, one per ESO resource, grouped under a single sidebar entry:

- **External Secrets** (`es`) — columns mirroring `kubectl get es`: Name, Namespace, Store
  Type, Store, Refresh Interval, Status, Ready, Last Sync and Age.
- **Secret Stores** (`ss`) — columns mirroring `kubectl get ss`: Name, Namespace, Provider,
  Status, Capabilities, Ready and Age.
- **Cluster Secret Stores** (`css`) — the same, without Namespace.

Sync status comes from each resource's `Ready` condition and is rendered as a colored badge
(`success` / `error` / `warning`) with the controller's reason (`SecretSynced`,
`SecretSyncedError`, `Valid`, `ValidationFailed`, ...). When the CRD is not installed in the
cluster, the page shows a friendly "Not Available" message.

Each resource also gets a details panel in the drawer: target Secret, store, refresh
policy/interval, last sync time, synced resource version and the full conditions with their
messages as tooltips.

**Force Sync**: the `ExternalSecret` menu gains a "Force Sync" action, which writes a fresh
timestamp to the `external-secrets.io/force-sync` annotation — the same as
`kubectl annotate es <name> force-sync=$(date +%s) --overwrite`. The controller reconciles
whenever the annotation changes, so the secret is refreshed immediately. `SecretStore` and
`ClusterSecretStore` do not support this action, so they have no menu item.

## Requirements

- Freelens 1.8 or newer (extension API v1; tested on 1.10.x).
- A cluster with the External Secrets Operator installed (`external-secrets.io/v1`).

## Installation

In Freelens, open **Extensions**, choose **Install** and type `freelens-eso-extension`
(no path). Freelens resolves the package from the npm registry, exactly like the official
extensions. Enable it, and the "External Secrets" sidebar group appears on every cluster.

To install from a local checkout instead (for development), see
[Development](#development) below.

## Usage

1. Apply the example objects to a cluster with ESO installed:

   ```powershell
   kubectl apply -f examples/eso/secretstore.yaml
   kubectl apply -f examples/eso/clustersecretstore.yaml
   kubectl apply -f examples/eso/externalsecret.yaml
   ```

   These use ESO's `fake` provider, which serves the pair `/hello -> world` without touching
   any real secret backend; the ExternalSecret creates a Secret named `hello-world` with the
   key `hello`.

2. Open the cluster in Freelens. The pages list `fake-store`, `fake-cluster-store` and
   `hello-world`; the ExternalSecret details panel shows `Ready=SecretSynced` after the first
   sync.

3. Open the `hello-world` menu and click **Force Sync**; the "Last Sync" column updates
   within seconds as the controller reconciles.

## Development

Node 22+ and pnpm are required.

```powershell
pnpm install
pnpm type:check     # tsc -p tsconfig.json (single program, as in the fluxcd extension)
pnpm test:unit      # vitest
pnpm build          # type check, then electron-vite build -> out/main and out/renderer (CommonJS)
pnpm biome:fix      # formatting/lint (TypeScript, TSX, JSON, CSS, HTML)
pnpm biome:check
pnpm knip:check     # unused files and dependencies (downloads knip via pnpm dlx)
pnpm pack:dev       # bump prerelease + build + .tgz to install in Freelens
pnpm clean          # remove out/
```

To load the checkout in Freelens, run `pnpm install && pnpm build`, then in **Extensions**
choose **Install from directory** and point at this directory; confirm loading the
extension "in place" so rebuilds reload it automatically.

## Project structure

```text
electron.vite.config.js                          # electron-vite config (main + renderer in preload)
build/global-externals.js                        # plugin: react/mobx/... -> host globals (v1)
src/
  main/index.ts                                  # main entry (stateless)
  renderer/index.tsx                             # v1 registrations: 3 pages, details, menu
  renderer/api/types.ts                          # ESO spec/status types
  renderer/api/store-helpers.ts                  # condition helpers shared by the models and panels
  renderer/api/lazy-store.ts                     # store built and registered on first use, in a cluster frame
  renderer/api/externalsecret/externalsecret-v1.ts   # ExternalSecret model (+ Api/Store, test)
  renderer/api/secretstore/secretstore-v1.ts         # SecretStore model (+ Api/Store, test)
  renderer/api/clustersecretstore/clustersecretstore-v1.ts # ClusterSecretStore model (+ Api/Store, test)
  renderer/pages/                                # 3 pages + CSS module
  renderer/details/                              # ExternalSecret panel, StoreDetails for both stores
  renderer/menus/                                # Force Sync (ExternalSecret)
  renderer/icons/                                # External Secrets Operator logo (currentColor)
  renderer/components/                           # createAvailableVersionPage, error boundaries
examples/eso/                                    # test objects (kubectl apply -f)
docs/eso-api.md                                  # ESO API notes the types follow
AGENTS.md                                        # guide for coding agents
```

Build output goes to `out/main/index.js` and `out/renderer/index.js` (CommonJS bundles, like
the other Freelens 1.x extensions); `package.json` points `main`/`renderer` at them.

## Supported API versions

The extension supports **`external-secrets.io/v1` only** (one version per kind, with the
"Not Available" page when the CRD is missing). `v1beta1` has been unserved since ESO 0.9
(2023); to add it later, follow the same per-version model/page/details pattern and list
both versions in `createAvailableVersionPage`, newest first.

## Publishing a release

```powershell
pnpm bump-version patch        # or minor/major/prerelease
pnpm build
pnpm publish                   # requires npmjs.com authentication (NODE_AUTH_TOKEN)
```

The `.github/workflows/release.yaml` workflow also publishes automatically when a `v*` tag
is pushed (it needs the npm registry `NPM_TOKEN` secret in the GitHub repository, or npm
Trusted Publishing / provenance).

## License

MIT. The sidebar icon is the External Secrets Operator logo
([external-secrets.io](https://external-secrets.io/), Apache-2.0), recolored with
`currentColor` so it follows the Freelens theme.
