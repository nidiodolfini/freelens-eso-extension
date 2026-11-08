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
`SecretSyncedError`, `Valid`, `ValidationFailed`, `Synced`, `Errored`, ...). Last Sync shows
the time since the last sync, as `kubectl get` does, with the date in its tooltip. When the CRD
is not installed in the cluster, the page shows a friendly "Not Available" message.

The columns of every list can be resized, and hidden from the menu at the right of the
header, which keeps a list readable in a narrow window; a cut value shows whole in its tooltip.

Each resource also gets a details panel in the drawer, next to Freelens's own details of a
custom resource, which already show the columns of the CRD and the conditions; the panel shows
what they leave out. An ExternalSecret shows its target Secret and its store as links to their
details, the creation and deletion policies, the refresh policy, the message of a failed sync,
the synced resource version, and its data mappings (`data` and `dataFrom`). A
ClusterExternalSecret shows the ExternalSecrets it creates, its store, the namespace selectors
and the provisioned and failed namespaces; a PushSecret its source Secret and its stores as
links, its update and deletion policies and its `data` and `dataTo` mappings; a store its
provider, controller, retry settings and the message of a failed validation.

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
the request, or shows why it failed, such as a missing permission to patch the object. The
stores and PushSecret do not support this action, so they have no menu item.

## Requirements

- Freelens 2.0 or newer (extension API v2). Freelens 1.x needs a 1.x release of the
  extension.
- A cluster with the External Secrets Operator 0.16 or newer, the first release that serves
  `external-secrets.io/v1` (see [Supported API versions](#supported-api-versions)).

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
pnpm type:check     # main, renderer, tests, tooling, integration and environment tests, one program each
pnpm test:unit      # vitest
pnpm test:integration # against Freelens dev and a kind cluster, see "Integration tests"
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

### Integration tests

The integration tests drive Freelens dev, started from a
[freelensapp/freelens](https://github.com/freelensapp/freelens) checkout, against a
[kind](https://kind.sigs.k8s.io/) cluster, as those of the Freelens example extension do. In
the Freelens checkout:

```sh
pnpm dev
```

Freelens dev lists no cluster until a kubeconfig is added in Preferences > Kubernetes >
Kubeconfig Syncs. Add one with the kind cluster alone, for example:

```sh
kubectl config view --minify --flatten --context kind-kind > ~/kind-kind.kubeconfig
```

Then, with the kind cluster running, in this repository:

```sh
pnpm build
pnpm test:integration
```

The tests install the checkout in place, replacing any other installation of the extension in
Freelens dev. They apply the CRDs of ExternalSecret, ClusterExternalSecret, PushSecret,
SecretStore and ClusterSecretStore from the ESO release, without the controller, and delete
them at the end, and with them every object of those kinds: use a kind cluster with nothing
worth keeping, never one where ESO is in use. Every kubectl call names the kind context, so
the tests never act on the current context. Without Freelens dev or the cluster the tests are
skipped.

Optional variables:

- `TEST_KIND_CLUSTER_NAME`: the kind cluster, `kind` by default, used through the context
  `kind-<name>`.
- `TEST_ESO_VERSION`: the ESO release whose CRDs are applied, `v2.14.0` by default.
- `FREELENS_CDP_URL`: the CDP endpoint of Freelens dev, `http://127.0.0.1:9223` by default.
- `FREELENS_MAIN_LOG`: a log of the main process to check for errors, such as its `lens.log`.
  Without it only the renderer's errors are checked.

## Project structure

```text
vite.config.mjs                                  # Vite config: renderer (vite build) and main (--mode main)
build/vite-plugin-host-modules.mjs               # plugin: react/mobx/... -> globalThis.FreelensExtensionApi
build/vite-plugin-standard-decorators.mjs        # plugin: lowers standard decorators with esbuild
build/vite-plugin-css-module-declarations.mjs    # plugin: writes the *.module.d.scss.ts declarations
tsconfig.base.json                               # compiler options shared by every program
environment-tests/                               # probes that keep Node out of the renderer and the DOM out of main
integration/                                     # integration tests against Freelens dev, and their test objects
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
only version its CRD serves, one version per kind.

ESO 0.16 (April 2025) introduced `v1` for those four kinds, with the same schema as `v1beta1`,
and ESO 0.17 (May 2025) stopped serving `v1beta1`. An older ESO serves `v1beta1` only: there
the pages of the four kinds show "Not Available", and the kinds are still left out of the
Custom Resources tree, because Freelens matches them by group and plural, not by version.
Upgrade ESO to 0.16 or newer; until then, the command palette still opens Freelens's own list
of each kind.

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
