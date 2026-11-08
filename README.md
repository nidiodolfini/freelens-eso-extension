# freelens-eso-extension

A Freelens extension for the [External Secrets Operator](https://external-secrets.io/) (ESO):
browse ExternalSecrets, SecretStores and ClusterSecretStores, see their sync status at a
glance, and trigger a manual sync from the UI.

Built for the Freelens **extension API v2** (Freelens 2.x, `engines.freelens: ^2.0.0`), with
the build, type-check, test and lint layout of the reference template
[`freelensapp/freelens-example-extension`](https://github.com/freelensapp/freelens-example-extension)
(Vite 8, ES module bundles in `dist/`).

Repository: <https://github.com/nidiodolfini/freelens-eso-extension> ·
npm package: [`freelens-eso-extension`](https://www.npmjs.com/package/freelens-eso-extension) ·
Proposed in [freelensapp/freelens discussion #2840](https://github.com/freelensapp/freelens/discussions/2840).

## What the extension does

Five cluster pages, one per ESO resource, grouped under a single sidebar entry:

- **External Secrets** (`es`) — columns mirroring `kubectl get es`: Name, Namespace, Store
  Type, Store, Refresh Interval, Status, Ready, Last Sync and Age.
- **Cluster External Secrets** (`ces`) — columns mirroring `kubectl get ces`: Name, Store Type,
  Store, Refresh Interval, the number of provisioned Namespaces (with the failed ones as a
  badge), Ready and Age.
- **Push Secrets** (`ps`, `external-secrets.io/v1alpha1`) — columns mirroring `kubectl get ps`:
  Name, Namespace, the source Secret, the Stores it is pushed to, Refresh Interval, Status,
  Ready, Last Sync and Age.
- **Secret Stores** (`ss`) — columns mirroring `kubectl get ss`: Name, Namespace, Provider,
  Status, Capabilities, Ready and Age.
- **Cluster Secret Stores** (`css`) — the same, without Namespace.

Sync status comes from each resource's `Ready` condition and is rendered as a colored badge
(`success` / `error` / `warning`) with the controller's reason (`SecretSynced`,
`SecretSyncedError`, `Valid`, `ValidationFailed`, `Synced`, `Errored`, ...). When the CRD is
not installed in the cluster, the page shows a friendly "Not Available" message.

Each resource also gets a details panel in the drawer. An ExternalSecret shows its target
Secret and its store as links to their details, the creation and deletion policies, the
refresh policy and interval, the status with the message of a failed sync, the last sync time,
the synced resource version, the conditions, and its data mappings (`data` and `dataFrom`). A
ClusterExternalSecret adds the namespace selectors and the provisioned and failed namespaces;
a PushSecret its source Secret, its stores, its update and deletion policies and its `data`
and `dataTo` mappings.

The details of a core **Secret** that the operator manages gain an "External Secrets" panel
with a link back to the ExternalSecret that owns it, read from the Secret's owner reference and
managed label.

While the extension is enabled, the five kinds are left out of the Custom Resources tree of
the cluster sidebar, so each of them is listed once, under "External Secrets".

**Force Sync**: the `ExternalSecret` and `ClusterExternalSecret` menus gain a "Force Sync"
action, which writes a fresh timestamp to the `external-secrets.io/force-sync` annotation —
the same as `kubectl annotate es <name> force-sync=$(date +%s) --overwrite`. The controller
reconciles whenever the annotation changes, so the secret is refreshed immediately, and a
ClusterExternalSecret propagates it to the ExternalSecrets it manages. A notification confirms
the request. The stores and PushSecret do not support this action, so they have no menu item.

## Requirements

- Freelens 2.0 or newer (extension API v2). Freelens 1.x needs a 1.x release of the
  extension.
- A cluster with the External Secrets Operator installed (`external-secrets.io/v1`).

## Installation

Open Freelens and go to Extensions (`ctrl`+`shift`+`E` or `cmd`+`shift`+`E`). The field at
the top takes a package name, the URL of a tarball, or the path to a tarball or a directory.

### From the registry

Enter `freelens-eso-extension` and press Install. Freelens resolves the package from the npm
registry, exactly like the official extensions. Enable it, and the "External Secrets" sidebar
group appears on every cluster.

### From a release tarball

Each [release](https://github.com/nidiodolfini/freelens-eso-extension/releases) has the
extension as `freelens-eso-extension-<version>.tgz`. Use a release whose major version
matches your Freelens version. Enter the URL of the `.tgz` asset and press Install, or
download it and enter its path.

### From a directory

Build the extension (see below), then enter the path to your checkout, the directory with
`package.json`, and press Install. Freelens runs the extension from that directory, from the
files in `dist/`, and lists it as unverified. This is how you work on the extension: see
[Development loop](#development-loop).

## Usage

1. Apply the example objects to a cluster with ESO installed:

   ```powershell
   kubectl apply -f examples/eso/secretstore.yaml
   kubectl apply -f examples/eso/clustersecretstore.yaml
   kubectl apply -f examples/eso/externalsecret.yaml
   kubectl apply -f examples/eso/clusterexternalsecret.yaml
   kubectl apply -f examples/eso/pushsecret.yaml
   ```

   These use ESO's `fake` provider, which serves the pair `/hello -> world` without touching
   any real secret backend; the ExternalSecret creates a Secret named `hello-world` with the
   key `hello`, the ClusterExternalSecret creates an ExternalSecret `hello-everywhere` in the
   `default` namespace, and the PushSecret pushes the `hello-world` Secret back into
   `fake-store`.

2. Open the cluster in Freelens. The pages list `fake-store`, `fake-cluster-store`,
   `hello-world` and `hello-everywhere`; the ExternalSecret details panel shows
   `Ready=SecretSynced` after the first sync, and the details of the `hello-world` Secret link
   back to it.

3. Open the `hello-world` menu and click **Force Sync**; the "Last Sync" column updates
   within seconds as the controller reconciles.

## Development

Node.js 24 (`.nvmrc`, `mise.toml`) and pnpm 12 through corepack (`packageManager` in
`package.json`) are required.

```powershell
pnpm install
pnpm type:check     # main, renderer, tests, tooling and environment tests, one program each
pnpm test:unit      # vitest
pnpm build          # vite build (renderer) and vite build --mode main -> dist/
pnpm dev            # both builds in watch mode, for a directory install
pnpm biome:fix      # formatting/lint (TypeScript, TSX, JSON, CSS, SCSS, HTML, YAML, Markdown)
pnpm biome:check
pnpm knip:check     # unused files and dependencies (downloads knip via pnpm dlx)
pnpm trunk:check    # TOML, shell, workflows, yamllint, and Biome again
pnpm pack:dev       # bump prerelease + build + .tgz to install in Freelens
pnpm clean          # remove dist/
```

Neither `pnpm build` nor `pnpm dev` type-checks; run `pnpm type:check` for that.

### Development loop

Install the extension from your checkout once, as described in
[From a directory](#from-a-directory), then run:

```powershell
pnpm dev
```

It rebuilds the extension whenever a source file changes, and Freelens reloads the
extension after each rebuild, without a restart and without packing. Stop it with
`ctrl`+`C`. A change to `main` or `renderer` in `package.json` needs Freelens restarted once.

## Project structure

```text
vite.config.mjs                                  # Vite config: renderer (vite build) and main (--mode main)
build/vite-plugin-host-modules.mjs               # plugin: react/mobx/... -> globalThis.FreelensExtensionApi
build/vite-plugin-standard-decorators.mjs        # plugin: lowers standard decorators with esbuild
build/vite-plugin-css-module-declarations.mjs    # plugin: writes the *.module.d.scss.ts declarations
tsconfig.base.json                               # compiler options shared by every program
environment-tests/                               # probes that keep Node out of the renderer and the DOM out of main
src/
  main/index.ts                                  # main entry (stateless)
  renderer/index.tsx                             # registrations: 5 pages, details, menu, customResources
  renderer/api/types.ts                          # ESO spec/status types
  renderer/api/store-helpers.ts                  # condition helpers and formatters shared by the models and panels
  renderer/api/links.ts                          # selfLinks of objects and stores, for the links in the panels
  renderer/api/secret-owner.ts                   # the ExternalSecret that owns a Secret, from its metadata
  renderer/api/externalsecret/externalsecret-v1.ts   # ExternalSecret model (+ Api/Store, test)
  renderer/api/clusterexternalsecret/clusterexternalsecret-v1.ts # ClusterExternalSecret model (+ Api/Store, test)
  renderer/api/pushsecret/pushsecret-v1alpha1.ts     # PushSecret model (+ Api/Store, test)
  renderer/api/secretstore/secretstore-v1.ts         # SecretStore model (+ Api/Store, test)
  renderer/api/clustersecretstore/clustersecretstore-v1.ts # ClusterSecretStore model (+ Api/Store, test)
  renderer/pages/                                # 5 pages + CSS module
  renderer/details/                              # one panel per kind, StoreDetails for both stores, the Secret panel
  renderer/menus/                                # Force Sync (ExternalSecret and ClusterExternalSecret)
  renderer/icons/                                # External Secrets Operator logo (currentColor)
  renderer/components/                           # createAvailableVersionPage, error boundaries
  common/                                        # code both entries would share (none today; its tsconfig stays)
test/freelens-extensions.ts                      # runtime stub of @freelensapp/extensions for Vitest
examples/eso/                                    # test objects (kubectl apply -f)
docs/eso-api.md                                  # ESO API notes the types follow
AGENTS.md                                        # guide for coding agents
```

Build output goes to `dist/main.js`, `dist/renderer.js` and `dist/renderer.css`, with source
maps; `package.json` points `main`/`renderer` at the two entries, and Freelens links the
stylesheet next to the renderer entry.

## Supported API versions

The extension supports **`external-secrets.io/v1`** for ExternalSecret, ClusterExternalSecret,
SecretStore and ClusterSecretStore, and **`external-secrets.io/v1alpha1`** for PushSecret, the
only version its CRD serves (one version per kind, with the "Not Available" page when the CRD
is missing). `v1beta1` has been unserved since ESO 0.9 (2023); to add it later, follow the
same per-version model/page/details pattern and list both versions in
`createAvailableVersionPage`, newest first.

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
