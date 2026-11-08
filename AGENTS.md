# AGENTS.md

This file provides guidance to coding agents when working with code in this repository.

> **Tip**: If you find yourself correcting the agent during interactive work, suggest adding a new rule to this file so the lesson is captured for future sessions.

## Project Overview

A Freelens extension for the External Secrets Operator (ESO): a list page and
a details panel for five kinds, ExternalSecret, ClusterExternalSecret,
SecretStore and ClusterSecretStore of `external-secrets.io/v1` and PushSecret
of `external-secrets.io/v1alpha1`; a Force Sync menu item for ExternalSecret
and ClusterExternalSecret; and a panel in the details of a core Secret the
operator manages, with a link to its ExternalSecret.

- **Language**: TypeScript 7.x
- **Runtime**: Freelens >= 2.0.0 (extension API v2, `engines.freelens: ^2.0.0`).
  The host provides React 19, mobx 7 and mobx-react 10 at runtime.
- **Toolchain**: Node.js 24 (`mise.toml`, `.nvmrc`) and pnpm 12 through
  corepack (`packageManager`)
- **Build**: Vite 8 (Rolldown), ES module bundles in `dist/`, with the layout
  of freelensapp/freelens-example-extension, the reference template of a v2
  extension
- **License**: MIT

Library and tool versions follow the Freelens stack exactly: the catalog in
Freelens's `pnpm-workspace.yaml` for libraries, the root `package.json` scripts
of Freelens for tools run with `pnpm dlx` (Biome, knip, Trunk launcher), and
Freelens's `mise.toml` and `.nvmrc` for Node and the other mise tools.
Renovate keeps them there, through the custom datasources in
`.renovaterc.json`, in one `Freelens dependencies` group PR together with a
release of `@freelensapp/extensions`. `@freelensapp/extensions` is pinned to
one exact version. The libraries the host provides at runtime (`react`,
`react-dom`, `mobx`, `mobx-react`) and their types are devDependencies only,
for compiling and testing; the build maps the imports onto the host's copies
("Build"). `electron` is a devDependency for its types only, with its install
script off in `pnpm-workspace.yaml`, so the Electron binary is never
downloaded. Freelens installs no dependency of an extension: whatever the code
needs at runtime and the host does not provide has to be in the bundle.

pnpm settings live in `pnpm-workspace.yaml`: `allowBuilds` for the
dependencies with install scripts (a new one must be listed there with `true`
or `false`, or `pnpm install` fails), the default `minimumReleaseAge` of one
day, with `@freelensapp/extensions` and the exact Electron version Freelens
let in early excluded, and `strictPeerDependencies`, which fails the install
when a copy of a shared library is outside the peer range that
`@freelensapp/extensions` declares for it.

## Common Commands

```bash
# Type checking
pnpm type:check                # All of the programs below, in this order
pnpm type:check:sources        # main and renderer, each with src/common/
pnpm type:check:tests          # Tests and test support
pnpm type:check:tooling        # Vite and Vitest configs, build plugins
pnpm type:check:integration    # Integration tests
pnpm type:check:environments   # Environment tests

# Linting & formatting
pnpm biome:check          # TypeScript/TSX, JS, JSON, CSS, SCSS, HTML, YAML, Markdown (biome)
pnpm biome:fix            # Auto-fix the formats above
pnpm trunk:check          # TOML, shell, workflows, yamllint, and Biome again (changed files)
pnpm trunk:fix            # Auto-fix TOML, shell, and the Biome formats
pnpm lint:check           # Alias for biome:check
pnpm lint:fix             # Alias for biome:fix
pnpm knip:check           # Unused files, unused and unlisted dependencies (knip)

# Tests
pnpm test:unit            # vitest
pnpm test:integration     # vitest, against Freelens dev with a kind cluster ("Integration tests")

# Build
pnpm build                # Both Vite runs, without the type check
pnpm dev                  # Both Vite runs in watch mode, for a directory install

# Pack for testing
pnpm pack:dev             # Bump prerelease version, build, and create .tgz for install in Freelens app

# Clean
pnpm clean                # Clean dist/
pnpm clean:dts            # Remove generated *.d.scss.ts files
pnpm clean:all            # Clean everything (dist, dts, node_modules, tgz)
```

## Architecture

```text
src/
  main/index.ts                      # Main entry (Main.LensExtension), stateless
  renderer/index.tsx                 # Renderer entry: pages, details panels, menu items, customResources
  renderer/api/types.ts              # ESO spec and status types
  renderer/api/store-helpers.ts      # Condition helpers and formatters shared by the models and the details panels
  renderer/api/links.ts              # selfLinks of objects and of the store an object refers to, for the panels' links
  renderer/api/secret-owner.ts       # The ExternalSecret that owns a Secret, from its owner reference and label
  renderer/api/<kind>/<kind>-<version>.ts # Model, KubeApi and KubeObjectStore of a kind, with its tests
  renderer/pages/                    # One list page per kind, and their CSS module
  renderer/details/                  # One panel per kind, StoreDetails for both store kinds, SecretEsoDetails on the host's Secret
  renderer/menus/                    # ForceSyncMenuItem, for ExternalSecret and ClusterExternalSecret
  renderer/components/               # createAvailableVersionPage, ErrorBoundary and its wrappers, ErrorPage
  renderer/icons/                    # The SVG icon, imported with ?raw, and its component
  renderer/vars.scss                 # SCSS variables
  common/                            # Code both entries would import; empty today, its tsconfig.json stays
test/freelens-extensions.ts          # Runtime stub of @freelensapp/extensions for Vitest
environment-tests/                   # Probes for the per-environment programs
integration/__tests__/               # Integration tests, run against Freelens dev over CDP, and their shared module
integration/fixtures/                # Test objects of the integration tests
build/                               # Vite plugins: host modules, standard decorators, CSS module declarations
vite.config.mjs                      # The build, renderer and main
docs/eso-api.md                      # The ESO API from the controller's Go types, which types.ts follows
examples/eso/                        # Test objects on the fake provider (kubectl apply -f)
```

Build output goes to `dist/`: `main.js`, `renderer.js` and `renderer.css`, with
source maps. `main` and `renderer` in `package.json` point at the two entries.

## CRD KubeObject Pattern

A model is a subclass of `Renderer.K8sApi.LensExtensionKubeObject`, one file
per kind and version: `src/renderer/api/externalsecret/externalsecret-v1.ts`,
`clusterexternalsecret/clusterexternalsecret-v1.ts`,
`pushsecret/pushsecret-v1alpha1.ts`, `secretstore/secretstore-v1.ts` and
`clustersecretstore/clustersecretstore-v1.ts`. The four `v1` models also serve
`external-secrets.io/v1beta1`, which an ESO older than 0.16 serves in place of
`v1`, with the same schema ("Adding a kind or a version").

The host reads the model's metadata from the class, through `static readonly`
properties. The objects it hands to the extension, in a list, a details panel
or a menu item, come from the host's store for the resource: they are
instances of the host's `KubeObject`, not of the subclass. The methods of
`KubeObject` itself are there (`getName()`, `getNs()`,
`getCreationTimestamp()`, `getSearchFields()`), a method the subclass defines
is not, and calling it throws. So:

- **Metadata**: `static readonly` `kind`, `namespaced`, `apiBase` and `crd`,
  an `EsoKubeObjectCRD`: the host's `LensExtensionKubeObjectCRD` plus the
  `title` of the page.
- **Instance type**: `declare kind` and `declare apiVersion`, with the kind and
  the version as literals, a union of the versions of a model that serves more
  than one, as the host's documentation of the class has it. Two versions of a
  kind usually differ only in optional fields, so without the literals their
  classes are assignable to each other, and `detailsFor` and `menuItemFor`
  accept a component written for the other version ("Renderer Components").
  `declare` emits nothing, so the runtime object is the host's as before.
- **Per-object logic**: a `static` method that takes the object, such as
  `ExternalSecret.getReady(object)`. The Ready condition logic is in
  `store-helpers.ts`; the statics delegate to it with the default texts of
  their kind (`Ready`/`Not Ready` for an ExternalSecret, `Valid`/`Invalid` for
  a store), and the details panels call the helpers directly.
- **Fields**: `object.spec` and `object.status`, typed by the kind's spec and
  status interfaces in `types.ts`.
- **Forbidden**: instance methods on the subclass; a fallback such as
  `typeof (object as any).getReady === "function" ? ...`, which always takes
  the fallback; `as any`.

```typescript
export class SecretStore extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  SecretStoreStatus,
  SecretStoreSpec
> {
  declare kind: "SecretStore";
  declare apiVersion: "external-secrets.io/v1" | "external-secrets.io/v1beta1";

  static readonly kind = "SecretStore";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/external-secrets.io/v1/secretstores";

  static readonly crd: EsoKubeObjectCRD = {
    apiVersions: ["external-secrets.io/v1", "external-secrets.io/v1beta1"],
    plural: "secretstores",
    singular: "secretstore",
    shortNames: ["ss"],
    title: "Secret Stores",
  };

  static getReady(object: SecretStore): boolean | undefined {
    return getReady(object.status?.conditions);
  }
}

export class SecretStoreApi extends Renderer.K8sApi.KubeApi<SecretStore> {}
export class SecretStoreStore extends Renderer.K8sApi.KubeObjectStore<SecretStore, SecretStoreApi> {}
```

The file also exports a `KubeApi` and a `KubeObjectStore` subclass. The list
page uses the `KubeApi` type for `KubeObjectListLayout`; neither is
instantiated, because the store comes from the host. The host registers an
API, and with it a store, for every version of a CRD the cluster serves, and
`SecretStore.getStore<SecretStore>()` returns the one for the first entry of
`crd.apiVersions` that is served; it throws when none is. The pages and the
menu item call it while they render, which happens in a cluster frame only.

`createAvailableVersionPage` decides whether a kind is served with
`kubeObjectClass.getStore()` and renders a "Not Available" page otherwise.
The page it returns is an `observer`: `getStore()` reads the host's observable
API registry, and the host registers a CRD's APIs after the cluster frame has
loaded the CRDs, so a page opened before that renders again when the kind is
served. Freelens restores the last page when a cluster is opened, so this
happens often. `src/renderer/components/available-version.test.tsx` checks it
with a spy on `getStore` that reads an observable.

`customResources` in `src/renderer/index.tsx` lists the five model classes.
The host reads the group and plural from each class's `crd`, and while the
extension is enabled it leaves the resources out of the Custom Resources tree
of the cluster sidebar, where they would otherwise be listed a second time
under `external-secrets.io`. Their definitions stay in the Definitions list,
and the host's own list and details stay reachable by URL and from the command
palette. A model the extension only decorates, with a details panel or a menu
item and no page of its own, stays out of the field: registered, it would leave
the tree with nothing in its place.

### Types

The types in `src/renderer/api/types.ts` follow the ESO controller's Go types,
read from its sources at the release that serves the version (`docs/eso-api.md`
has the mapping and the sources), not from memory:

- Every Go struct has a TypeScript interface of the same name, with the same
  fields under their `json` names.
- A field is optional when the CRD does not require it. `controller-gen`
  decides that from the `+required` and `+optional` markers, not from the
  `json` tag; the generated CRD settles any doubt.
- Every `+kubebuilder:validation:Enum` is a string-literal union type alias.
- `spec.provider` of the stores is an open record: the controller requires
  exactly one of 40+ backends, each with its own shape.
- A condition is `Renderer.K8sApi.BaseKubeObjectCondition`. The whole of the
  host's kube-object package is re-exported from `K8sApi`; nothing is imported
  from another `@freelensapp/*` package, which are private in v2.

### Adding a kind or a version

1. **The types** in `types.ts`, as above. A new version of a kind starts as a
   copy of the newest version's files; the diff of the Go types between the two
   releases says what changes. A version with the same schema as one a model
   already serves, as `v1beta1` is to `v1` (ESO 0.16 made `v1` a copy of it),
   gets no files: it joins the model's `crd.apiVersions`, after the newer
   version, which the host tries first, and its `declare apiVersion` union, and
   the integration matrix gets a release that serves only it.
2. **The model**, `src/renderer/api/<kind>/<kind>-<version>.ts`, with the
   `declare kind` and `declare apiVersion` literals, its `KubeApi` and its
   `KubeObjectStore`.
3. **The list page** in `src/renderer/pages/`, a configurable list with an `id`
   on every column ("Renderer Components"), passed through
   `createAvailableVersionPage` (newest version first when a kind has more than
   one) and registered in `clusterPages` and `clusterPageMenus`.
4. **The details panel** in `src/renderer/details/`, with none of the items the
   host's details already show ("Renderer Components"), registered in
   `kubeObjectDetailItems` with `Renderer.K8sApi.detailsFor` and the model
   class.
5. **Menu items** in `src/renderer/menus/`, registered in `kubeObjectMenuItems`
   with `Renderer.K8sApi.menuItemFor` and the model class, only for what the
   resource supports: Force Sync writes the `external-secrets.io/force-sync`
   annotation, which the ESO controller reconciles on for ExternalSecret and
   ClusterExternalSecret, and not for the stores or PushSecret
   (`docs/eso-api.md`, section 4.2).
6. **`customResources`**: the model class of every version that has a page.
7. **Tests** for the static helpers, next to the model, and the kind's cases in
   `src/renderer/pages/pages.test.tsx` and
   `src/renderer/details/details.test.tsx`, with the printer columns of its CRD
   in `hostItems`; a member of the host that a test reaches goes into the stub,
   as small as the test needs.
8. **A test object** in `examples/eso/`, and its row in `README.md`.
9. **The integration tests**: the plural of the kind in `crdPlurals` of
   `integration/__tests__/extension-helpers.ts`, a test object named `test` in
   `integration/fixtures/`, and the kind's entry in `kindViews` of
   `integration/__tests__/eso.tests.ts` ("Integration tests").

Then check the result in Freelens with the checkout installed from its
directory (`README.md`, "Development loop"): the page lists the test object,
the details show every field, the menu item works, and the resource is gone
from the Custom Resources tree.

## Renderer Components

- Pages and details panels are `observer` components from `mobx-react`, which
  the build maps to the host's copy.
- Every page, details panel and menu item renders inside an `ErrorBoundary`
  from `src/renderer/components/error-boundary.tsx`, a class component of the
  host's React. It logs what its children throw with `extension.name` and the
  component stack, and renders `ErrorPage` in place of a page or a details
  panel, and nothing in place of a menu item. A details panel or menu item
  renders again when the host passes a new `object`, the boundary's reset key.
  - The boundary is applied where the registrations are made: `clusterPages`,
    `kubeObjectDetailItems` and `kubeObjectMenuItems` are mapped through
    `withPageErrorBoundary`, `withDetailsErrorBoundary` and
    `withMenuItemErrorBoundary`, each taking `this` and a registration, so an
    entry added to a field is wrapped too. Each field is annotated with its type
    from `Renderer.LensExtension`, because the mapping refers to `this`, and
    its type would otherwise depend on itself.
  - The wrappers take the registration that `Renderer.K8sApi.detailsFor` and
    `menuItemFor` built, so the helpers check each component against its model
    first, with no cast.
  - A `try`/`catch` around the call of a component is not enough: a child
    throws when React renders it, and a callback such as `renderTableContents`
    of `KubeObjectListLayout` throws from the host's render. Such an error goes
    up to the host's boundary, which replaces the main area for a page and the
    whole cluster frame for a details panel or a menu item.
- The `kubeObjectDetailItems` and `kubeObjectMenuItems` registrations are made
  by `Renderer.K8sApi.detailsFor(ExternalSecret, { priority: 10, Details })`
  and `Renderer.K8sApi.menuItemFor(ExternalSecret, { MenuItem })`, not written
  out with `kind` and `apiVersions`. The helper takes both from the model class
  and types the props of `Details` and `MenuItem` from it, so a component
  written for another model fails the type check. The check is structural: it
  tells two kinds or versions apart by the `declare kind` and
  `declare apiVersion` literals of each model ("CRD KubeObject Pattern").
- The components are registered as they are, `Details: ExternalSecretDetails`
  and `MenuItem: ForceSyncMenuItem`. Their props are
  `Renderer.Component.KubeObjectDetailsProps<Model>` and
  `Common.Types.KubeObjectMenuItemProps<Model>`: the concrete model class, never
  `any`, and only what the host passes. A menu item does not extend
  `Renderer.Component.KubeObjectMenuProps`, the props of the host's whole
  `KubeObjectMenu`. A component may take the union of the models it serves:
  `StoreDetails` serves both store kinds, and `ForceSyncMenuItem` serves
  ExternalSecret and ClusterExternalSecret, picking the store to patch by the
  `kind` of the object, a literal on each model.
- A details panel shows only what the host's details leave out. Next to it,
  for every kind with a CRD, the host renders its own details of a custom
  resource: the printer columns of the CRD, without Age, under the names that
  `startCase` gives them, and the conditions, whose reason and message are only
  in a tooltip. So a panel shows no printer column and no conditions again;
  it shows the fields the columns leave out, the references as links, and the
  message of the Ready condition. A link to an object whose name is a printer
  column is named after the spec field, such as Secret Store Ref, so that it
  is not read as the column a second time. `hostItems` in
  `src/renderer/details/details.test.tsx` has the printer columns of every kind,
  and the test fails on a panel item among them.
- A list page is a configurable list (`isConfigurable`) whose every column has
  an `id`, the key of its sorting callback, as the host's own lists, such as
  Jobs, have it: the host makes a column with an id resizable, keeps its width
  per `tableId`, and lets the user hide it from the menu of the list, which is
  how a narrow window stays readable. A text cell is in `WithTooltip`, which
  shows a cut value whole, and a time is shown as `kubectl get` prints a date
  column, the time since it, by `LastSync` in `src/renderer/pages/last-sync.tsx`.
  `src/renderer/pages/pages.test.tsx` checks the columns of every page, their
  ids, and a cell for every column; the stub's `KubeObjectListLayout` is a mock,
  so that the test reads the props a page passes.
- A menu item that patches an object catches the patch: it runs in `onClick`,
  where an error reaches no error boundary, so a failed patch, such as a 403
  for a user without the RBAC to patch the object, is shown with
  `Notifications.error`, naming the action, the kind and the object, and the
  promise never rejects.
- `SecretEsoDetails` is registered with `detailsFor(Renderer.K8sApi.Secret, ...)`,
  on a built-in kind of the host, whose `apiVersions` the helper reads from
  `apiBase`. It reads the owner reference and the managed label of the Secret
  itself (`src/renderer/api/secret-owner.ts`), so it needs no store, and it
  renders nothing for a Secret the operator does not manage.
- A link to another object is `Renderer.Component.MaybeLink` with
  `Renderer.Navigation.getMaybeDetailsUrl(selfLink)`, and the selfLink comes
  from `selfLinkOf` or `storeSelfLink` in `src/renderer/api/links.ts`, built
  from the `apiBase` of the API the host registered for the kind (`getApi()`),
  so that it names the version the cluster serves, which the drawer needs to
  find the object, or from the static `apiBase` when there is no such API, as
  for the host's Secret. An empty selfLink renders the text without a link,
  as for a SecretStore referred to from a cluster-scoped object, which lives in
  each target namespace. Nothing loads another store for a link: the drawer
  resolves the object when it opens.
- The host renders a cluster page with `params` only. A page that needs the
  extension gets it from the registration
  (`Page: () => <ExternalSecretsPageAvailable extension={this} />`), with the
  page component created once, outside the registration. `PageComponents.Page`
  is typed with the props the host passes, so the type check rejects a page
  that requires another prop; it does not reject one that declares another
  prop as optional, which is then `undefined`.
- **CSS**: a component imports its CSS module for the class names only, with no
  `?inline` import and no `<style>` tag; the rules reach the page through
  `dist/renderer.css`, which the host links next to the renderer entry ("CSS"
  under "Build"). CSS modules use `camelCaseOnly` class names; SCSS variables
  are in `src/renderer/vars.scss`, used with `@use "../vars"`.
- SCSS modules get TypeScript declarations (`*.module.d.scss.ts`), written by
  `build/vite-plugin-css-module-declarations.mjs` during the renderer build,
  without a key for a class inside `:global(...)`. They are committed, because
  `pnpm type:check` and `type-check.yaml` run without a build, and
  `allowArbitraryExtensions` in the renderer's `tsconfig.json` makes the import
  resolve to them, so a class name the stylesheet lacks fails the check. Commit
  the regenerated file with a change to its SCSS module; `pnpm clean:dts`
  removes them.
- Icons are SVG files imported with `?raw` and rendered by
  `Renderer.Component.Icon` through its `svg` prop. Biome leaves `.svg` files
  alone (`biome.jsonc`), so the icon stays minified.

## Rules That Fail Silently

Each of these compiles when it is broken, and breaks the extension at runtime
or not visibly at all.

- **The host's React and mobx, one copy each.** Import `react`, `react-dom`,
  `mobx` and `mobx-react` by their bare module ids;
  `build/vite-plugin-host-modules.mjs` maps them onto
  `globalThis.FreelensExtensionApi`. A second React throws
  `invalid hook call`; a second mobx throws nothing, and the host never reacts
  to its observables. The build fails on the ways a second copy gets in
  ("Modules provided by the host").
- **Standard decorators.** The code has none today. One that is added is a
  standard decorator: an observable field is `@observable accessor`, and the
  class does not call `makeObservable(this)`. Without `accessor` the
  production build of mobx leaves the field unobservable ("Decorators").
- **No Node or Electron in renderer and common code.** They are `undefined` in
  the renderer. The build fails on an import, `pnpm type:check` on a global
  such as `process` or `Buffer` ("Process-specific settings").
- **One CSS asset, `dist/renderer.css`.** Any other name, or a second asset,
  leaves the extension unstyled. Nothing checks it; look at `dist/` after a
  change to the CSS setup ("CSS").
- **One tsconfig per environment.** Each program has only its runtime's `lib`
  and `types`, and no declaration may load Node into the renderer or the DOM
  into main; otherwise a wrong API type-checks and is `undefined` at runtime.
  The environment tests fail on a leak ("TypeScript").
- **No instance method on a KubeObject subclass.** The objects from the host do
  not have it, and the call throws. Nothing checks it ("CRD KubeObject
  Pattern").
- **A component that chooses what to render through `getStore()` is an
  `observer`.** Otherwise a page opened before the cluster frame has loaded
  the CRDs shows the kind as not installed until the user navigates away and
  back. Only a test whose `getStore` reads an observable shows it ("CRD
  KubeObject Pattern").
- **Function components, or `this.props` only in `render()`.** Under
  mobx-react 10, the props of an `@observer` class component are not
  observable, and a `@computed` getter or a `KubeObjectListLayout` callback
  that reads them throws
  `[mobx-react] Cannot read "X.props" in a reactive context` when the page
  renders, and the host shows its "App crash" page. The pages and panels here
  are function components; keep it that way, or read the props in `render()`
  and hand them to the callbacks.
- **A memo over a store's items is keyed on something that changes with
  them.** The host keeps one observable array per store and updates it in
  place, so `store.items` stays the same array while the objects change. An
  `observer` that reads the items while it renders follows them; a `useMemo`
  keyed on the array is computed once.
- **Every page, details panel and menu item inside an error boundary**
  ("Renderer Components").
- **A menu item catches what it patches.** An error of `onClick` reaches no
  error boundary: an uncaught failed patch is an unhandled rejection, and the
  user sees nothing ("Renderer Components").
- **A cluster page gets the extension from its registration.** The host passes
  `params` only ("Renderer Components").
- **An ESM `main`, and the entries in `package.json` unchanged while
  `pnpm dev` runs.** The host refuses to reload a CommonJS main and logs why,
  and it watches only the entries it started with, so a manifest change needs
  Freelens restarted.
- **The testing helpers of React stay out of the extension's code.** `act`,
  `react-dom/test-utils` and `@testing-library/*` work in the unit tests, which
  run the development build of React, and throw in the host, which runs the
  production build. Biome's `noRestrictedImports` rejects them outside the
  tests.

Neither `pnpm build` nor `pnpm dev` runs the type check, so a Node global in
renderer code passes them; `pnpm type:check` and `type-check.yaml` catch it.

## Build

`vite.config.mjs` builds one entry point per run, in library mode, as ESM:
`vite build` builds the renderer and empties `dist/`, and `vite build --mode
main` builds main next to it. The two runs share no chunk; each bundle carries
its own copy of the `src/common/` code it imports. Nothing is minified.

`pnpm dev` runs the same two builds in watch mode, side by side, for a
directory install: the host reloads the extension when either entry is
rewritten. Its renderer run passes `--no-emptyOutDir`, because in watch mode
Vite empties the output directory again before every rebuild, which would
delete `dist/main.js`.

### Modules provided by the host

The host publishes its singletons on `globalThis.FreelensExtensionApi`, and
each process publishes only the ones it has (contract C3 of the Freelens
extension API, `docs/extensions/api.md` in freelensapp/freelens):

| Module id           | Global            | Published in |
| ------------------- | ----------------- | ------------ |
| `react`             | `React`           | renderer     |
| `react-dom`         | `ReactDom`        | renderer     |
| `react/jsx-runtime` | `ReactJsxRuntime` | renderer     |
| `mobx`              | `Mobx`            | both         |
| `mobx-react`        | `MobxReact`       | renderer     |
| `monaco-editor`     | `MonacoEditor`    | renderer     |

`build/vite-plugin-host-modules.mjs` replaces a bare import of one of these
with a module that reads the global, in the extension's code and in every
library it bundles. Its named exports are the members of the copy installed as
a devDependency, which is pinned to the host's version, so an import of a name
the host's version lacks fails the build. The plugin also fails the build on an
import of a host module that the process does not publish (`react` in main),
and on a subpath of a host package that the host does not publish
(`react-dom/client`).

Everything else is bundled. That includes `@freelensapp/extensions`, a shim of
three lines that reads `Common`, `Main` and `Renderer` off the same global; it
must not be mapped.

### Process-specific settings

- **Renderer**: nothing is external. An import of a Node builtin or of
  `electron` fails the build (Vite would otherwise replace it with an empty
  module and only warn). `process.env.NODE_ENV` is replaced at build time,
  because library mode leaves it for a consumer's bundler and the page has no
  `process`.
- **Main**: Node builtins (`node:*` and bare) and `electron` stay external.
  Bundled packages resolve with Vite's server conditions, so main gets their
  Node builds. Main is built for Rolldown's `node` platform, so that a bundled
  CommonJS package can `require()` the builtins, and `__dirname` and
  `__filename` are defined as `import.meta.dirname` and `import.meta.filename`.
  The main entry here bundles nothing of the kind, so it is the same on both
  platforms; the settings stay for whatever is added.

### Decorators

MobX 7 supports standard decorators only, and Oxc, which transpiles TypeScript
for Vite, passes them through unlowered, while neither Node nor Chromium runs
them yet. `build/vite-plugin-standard-decorators.mjs`, copied from Freelens,
hands every module with a decorator to esbuild first, which lowers the
decorators and their `accessor` fields. Both `vite.config.mjs` and
`vitest.config.ts` use it. The code has no decorator today; the plugin stays
so that one that is added works.

### CSS

The host links the stylesheet named after the renderer entry, `renderer.css`
next to `renderer.js`. Library mode extracts the CSS of the whole bundle into
that one file (`build.lib.cssFileName`). A build that emits more than one CSS
asset, or a differently named one, leaves the extension unstyled. A component
imports its CSS module for the class names only and renders no `<style>` tag.

### CSS module declarations

`build/vite-plugin-css-module-declarations.mjs` writes `x.module.d.scss.ts`
next to every `x.module.scss` the renderer build imports, in `vite build` and
in watch mode. It takes the class names from Vite's own `preprocessCSS`, with
the build's resolved config, so they are the names the bundle exports, after
`localsConvention`; a class inside `:global(...)` is not one of them. It
writes a declaration only when the content changed, through a temporary file
renamed over the declaration, so a failed or interrupted build cannot leave a
committed declaration truncated.

## TypeScript

Main code runs in Node, renderer code in a browser page, and common code in
both. Each is type-checked in a program of its own, so that an API the runtime
does not have fails `pnpm type:check` rather than the extension:

| Config                       | lib                       | types                             | Files                                                              |
| ---------------------------- | ------------------------- | --------------------------------- | ------------------------------------------------------------------ |
| `src/main/tsconfig.json`     | ES2024                    | `node`                            | `src/main/`, `src/common/`                                         |
| `src/renderer/tsconfig.json` | ES2024, DOM, DOM.Iterable | `vite/client`                     | `src/renderer/`, `src/common/`                                     |
| `src/common/tsconfig.json`   | ES2024, WebWorker         | none                              | `src/common/`                                                      |
| `src/tsconfig.json`          | ES2024, DOM, DOM.Iterable | `node`, `vite/client`             | `*.test.ts(x)` under `src/`, and `test/`                           |
| `integration/tsconfig.json`  | ES2024, DOM, DOM.Iterable | `node`, `@freelensapp/extensions` | `integration/`                                                     |
| `tsconfig.json`              | ES2024                    | `node`                            | `vite.config.mjs`, the Vitest configs, `svgo.config.mjs`, `build/` |

All of them extend `tsconfig.base.json`: `strict`, `moduleResolution: Bundler`,
`useDefineForClassFields`, `noUncheckedSideEffectImports` and `skipLibCheck`
among them. `skipLibCheck` is required: `extension-api.d.ts` is one declaration
for both processes and names DOM types and the `Electron` namespace, which no
single program has. Write `types` in every config; it decides which `@types`
packages a program sees.

The main and renderer configs both include `src/common/`. Compiled as main,
common code fails on the DOM; compiled as renderer, it fails on Node. What
passes both is valid in both. `src/common/` is empty today; its
`tsconfig.json` stays, because the editor uses it and the environment tests
extend it, and `tsc -p environment-tests` always has its probes to compile.

The split does not cover the API namespaces: `Main` and `Renderer` compile in
every program, and the one the process does not have is `undefined` at runtime.

The renderer program has `vite/client`, which declares the `*?raw` imports and
the CSS modules and brings no Node into the program. With
`allowArbitraryExtensions`, `import styles from "./x.module.scss"` resolves to
the generated `x.module.d.scss.ts` ("Renderer Components").

### Environment tests

`types` and `lib` alone do not keep an environment pure: a declaration file
with `/// <reference types="node" />` loads all of `@types/node` into any
program that reaches it. `environment-tests/` proves the split holds:

| File             | Compiled with          | Must                      |
| ---------------- | ---------------------- | ------------------------- |
| `node-apis.ts`   | renderer, common       | fail on every marked line |
| `dom-apis.ts`    | main, common           | fail on every marked line |
| `worker-apis.ts` | main                   | fail on every marked line |
| `shared-apis.ts` | main, renderer, common | pass                      |

Each line that must fail carries `// @ts-expect-error`, so a program that
starts accepting it fails with an unused directive. The configs there extend
the source configs and keep their `include`, so the probes are compiled
together with the sources and every declaration the sources reach. When a
declaration leaks, keep the leak out rather than relax a probe.

## Tests

Vitest (`vitest.config.ts`) runs the `*.test.ts(x)` files under `src/` in
Node, with jsdom for a file that starts with `// @vitest-environment jsdom`.
Its plugins are the ones of the build that the tests need: the standard
decorators and the React plugin for JSX. `src/tsconfig.json` type-checks the
tests with the DOM and Node; it sits in `src/` so that an editor finds it for a
test file, which the environment config next to the test excludes.

`@freelensapp/extensions` is aliased to `test/freelens-extensions.ts`: the
real package is a shim that reads `Common`, `Main` and `Renderer` off
`globalThis.FreelensExtensionApi`, which only the host sets, so it throws in a
test. The stub covers only what the tests use, at runtime; the type check uses
the real declaration. So a test that reaches a member the stub lacks compiles
and fails on `undefined`: add the member to the stub, as small as the test
needs. Its `LensExtensionKubeObject.getStore()` throws, as the host's does for
a version that is not served; a test that needs a store spies on `getStore` of
its class. The other host modules are not stubbed: `react`, `mobx` and
`mobx-react` resolve to the devDependencies, the host's versions.

Tests import what they use from `vitest`
(`import { describe, expect, it, vi } from "vitest"`); no tsconfig declares
the globals. `globals: true` stays on at runtime only, because React Testing
Library registers its automatic cleanup only when `afterEach` is a global.

### Integration tests

The integration tests follow the template, freelensapp/freelens-example-extension,
and the fluxcd extension. They run in this repository, under their own Vitest
(`vitest.integration.config.ts`, `pnpm test:integration`), against Freelens
started with `pnpm dev` from a freelensapp/freelens checkout, attached with
Playwright's `chromium.connectOverCDP` on the port that script opens, so they
need no package of Freelens. `integration-tests.yaml` builds the extension,
checks out Freelens at each release tag of its matrix (`v2.0.0`), each with
two ESO releases (`v2.14.0`, the one the types follow, and `v0.15.1`, the last
that serves only `external-secrets.io/v1beta1`), starts `pnpm dev` under
`xvfb-run` with a fresh profile seeded with a kubeconfig of a kind cluster,
and runs the tests. Every test file is a session of its own on
the one app, and fails on any error logged by either process.

- `extensions.tests.ts` uninstalls whatever installation of the extension the
  app has, such as the one from npm, and installs this checkout in place from
  the Extensions page.
- `eso.tests.ts` applies the CRDs of the five kinds of one ESO release,
  `TEST_ESO_VERSION` or the release the types follow, from the release's
  sources and without the controller, a test object of each kind
  (`integration/fixtures/`, written in `external-secrets.io/v1` and applied in
  the version the release serves, `esoApiVersion` of `extension-helpers.ts`),
  and the Secret of the ExternalSecret, with the managed label and an owner
  reference, as the controller would write it. The CRDs of the stores are
  larger than the annotation of a client-side apply, so they are applied
  server-side. The session opens every page through
  `Renderer.Navigation.navigate`, because the sidebar renders the group of the
  kinds collapsed, and checks for each kind that the list shows the test
  object, that the details show the extension's panel with the object in its
  API version and no error page, and the extension's menu items. It clicks
  Force Sync on the ExternalSecret and the ClusterExternalSecret and reads the
  annotation back with kubectl, and follows the links from the ExternalSecret
  to its store and to its Secret, and back.

Every kubectl call names the context of the kind cluster, `kind-<name>` with
`TEST_KIND_CLUSTER_NAME` (`kind` by default), so a run never acts on the current
context. A session deletes the namespace `integration-tests` and the five ESO
CRDs, and with them every object of those kinds on the cluster: run it only
against a kind cluster with nothing worth keeping, never one with ESO in use.
Outside CI a session skips with a warning when Freelens dev does not answer or
the cluster is not reachable; in CI the run fails instead. The other variables
are those of the template: `FREELENS_CDP_URL` and `FREELENS_MAIN_LOG`.

## Lint and CI

### Biome

`biome.jsonc` has the formatter, import groups and rules of Freelens. Biome
formats SCSS, YAML and Markdown too, as in Freelens, so Trunk runs no Prettier
or markdownlint; yamllint still checks YAML. Two overrides are specific to the
extension: `style/noRestrictedImports` keeps `vitest` and the testing helpers
of React out of the extension's code, and `correctness/noNodejsModules`
rejects a Node builtin import in `src/renderer/` and `src/common/`, tests left
out. Every path in an override starts with `**/`: Trunk runs Biome from a
sandbox outside the repository, where a path anchored at the repository root
matches no file. The Biome commands in `.trunk/trunk.yaml` pass
`--vcs-use-ignore-file=false` for the same reason, and no `--config-path`,
which would turn the parser options off.

`biome.jsonc` leaves out `.svg` files, the Kubernetes manifests in `examples/`
and `integration/fixtures/`, whose sequences stay unindented as kubectl writes
them and which yamlfmt formats with the `.yamlfmt.yaml` of their directory, and
`pnpm-lock.yaml`, `pnpm-workspace.yaml` and `.trunk/`, which pnpm and Trunk
write. The integration tests may import `vitest` and run in Node.

Renovate updates Biome, and `biome-migrate.yaml` runs `biome migrate` on the
Renovate branch so that the bump and its migration are one pull request.

### Knip

`pnpm knip:check` runs knip twice: a development pass over everything, and a
`--production --strict` pass from the entries marked with `!` in `knip.jsonc`,
`src/main/index.ts` and `src/renderer/index.tsx`. A file no entry reaches is
unused; remove it rather than ignore it. The host-provided modules are in
`ignoreDependencies`: they are devDependencies for their types, which the
production pass would report as unlisted. The Vite plugin is off and
`vite.config.mjs` is an entry instead, `svgo` is on for `svgo.config.mjs`,
the probes in `environment-tests/` are entries, the Vitest plugin adds the
integration tests, `kubectl` is an ignored binary, `dist/**` is ignored so that
a built bundle is not analysed, and `project` leaves out the CSS module
declarations, which knip would otherwise report as unused.

### Workflows

| Workflow                                                  | Runs                                                                                                                                  |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `type-check.yaml`                                         | `pnpm type:check`                                                                                                                     |
| `check.yaml`                                              | `pnpm build`, `pnpm lint:check`, `pnpm knip:check`                                                                                    |
| `unit-tests.yaml`                                         | `pnpm test:unit`                                                                                                                      |
| `trunk-check.yaml`                                        | `trunk check --all`                                                                                                                   |
| `integration-tests.yaml`                                  | the integration tests, against Freelens dev with a kind cluster ("Integration tests")                                                 |
| `mise-lock-check.yaml`                                    | on a change to `mise.lock`: no checksum changed for an unchanged tool version                                                         |
| `biome-migrate.yaml`                                      | `biome migrate` on a Renovate branch                                                                                                  |
| `npm-audit.yaml`, `npm-dedupe.yaml`, `trunk-upgrade.yaml` | scheduled maintenance, each in an `automated/*` pull request; `/rerun` by a collaborator reruns one                                   |
| `npm-version.yaml`, `tag.yaml`, `release.yaml`            | the version bump pull request, the tag when it merges (or `/tag` by a collaborator), the npm publish and GitHub release of a `v*` tag |
| `claude.yaml`, `claude-task.yaml`                         | Claude Code on `@claude` and on dispatch ("GitHub Actions (Claude Code Action) Rules")                                                |

The type check has a workflow of its own, which runs every program, tests,
tooling, integration and environment tests included, and `check.yaml` builds
without the type check, so it does not run twice. `integration-tests.yaml` has
a job `integration tests` that waits for every job of its matrix and fails when
one did not succeed, the one check that branch rules need to require.

The workflows that act on a comment (`/tag`, `/rerun`) require the comment's
author to be OWNER, MEMBER or COLLABORATOR; `claude.yaml` goes further and
checks write access through the API, because MEMBER and COLLABORATOR do not
imply it. They commit and push with the `GH_TOKEN` secret, and `release.yaml`
publishes with `NPM_TOKEN` or, without it, with npm provenance over OIDC.

## Code Style

- **Biome** formats **TypeScript/TSX, JS, JSON, CSS, SCSS, HTML, YAML, Markdown**: double quotes, semicolons, trailing commas, 2-space indent, 120 char line width — use `pnpm biome:fix`
- **Trunk** formats **TOML and shell scripts**, and runs the linters for formats not covered by Biome (yamllint, actionlint, shellcheck) — use `pnpm trunk:fix`
- Import order (enforced by biome organizeImports): built-in modules → `@freelensapp/**` → packages → relative paths
- React 19; JSX compiles to `react/jsx-runtime` imports, which the build maps to the host's React
- **No emoji** in Markdown files (`.md`), comments, or any source code

## Security

Never read, display, reference, or include the contents of the following files in any response or context, even if they are open in the editor:

- `.env`
- `.env.*`
- `.envrc`
- `.npmrc`
- `*.jks`
- `*.keystore`
- `*.p12`
- `*.pfx`
- `*.pem`
- `*.key`

The same list is git-ignored in `.gitignore` and enforced for Claude Code by
the `permissions.deny` rules in `.claude/settings.json`, which block reading
and editing these files. Change all three together. The rules are native
permissions rather than a hook on purpose: a hook runs a process in the
working tree, which may be an untrusted pull request, and an interpreter such
as `python3 -c` imports modules from that tree before the hook's own code.

## Electron Multi-Process

Extensions run in the same multi-process model as the Freelens host:

- **Main process** (`src/main/`) — Node.js environment, extension lifecycle
- **Renderer process** (`src/renderer/`) — Chromium browser, UI components

Code in `src/common/` would be shared between both processes.

## Troubleshooting

### Changes Not Appearing

1. Check that files are not in ignored output directories (`dist/`, `node_modules/`)
2. Full clean and rebuild: `pnpm clean:all && pnpm install && pnpm build`
3. With a directory install and `pnpm dev` running, look for a refused reload in the Freelens log, and restart
   Freelens after a change to `main` or `renderer` in `package.json`; reinstall an extension installed from a tarball

### Build Failures

1. Check for TypeScript errors: `pnpm type:check`
2. Check for linting errors: `pnpm lint:check`
3. Verify dependencies: `pnpm install`
4. Check Node.js version matches the `engines` field in `package.json`

### Runtime Errors

1. Open Freelens DevTools and check the Console tab for renderer errors
2. Check the terminal where Freelens was launched for main process errors
3. Look for stack traces with file:line numbers
4. Verify all CRD objects have proper `static readonly` properties (kind, apiBase, crd)
5. Validate both with `pnpm type:check` **and** `pnpm build` — runtime failures can appear only in bundled `dist/` code

## Best Practices

1. **Use semantic search** to find examples and patterns in the codebase
2. **Follow existing patterns** — grep for similar implementations before creating new ones
3. **Test changes** before committing
4. **Run validation before committing:** `pnpm lint:fix && pnpm type:check && pnpm test:unit`
5. **For TypeScript/TSX, JS, JSON, CSS, SCSS, HTML, YAML and Markdown files:** run `pnpm biome:fix` (or `biome check` directly if `biome` is installed locally)
6. **For other formats:** run `pnpm trunk:fix` (or `trunk check` directly if `trunk` is installed locally)
7. **Full build** when in doubt about cached state: `pnpm clean:all && pnpm install && pnpm build`
8. **Do not use Anthropic Fable for coding tasks** — Fable may be used only for planning,
   analysis, and thinking through problems. When writing or editing code,
   use standard editing tools instead.

## GitHub Actions (Claude Code Action) Rules

This project has a Claude Code workflow (`.github/workflows/claude.yaml`) triggered
via `@claude` comments on issues, PR comments, and reviews. When operating via that
workflow, follow these rules:

### Code Review

When reviewing code and proposing fixes:

1. **Show the diff first** — present every proposed change as a unified diff
   block using the `diff` language tag:

   ```diff
   --- a/path/to/file.ts
   +++ b/path/to/file.ts
   @@ -10,7 +10,7 @@
    const oldLine = "before";
   -const changedLine = "after";
   +const changedLine = "the fix";
    const unchangedLine = "same";
   ```

   You can generate this from the terminal with:

   ```bash
   git diff -u -- path/to/file
   ```

   If the change spans multiple files, group them under a single commit
   subject and show each file's diff sequentially.

2. **Propose a commit subject first** — before any code change, output a
   single line with the proposed commit subject:

   ```text
   **Proposed commit:** <short description>
   ```

   Do **not** use Conventional Commits prefixes (e.g. `fix:`, `feat:`,
   `chore:`, `refactor:`, `docs:`, `test:`, `ci:`). This project prefers
   plain, descriptive commit messages and PR titles without any prefix.

   Wait for the user to confirm (or adjust) the subject before applying the
   change.

3. **Comment style:**
   - Keep review comments concise and actionable
   - Reference specific lines (file + line number) when pointing out issues
   - Offer a concrete fix suggestion rather than just flagging a problem
   - Do **not** use emoji in any Markdown, comments, commit messages, or
     PR descriptions. The only exception is emoji that already appears
     inside code strings (e.g. application logs, user-facing messages).
   - Use GitHub's `suggestion` block for small targeted fixes so the PR
     author can accept the change with a single click:

     ```suggestion
     <same unified-diff format as shown above>
     ```

   - For larger multi-file changes, use `diff -u` blocks in a regular
     comment instead, with the proposed commit subject shown first

### Making Changes to a PR

When asked to implement a change on a PR:

1. Propose the commit subject (as above)
2. Describe what will change and why
3. After confirmation, apply the changes with commits on the PR branch
4. **One commit per fix** — when a review surfaces more than one issue or
   the plan includes more than one fix, apply and commit each fix
   separately. Do not batch multiple independent fixes into a single
   commit. This keeps the history bisectable and makes each change easy
   to revert individually.

### Force-Pushing a Rewritten Branch

When you are asked to rebase a pull request branch, or to rewrite its
history in another way (amend, squash, drop a commit), push the result with:

```bash
git push --force-with-lease origin HEAD
```

The push wrapper the action names in its instructions, `git-push.sh`, accepts
no flags, so it cannot do this; `git` itself is allowed in this workflow.
Do not fall back to merging `main` into the branch instead: a merge commit is
not what was asked for.

Force-push only the pull request branch the run was invoked on, and only when
the request calls for a rewrite. Never force-push `main` or any other branch,
and never rewrite a history you were not asked to.

### Modifying GitHub Actions Workflows

Claude cannot push changes to files under `.github/workflows/` directly,
because the GitHub token used by the action lacks the `workflows` permission.
Any patch to a workflow file MUST therefore be delivered as a new, complete
file under the `github-workflow-fix/` directory in the repository root instead
of editing the file in place:

1. Write the full, final contents of the workflow to
   `github-workflow-fix/<workflow-file-name>`, with the same file name as in
   `.github/workflows/` (e.g. `github-workflow-fix/check.yaml`). Do **not**
   edit the original file under `.github/workflows/`.
2. Make it a **complete** file — the entire workflow as it should look after
   the change, not just a diff or fragment — so it can be copied verbatim.
3. Commit it with the change that needs it, and list it in the report. In the
   PR description, note it as a proposed workflow change that a maintainer
   must move from `github-workflow-fix/` to `.github/workflows/`.

A maintainer moves the file into `.github/workflows/` in a separate commit and
removes `github-workflow-fix/`. Pull before continuing on the branch, as it may
have gained such a commit.

### Branch Naming Conventions

When creating a branch from an issue, use a human-readable name that includes
the issue number and a short slug derived from the issue title:

```text
claude/issue-<number>-<short-slug>
```

- `<number>` is the GitHub issue number
- `<short-slug>` is a kebab-case summary of the issue title, kept short
  (3–6 words maximum, omit articles and filler words)

Do **not** use auto-generated timestamp suffixes (e.g.
`claude/issue-1957-20260612-2108`) — these are not human-readable and make
branch lists hard to scan.

### Fork PRs: Review Only

A PR from a fork (different owner than `nidiodolfini`) gets a review and
nothing else: no commits, no pushes, no branches. Its code is untrusted, and
the head of a fork PR can change between the moment a maintainer looks at it
and the moment the workflow checks it out, so nothing taken from the checkout
may reach `nidiodolfini/freelens-eso-extension`.

When a fork PR needs changes, a maintainer first copies the exact commit they
reviewed to a branch in this repository. From then on it is a
same-repository PR, which gets the full setup and the normal workflow. The
copy is made either locally (`gh pr checkout <N>`, then push the branch) or
by the Claude Task workflow, following "Copying a Fork PR" below.

### Copying a Fork PR

This applies to a Claude Task run whose prompt asks to copy a fork PR and
names the PR number and the full commit SHA to copy. It is a git-only task:
do not check out, read, build or run any of the PR's files, and do not
describe its changes, because they are untrusted input.

1. `git fetch origin refs/pull/<N>/head`.
2. Verify that `FETCH_HEAD` equals the given SHA. If it does not, or no full
   SHA was given, stop and report the actual head without pushing anything.
3. `git push origin <sha>:refs/heads/claude/pr-<N>`.
4. Open a PR from `claude/pr-<N>` to `main`. It MUST use the **exact same
   title** as the original PR, copied verbatim with no prefix, and its body
   is `Copy of #<N> at <sha>.` followed by the usual footer.
5. Comment on the original PR with a link to the new one.
