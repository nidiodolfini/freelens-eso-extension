# API de Extensões do Freelens — Referência de Implementação

> Documento de referência para implementar uma extensão Freelens para o External Secrets Operator (ESO).
> Todo código abaixo foi copiado de fontes reais (não reconstruído de memória). Os arquivos do
> repositório de exemplo foram baixados e espelhados em `research/freelens-example-extension/`
> (mesma estrutura do repo original).

## Fontes primárias

| Fonte | URL |
| --- | --- |
| Repo do exemplo (template oficial) | https://github.com/freelensapp/freelens-example-extension |
| Docs normativas da API v2 (contratos C1–C15) | https://github.com/freelensapp/freelens/blob/main/docs/extensions/api.md |
| Guia de migração v1→v2 | https://github.com/freelensapp/freelens/blob/main/docs/extensions/migrating-from-v1.md |
| Skill de port v1→v2 | https://github.com/freelensapp/freelens-example-extension/blob/main/skills/port-freelens-extension-to-v2/SKILL.md |
| AGENTS.md do template (padrões de build) | https://github.com/freelensapp/freelens-example-extension/blob/main/AGENTS.md (cópia local em `../AGENTS.md`) |
| Extensão FluxCD (padrões completos, v2) | https://github.com/freelensapp/freelens-fluxcd-extension |
| Guias da API v1 (Lens 5.2.4) | https://github.com/lensapp/lens/tree/v5.2.4/docs/extensions/guides |
| API reference v1 (Lens 5.2.4) | https://api-docs.k8slens.dev/v5.2.4/extensions/api/ |
| Exemplos v1 (lens-extension-samples) | https://github.com/lensapp/lens-extension-samples (custom-resource-page) |

## Duas gerações da API

- **API v2 (Freelens ≥ 2.0.0 — atual).** É o que o exemplo usa. Entry points declarados no
  `package.json` (`main`/`renderer`), classes `Main.LensExtension`/`Renderer.LensExtension` com
  `onActivate()`/`onDeactivate()`, KubeObjects via `Renderer.K8sApi.LensExtensionKubeObject`,
  registros via campos declarativos + helpers `Renderer.K8sApi.detailsFor`/`menuItemFor`.
  **Extensões v1 são recusadas no load** (`engines.freelens` deve ser `^2.0.0`).
- **API v1 (Freelens 1.x / OpenLens 6.x / Lens 5.x — legado).** É de onde vêm os padrões
  `apiManager.registerStore(...)`, `KubeObject` subclass, `statuses`/`kubeObjectStatusTexts`,
  `KubeObjectStatusIcon`, citados em tutoriais antigos. Documentados na seção final porque
  muito material na web ainda os usa.

> ⚠️ **`onLoad`/`onStart` não existem.** O ciclo de vida da extensão em TODAS as versões da API
> (Lens 4→5→6, OpenLens, Freelens v1 e v2) é `onActivate()` / `onDeactivate()`. Não procure
> por `onLoad`/`onStart` — os hooks reais são estes (verificado na API reference v1 e nos docs v2).

---

## 1. Estrutura de arquivos do exemplo (branch `main`, v2.0.0)

```
package.json                # main: dist/main.js, renderer: dist/renderer.js, engines.freelens ^2.0.0
vite.config.mjs             # build: 2 runs (renderer + --mode main), library mode ESM
tsconfig.base.json
tsconfig.json               # tooling
src/
  tsconfig.json             # tests
  main/
    tsconfig.json           # lib ES2024, types: node
    index.ts                # entry main
  renderer/
    tsconfig.json           # lib ES2024+DOM, types: vite/client
    index.tsx               # entry renderer (todos os registros)
    api/
      types.ts              # types compartilhados (NamespacedObjectReference, CRD)
      example/
        example-v1alpha1.ts # modelo (KubeObject) v1alpha1 + KubeApi + KubeObjectStore
        example-v1alpha2.ts # modelo v1alpha2
    pages/examples-page-v1alpha1.tsx (e -v1alpha2.tsx)   # lista (KubeObjectListLayout)
    details/example-details-v1alpha1.tsx (e -v1alpha2.tsx) # painel de detalhes
    menus/example-active-toggle-menu-item-v1alpha1.tsx (e -v1alpha2.tsx) # item de menu
    components/available-version.tsx  # escolhe a versão servida pelo cluster
    components/error-boundary.tsx     # error boundaries p/ registros
    preferences/example-preference.tsx
    icons/example.tsx, example.svg
  common/
    tsconfig.json
    store/preferences-store.ts        # ExtensionStore compartilhado
```

---

## 2. `package.json` (manifesto)

Trechos exatos do exemplo:

```json
{
  "name": "@freelensapp/example-extension",
  "version": "2.0.0-2",
  "main": "dist/main.js",
  "renderer": "dist/renderer.js",
  "files": ["dist/**/*"],
  "engines": {
    "node": ">= 24.0.0",
    "freelens": "^2.0.0"
  },
  "type": "module",
  "scripts": {
    "build": "vite build && vite build --mode main",
    "dev": "pnpm \"/^dev:(renderer|main)\\$/\"",
    "dev:main": "vite build --watch --mode main",
    "dev:renderer": "vite build --watch --no-emptyOutDir"
  },
  "devDependencies": {
    "@freelensapp/extensions": "2.0.0-0-nightly-2026-10-17",
    "react": "19.3.1",
    "react-dom": "19.3.1",
    "mobx": "7.0.6",
    "mobx-react": "10.0.2",
    "electron": "43.8.0",
    "typescript": "7.0.2",
    "vite": "8.3.4"
  }
}
```

Regras importantes (contratos C1/C3/C14 de `api.md`):

- `engines.freelens: "^2.0.0"` é **obrigatório e verificado no load** — sem ele a extensão é recusada.
- `main` e `renderer` apontam para os bundles. `react`, `react-dom`, `mobx`, `mobx-react`,
  `monaco-editor` e `@types/react*` são **devDependencies** (tipos + peer check), NUNCA
  `dependencies`; o build as marca como externas (o host fornece uma única instância via
  `globalThis.FreelensExtensionApi`).
- `@freelensapp/extensions` é um shim fino que lê `globalThis.FreelensExtensionApi`; deve ser
  **empacotado** (não marcado externo). Nenhum outro pacote `@freelensapp/*` é publicado.

---

## 3. Bootstrap / entry points

### `src/main/index.ts` (processo main — Node/Electron)

```ts
import { Main } from "@freelensapp/extensions";
import { ExamplePreferencesStore } from "../common/store";

export default class ExampleMain extends Main.LensExtension {
  async onActivate() {
    await ExamplePreferencesStore.getInstanceOrCreate().loadExtension(this);
  }
}
```

### `src/renderer/index.tsx` (processo renderer — browser)

```tsx
import { Renderer } from "@freelensapp/extensions";
import { Example as ExampleV1alpha1 } from "./api/example/example-v1alpha1";
import { Example as ExampleV1alpha2 } from "./api/example/example-v1alpha2";
import { createAvailableVersionPage } from "./components/available-version";
import {
  withDetailsErrorBoundary,
  withMenuItemErrorBoundary,
  withPageErrorBoundary,
} from "./components/error-boundary";
import { ExampleDetails as ExampleDetailsV1alpha1 } from "./details/example-details-v1alpha1";
import { ExampleDetails as ExampleDetailsV1alpha2 } from "./details/example-details-v1alpha2";
import { ExampleIcon } from "./icons";
import { ExampleActiveToggleMenuItem as ExampleActiveToggleMenuItem_v1alpha1 } from "./menus/example-active-toggle-menu-item-v1alpha1";
import { ExampleActiveToggleMenuItem as ExampleActiveToggleMenuItem_v1alpha2 } from "./menus/example-active-toggle-menu-item-v1alpha2";
import { ExamplesPage as ExamplesPageV1alpha1 } from "./pages/examples-page-v1alpha1";
import { ExamplesPage as ExamplesPageV1alpha2 } from "./pages/examples-page-v1alpha2";
import { ExamplePreferenceHint, ExamplePreferenceInput } from "./preferences/example-preference";

const ExamplesPage = createAvailableVersionPage("Examples", [
  { kubeObjectClass: ExampleV1alpha2, PageComponent: ExamplesPageV1alpha2, version: "v1alpha2" },
  { kubeObjectClass: ExampleV1alpha1, PageComponent: ExamplesPageV1alpha1, version: "v1alpha1" },
]);

// Cada página, painel de detalhes e item de menu renderiza dentro de um error boundary...
export default class ExampleRenderer extends Renderer.LensExtension {
  async onActivate() {
    ExamplePreferencesStore.getInstanceOrCreate().loadExtension(this);
  }

  appPreferences = [
    {
      title: "Example Preferences",
      components: {
        Input: () => <ExamplePreferenceInput />,
        Hint: () => <ExamplePreferenceHint />,
      },
    },
  ];

  kubeObjectDetailItems: Renderer.LensExtension["kubeObjectDetailItems"] = [
    Renderer.K8sApi.detailsFor(ExampleV1alpha1, {
      priority: 10,
      Details: ExampleDetailsV1alpha1,
    }),
    Renderer.K8sApi.detailsFor(ExampleV1alpha2, {
      priority: 10,
      Details: ExampleDetailsV1alpha2,
    }),
  ].map((registration) => withDetailsErrorBoundary(this, registration));

  clusterPages: Renderer.LensExtension["clusterPages"] = [
    {
      id: "example",
      components: {
        Page: () => <ExamplesPage extension={this} />,
      },
    },
  ].map((registration) => withPageErrorBoundary(this, registration));

  clusterPageMenus = [
    {
      id: "example",
      title: ExampleV1alpha1.crd.title,
      target: { pageId: "example" },
      components: {
        Icon: ExampleIcon,
      },
    },
  ];

  customResources = [ExampleV1alpha1, ExampleV1alpha2];

  kubeObjectMenuItems: Renderer.LensExtension["kubeObjectMenuItems"] = [
    Renderer.K8sApi.menuItemFor(ExampleV1alpha1, {
      MenuItem: ExampleActiveToggleMenuItem_v1alpha1,
    }),
    Renderer.K8sApi.menuItemFor(ExampleV1alpha2, {
      MenuItem: ExampleActiveToggleMenuItem_v1alpha2,
    }),
  ].map((registration) => withMenuItemErrorBoundary(this, registration));
}
```

**Pontos-chave:**

- `onActivate()` roda quando a extensão é habilitada; `onDeactivate()` (opcional) na desativação/reload.
  Um reload (watch do build) faz teardown completo: `onDeactivate` → novo import → `onActivate`.
- **Campos declarativos de registro no `LensRendererExtension`** (contrato C6): `globalPages`,
  `clusterPages`, `clusterPageMenus`, `clusterFrameComponents`, `appPreferences`,
  `appPreferenceTabs`, `entitySettings`, `statusBarItems`, `kubeObjectDetailItems`,
  `kubeObjectMenuItems`, `kubeWorkloadsOverviewItems`, `commands`, `welcomeMenus`,
  `catalogEntityDetailItems`, `topBarItems`, `additionalCategoryColumns`,
  `customCategoryViews`, `kubeObjectHandlers`, `customResources`.
  **Não existe** `kubeObjectStatusTexts`/`statuses` no v2 (ver seção 9).
- A página recebe do host **apenas `params`**. Se ela precisa da instância da extensão,
  isso vem do próprio registro: `Page: () => <ExamplesPage extension={this} />`.
- `customResources = [ClasseV1, ClasseV2]` remove o recurso da árvore "Custom Resources" da
  sidebar enquanto a extensão está ativa (evita listagem dupla). Inclua **somente** modelos
  que têm página própria; modelos apenas decorados (details/menu) ficam fora.

---

## 4. KubeObject customizado (modelo da CRD)

`src/renderer/api/example/example-v1alpha1.ts` (completo):

```ts
import { Renderer } from "@freelensapp/extensions";

import type { ExampleKubeObjectCRD, NamespacedObjectReference } from "../types";

export interface ExampleSpec {
  title?: string;
  active?: boolean;
  description?: string;
  examples?: NamespacedObjectReference[];
}

export type ExampleStatus = {};

export class Example extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  ExampleStatus,
  ExampleSpec
> {
  declare kind: "Example";
  declare apiVersion: "example.freelens.app/v1alpha1";

  static readonly kind = "Example";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/example.freelens.app/v1alpha1/examples";

  static readonly crd: ExampleKubeObjectCRD = {
    apiVersions: ["example.freelens.app/v1alpha1"],
    plural: "examples",
    singular: "example",
    shortNames: ["ex"],
    title: "Examples",
  };

  static getActive(object: Example): boolean {
    return object.spec.active ?? false;
  }

  static getTitle(object: Example): string | undefined {
    return object.spec.title;
  }
}

export class ExampleApi extends Renderer.K8sApi.KubeApi<Example> {}
export class ExampleStore extends Renderer.K8sApi.KubeObjectStore<Example, ExampleApi> {}
```

`src/renderer/api/types.ts`:

```ts
import { Renderer } from "@freelensapp/extensions";

export interface NamespacedObjectReference {
  name: string;
  namespace?: string;
}

export interface ExampleKubeObjectCRD extends Renderer.K8sApi.LensExtensionKubeObjectCRD {
  title: string;
}
```

**Regras rígidas (do AGENTS.md do template — "CRD KubeObject Pattern"):**

1. **Metadata**: `static readonly` `kind`, `namespaced`, `apiBase` e `crd`.
2. **Literais de tipo de instância**: `declare kind: "Example";` e
   `declare apiVersion: "example.freelens.app/v1alpha1";`. Sem eles, duas versões do mesmo
   kind são assignable entre si e `detailsFor`/`menuItemFor` aceitam componente da versão errada.
   `declare` não emite nada no runtime.
3. **Lógica por objeto** = método `static` que recebe o objeto (`Example.getActive(object)`).
   **PROIBIDO método de instância** na subclasse: os objetos vêm do store do host e são
   instâncias do `KubeObject` do host, não da subclasse — chamar método de instância lança exceção.
4. Campos são lidos via `object.spec`/`object.status` tipados (`ExampleSpec`/`ExampleStatus`).
5. Métodos disponíveis (herdados do host): `getName()`, `getNs()`, `getCreationTimestamp()`,
   `getSearchFields()`, `getId()`, `getAge()`, etc.
6. `crd.apiVersions` lista as versões na ordem de preferência; `getApi()`/`getStore()` resolvem
   para a primeira servida pelo cluster.
7. Sempre exportar `KubeApi` e `KubeObjectStore` subclasses junto — a página usa o tipo da `KubeApi`.

Para o ESO, os três modelos seriam, por exemplo:

```ts
export class ExternalSecret extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  ExternalSecretStatus,
  ExternalSecretSpec
> {
  declare kind: "ExternalSecret";
  declare apiVersion: "external-secrets.io/v1";

  static readonly kind = "ExternalSecret";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/external-secrets.io/v1/externalsecrets";

  static readonly crd = {
    apiVersions: ["external-secrets.io/v1", "external-secrets.io/v1beta1"],
    plural: "externalsecrets",
    singular: "externalsecret",
    shortNames: ["es"],
    title: "External Secrets",
  };
  // ...
}

export class ExternalSecretApi extends Renderer.K8sApi.KubeApi<ExternalSecret> {}
export class ExternalSecretStore extends Renderer.K8sApi.KubeObjectStore<ExternalSecret, ExternalSecretApi> {}
```

---

## 5. Stores e `apiManager`

No v2 o host **registra automaticamente** uma `KubeApi` e um `KubeObjectStore` para cada
versão de CRD que o cluster serve — você normalmente **não** instancia nada:

```ts
const store = Example.getStore<Example>();   // static do LensExtensionKubeObject
```

`apiManager` ainda existe no v2 (`Renderer.K8sApi.apiManager`):

```ts
// alcançar um store por path de API
const ingressClasses = Renderer.K8sApi.apiManager.getStore(
  "/apis/networking.k8s.io/v1/ingressclasses",
);
```

Um API/store que **sua extensão** registrar manualmente (raro, para APIs não-CRD)
usa `apiManager.registerApi()` / `registerStore()` e fica registrado até a extensão remover —
diferente dos automáticos, que somem quando a CRD é removida do cluster.

**Importante (falha silenciosa):** qualquer componente que escolhe a versão via `getStore()`
deve ser um `observer` (mobx-react), porque o host registra os APIs das CRDs **depois** de o
frame do cluster carregar as CRDs. Uma página aberta antes disso mostra "não instalado" e não
re-renderiza se não for observer. É por isso que o exemplo usa `createAvailableVersionPage`
(que é um `observer`) — código completo em `research/freelens-example-extension/src/renderer/components/available-version.tsx`.

**No v1 (padrão clássico)** o registro era manual — código real do guia oficial
`docs/extensions/guides/kube-object-list-layout.md` (lensapp/lens@v5.2.4):

```typescript
import { Renderer } from "@k8slens/extensions";

const {
  K8sApi: { KubeObject, KubeObjectStore, KubeApi, apiManager },
} = Renderer;

export class Certificate extends KubeObject {
  static kind = "Certificate"
  static namespaced = true
  static apiBase = "/apis/cert-manager.io/v1alpha2/certificates"

  kind: string
  apiVersion: string
  metadata: {
    name: string;
    namespace: string;
    selfLink: string;
    uid: string;
    resourceVersion: string;
    creationTimestamp: string;
    labels: { [key: string]: string; };
    annotations: { [key: string]: string; };
  }
  spec: {
    dnsNames: string[];
    issuerRef: { group: string; kind: string; name: string; };
    secretName: string;
  }
  status: {
    conditions: {
      lastTransitionTime: string;
      message: string;
      reason: string;
      status: string;
      type?: string;
    }[];
  }
}

export class CertificatesApi extends KubeApi<Certificate> {}

export const certificatesApi = new CertificatesApi({
  objectConstructor: Certificate
});

export class CertificatesStore extends KubeObjectStore<Certificate> {
  api = certificatesApi
}

export const certificatesStore = new CertificatesStore();

// Registro no API manager do Lens:
apiManager.registerStore(certificatesStore);
```

---

## 6. Página de cluster (`clusterPages` + `clusterPageMenus`)

Formato dos registros (v2 = v1, sem mudanças de shape):

```tsx
clusterPages = [
  {
    id: "example",
    components: {
      Page: () => <ExamplesPage extension={this} />,
    },
  },
];

clusterPageMenus = [
  {
    id: "example",
    title: "External Secrets",        // texto da sidebar
    target: { pageId: "example" },    // liga ao id da página
    components: {
      Icon: ExampleIcon,              // ícone na sidebar
    },
  },
];
```

Tipos (v1 API reference): `clusterPages: PageRegistration[]`,
`clusterPageMenus: ClusterPageMenuRegistration[]`. O `PageRegistration.id` pode carregar
parâmetros de rota (`/details/:param`); menus podem ser submenus (`parentId`).

Ícone (SVG importado com `?raw` — v2):

```tsx
import { Renderer } from "@freelensapp/extensions";
import svgIcon from "./example.svg?raw";

const { Component: { Icon } } = Renderer;

export function ExampleIcon(props: Renderer.Component.IconProps) {
  return <Icon {...props} svg={svgIcon} />;
}
```

Ícone material (v1):

```tsx
export function ExampleIcon(props: Renderer.Component.IconProps) {
  return <Icon {...props} material="pages" tooltip="Hi!" />
}
```

---

## 7. `KubeObjectListLayout` (lista de recursos)

Uso exato no exemplo (v2):

```tsx
import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { Example, type ExampleApi } from "../api/example/example-v1alpha1";
import styles from "./examples-page.module.scss";

const { observer } = MobxReact;

const {
  Component: { BadgeBoolean, KubeObjectAge, KubeObjectListLayout, LinkToNamespace, WithTooltip },
} = Renderer;

const KubeObject = Example;
type KubeObject = Example;
type KubeObjectApi = ExampleApi;

const sortingCallbacks = {
  name: (object: KubeObject) => object.getName(),
  namespace: (object: KubeObject) => object.getNs(),
  active: (object: KubeObject) => String(KubeObject.getActive(object)),
  title: (object: KubeObject) => KubeObject.getTitle(object),
  age: (object: KubeObject) => object.getCreationTimestamp(),
};

const renderTableHeader: { title: string; sortBy: keyof typeof sortingCallbacks; className?: string }[] = [
  { title: "Name", sortBy: "name" },
  { title: "Namespace", sortBy: "namespace" },
  { title: "Active", sortBy: "active", className: styles.active },
  { title: "Title", sortBy: "title", className: styles.title },
  { title: "Age", sortBy: "age", className: styles.age },
];

export const ExamplesPage = observer(() => {
  const store = KubeObject.getStore<KubeObject>();

  return (
    <KubeObjectListLayout<KubeObject, KubeObjectApi>
      tableId={`${KubeObject.crd.plural}Table`}
      className={styles.page}
      store={store}
      sortingCallbacks={sortingCallbacks}
      searchFilters={[(object: KubeObject) => object.getSearchFields()]}
      renderHeaderTitle={KubeObject.crd.title}
      renderTableHeader={renderTableHeader}
      renderTableContents={(object: KubeObject) => [
        <WithTooltip>{object.getName()}</WithTooltip>,
        <LinkToNamespace namespace={object.getNs()} />,
        <BadgeBoolean value={KubeObject.getActive(object)} />,
        <WithTooltip>{KubeObject.getTitle(object) ?? "N/A"}</WithTooltip>,
        <KubeObjectAge object={object} key="age" />,
      ]}
    />
  );
});
```

Uso v1 equivalente (mesmo componente, `store` manual + `TabLayout`):

```typescript
render() {
  return (
    <TabLayout>
      <KubeObjectListLayout
        className="Certicates" store={certificatesStore}
        sortingCallbacks={{
          [sortBy.name]: (certificate: Certificate) => certificate.getName(),
          [sortBy.namespace]: (certificate: Certificate) => certificate.metadata.namespace,
          [sortBy.issuer]: (certificate: Certificate) => certificate.spec.issuerRef.name
        }}
        searchFilters={[
          (certificate: Certificate) => certificate.getSearchFields()
        ]}
        renderHeaderTitle="Certificates"
        renderTableHeader={[
          { title: "Name", className: "name", sortBy: sortBy.name },
          { title: "Namespace", className: "namespace", sortBy: sortBy.namespace },
          { title: "Issuer", className: "issuer", sortBy: sortBy.namespace },
        ]}
        renderTableContents={(certificate: Certificate) => [
          certificate.getName(),
          certificate.metadata.namespace,
          certificate.spec.issuerRef.name
        ]}
      />
    </TabLayout>
  )
}
```

**Cuidado v2 (mobx-react 10):** callbacks chamados pelo host de dentro de derivations dele
(`renderTableContents`, `getItems`, `customizeHeader`) não podem ler `this.props` de um
`@observer` class component fora do `render()` — use function components ou leia props no
`render()` e passe para o callback. A página acima é function component + `observer`.

---

## 8. Painel de detalhes (`kubeObjectDetailItems` + `detailsFor` + `DrawerItem`)

Registro (v2):

```tsx
kubeObjectDetailItems = [
  Renderer.K8sApi.detailsFor(ExampleV1alpha1, {
    priority: 10,
    Details: ExampleDetailsV1alpha1,
  }),
];
```

Componente (v2):

```tsx
import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { ExamplePreferencesStore } from "../../common/store";

import type { Example } from "../api/example/example-v1alpha1";

const { observer } = MobxReact;

const {
  Component: { BadgeBoolean, DrawerItem, MarkdownViewer },
} = Renderer;

export type ExampleDetailsProps = Renderer.Component.KubeObjectDetailsProps<Example>;

export const ExampleDetails = observer(({ object }: ExampleDetailsProps) => {
  const preferences = ExamplePreferencesStore.getInstance<ExamplePreferencesStore>();

  return (
    <>
      <DrawerItem name="Api Version">v1alpha1</DrawerItem>
      <DrawerItem name="Description">
        <MarkdownViewer markdown={object.spec.description ?? ""} />
      </DrawerItem>
      <DrawerItem name="Example checkbox">
        <BadgeBoolean value={preferences.enabled} />
      </DrawerItem>
    </>
  );
});
```

`detailsFor(Class, { Details, apiVersions?, priority?, visible? })` pega `kind` do modelo e
tipa `object` como instância da classe — componente escrito para outro modelo **não compila**.

Registro v1 (shape bruto, sem helper — ainda compila no v2, mas prefira `detailsFor`):

```typescript
kubeObjectDetailItems = [{
  kind: Certificate.kind,
  apiVersions: ["cert-manager.io/v1alpha2"],
  components: {
    Details: (props: CertificateDetailsProps) => <CertificateDetails {...props} />
  }
}]
```

Componente v1 com `DrawerItem`/`Badge` (guia oficial):

```typescript
const {
  Component: { KubeObjectDetailsProps, DrawerItem, Badge },
} = Renderer;

export interface CertificateDetailsProps extends KubeObjectDetailsProps<Certificate> {}

export class CertificateDetails extends React.Component<CertificateDetailsProps> {
  render() {
    const { object: certificate } = this.props;
    if (!certificate) return null;
    return (
      <div className="Certificate">
        <DrawerItem name="Created">
          {certificate.getAge(true, false)} ago ({certificate.metadata.creationTimestamp})
        </DrawerItem>
        <DrawerItem name="DNS Names">{certificate.spec.dnsNames.join(",")}</DrawerItem>
        <DrawerItem name="Secret">{certificate.spec.secretName}</DrawerItem>
        <DrawerItem name="Status" className="status" labelsOnly>
          {certificate.status.conditions.map((condition, index) => {
            const { type, reason, message, status } = condition;
            const kind = type || reason;
            if (!kind) return null;
            return (
              <Badge
                key={kind + index} label={kind}
                className={"success " + kind.toLowerCase()}
                tooltip={message}
              />
            );
          })}
        </DrawerItem>
      </div>
    )
  }
}
```

> O `KubeObjectDetails` (componente container de details com `KubeObjectMeta` + sections) que
> aparece em tutoriais antigos era a forma v4/v5-inicial de montar details; nas versões atuais
> (v1 tardio e v2) o host monta o drawer e a extensão contribui itens via
> `kubeObjectDetailItems` + `DrawerItem`/`DrawerTitle`/`Table` — como acima.

---

## 9. `kubeObjectMenuItems` (menu de contexto / toolbar)

Registro (v2):

```tsx
kubeObjectMenuItems = [
  Renderer.K8sApi.menuItemFor(ExampleV1alpha1, {
    MenuItem: ExampleActiveToggleMenuItem_v1alpha1,
  }),
];
```

Item de menu (v2) — recebe `{ object, toolbar }` (`Common.Types.KubeObjectMenuItemProps<Example>`):

```tsx
import { Common, Renderer } from "@freelensapp/extensions";
import { Example } from "../api/example/example-v1alpha1";

const {
  Component: { MenuItem, Icon },
} = Renderer;

export type ExampleActiveToggleMenuItemProps = Common.Types.KubeObjectMenuItemProps<Example>;

export const ExampleActiveToggleMenuItem = ({ object, toolbar }: ExampleActiveToggleMenuItemProps) => {
  if (!object) return <></>;

  const store = Example.getStore<Example>();

  const disable = async () => {
    await store.patch(
      object,
      {
        spec: {
          active: false,
        },
      },
      "merge",
    );
  };

  const enable = async () => {
    await store.patch(
      object,
      {
        spec: {
          active: true,
        },
      },
      "merge",
    );
  };

  if (!object.spec.active) {
    return (
      <MenuItem onClick={enable}>
        <Icon material="play_circle_outline" interactive={toolbar} title="Resume" />
        <span className="title">Resume</span>
      </MenuItem>
    );
  } else {
    return (
      <MenuItem onClick={disable}>
        <Icon material="pause_circle_filled" interactive={toolbar} title="Suspend" />
        <span className="title">Suspend</span>
      </MenuItem>
    );
  }
};
```

> **Para o ESO:** o "force-sync" (ver `research/eso-api.md`) é exatamente uma annotation que
> muda a cada vez (`external-secrets.io/force-sync=<timestamp>`) — o mesmo padrão funciona via
> `store.patch(object, { metadata: { annotations: { "external-secrets.io/force-sync": String(Date.now()) } } }, "merge")`.
> Um menu item "Force Sync" é um caso de uso perfeito do `kubeObjectMenuItems`.

Registro v1:

```typescript
kubeObjectMenuItems = [
  {
    kind: "Namespace",
    apiVersions: ["v1"],
    components: {
      MenuItem: (props: KubeObjectMenuProps<Namespace>) => <NamespaceMenuItem {...props} />
    }
  }
];
```

> Cuidado no port: `MenuItem` recebe `{ object, toolbar }` — tipar com
> `Common.Types.KubeObjectMenuItemProps<T>`; NÃO estender `Renderer.Component.KubeObjectMenuProps`
> (props do `KubeObjectMenu` inteiro, que o host não passa).

---

## 10. Status: expor estado nos recursos (lista/detalhes)

### v2 — NÃO existe registro de status

O contrato C6 (api.md) lista os campos do `LensRendererExtension` e **não inclui**
`kubeObjectStatusTexts`/`statuses`/`KubeObjectStatusIcon` como superfície. No v2 o status do
objeto é exposto por:

1. **Colunas da lista** (`renderTableContents` + `Badge`/`BadgeBoolean`) e
2. **Painel de detalhes** (`DrawerItem` + `Badge`), e
3. (Para a árvore de Workloads há `kubeWorkloadsOverviewItems`.)

### v1 — API de status (Lens 5.2+/OpenLens 6/Freelens v1), verificado na API reference

O campo do `LensExtension` é `kubeObjectStatusTexts` (em versões ≤5.1 chamava-se `statuses`):

```typescript
// API reference (api-docs.k8slens.dev v5.2.4):
kubeObjectStatusTexts: KubeObjectStatusRegistration[] = []

// Common.Types.KubeObjectStatusRegistration:
interface KubeObjectStatusRegistration {
  kind: string;
  apiVersions: string[];
  resolve: (object: KubeObject) => KubeObjectStatus;
}

// Renderer.K8sApi.KubeObjectStatus:
type KubeObjectStatus = {
  level: KubeObjectStatusLevel; // INFO | WARNING | CRITICAL
  text: string;
  timestamp?: string;
};

// Renderer.K8sApi.KubeObjectStatusLevel:
enum KubeObjectStatusLevel {
  INFO = 1,
  WARNING = 2,
  CRITICAL = 3,
}
```

Uso típico (registro + `resolve`):

```typescript
import { Renderer } from "@k8slens/extensions";

export default class ExampleExtension extends Renderer.LensExtension {
  kubeObjectStatusTexts = [
    {
      kind: "Certificate",
      apiVersions: ["cert-manager.io/v1"],
      resolve: (certificate) => {
        const ready = certificate.status?.conditions?.find((c) => c.type === "Ready");
        if (ready?.status === "True") {
          return { level: Renderer.K8sApi.KubeObjectStatusLevel.INFO, text: "Ready" };
        }
        return {
          level: Renderer.K8sApi.KubeObjectStatusLevel.WARNING,
          text: ready?.reason ?? "Not ready",
        };
      },
    },
  ];
}
```

O host renderiza o status (ícone + texto) nas listas/details com seus componentes
(`KubeObjectStatusIcon` é o componente interno que desenha o ícone a partir do `level`;
a extensão fornece os dados via `resolve`, não renderiza o ícone ela mesma).

### Padrão de status do fluxcd-extension (v2, recomendado para copiar)

O repo `freelensapp/freelens-fluxcd-extension` resolve status **sem** o registro v1 — helpers
puros sobre `status.conditions` usados nas colunas/details (`src/renderer/components/status-conditions.ts`):

```ts
import { Renderer } from "@freelensapp/extensions";

type Condition = Renderer.K8sApi.Condition;

export function getConditionText(conditions?: Condition[], suspend?: boolean) {
  if (suspend) return "Suspended";
  if (!conditions || !conditions.length) return "Unknown";

  if (conditions.some((condition) => condition.type === "Reconciling" && condition.status === "True")) {
    return "In Progress";
  }

  const readyCondition = conditions.find((condition) => condition.type === "Ready");
  if (readyCondition) {
    if (readyCondition.status === "True") return "Ready";
    if (conditions.some((condition) => condition.type === "Stalled" && condition.status === "True")) return "Stalled";
    if (readyCondition.status === "False") return "Not Ready";
    return "In Progress";
  }

  const condition = getLastCondition(conditions);
  if (condition?.status === "False") return "Not Ready";
  if (condition?.type === "Stalled") return "Stalled";
  return "In Progress";
}

export function getConditionClass(conditions?: Condition[], suspend?: boolean) {
  const status = getConditionText(conditions, suspend);
  switch (status) {
    case "In Progress":
      return "warning";
    case "Not Ready":
    case "Stalled":
      return "error";
    case "Ready":
      return "success";
    case "Suspended":
      return "info";
    default:
      return "";
  }
}
```

Para o ESO, o análogo seria `getConditionText()` que lê `status.conditions` do tipo `Ready`
(`True`→"Ready"/synced, `False`→erro com reason `SecretSyncedError`, ausente→"Unknown"),
mapeando para classes `success`/`error`/`warning`.

---

## 11. Tokens / namespaces do `@freelensapp/extensions`

### v2 — enumeração exata (contrato C5 do api.md)

```ts
import { Common, Main, Renderer } from "@freelensapp/extensions";
```

| Namespace | Membros |
| --- | --- |
| `Common` | `App`, `Catalog`, `Clusters`, `EventBus`, `Proxy`, `Store`, `Types`, `Util`, `logger`; tipos `InstalledExtension`, `LensExtension`, `LensExtensionManifest`, `Logger`, `PackageJson` |
| `Main` | `Catalog`, `Ipc`, `K8s`, `K8sApi`, `LensExtension`, `Navigation`, `Power`, `Shell`, `Util` |
| `Renderer` | `Catalog`, `Component`, `Ipc`, `K8s`, `K8sApi`, `LensExtension`, `Navigation`, `Theme`, `Util` |

- `Renderer.K8sApi` exporta TODO o pacote `@freelensapp/kube-object` (vocabulário de spec do
  Kubernetes): `Affinity`, `ContainerPort`, `Probe`, `ResourceRequirements`, `SecurityContext`,
  `Toleration`, `KubeObjectMetadata`, `BaseKubeObjectStatus` (o shape `{ conditions?: BaseKubeObjectCondition[] }`),
  `Condition`, etc. Útil para tipar `status.conditions` do ESO.
- `Common.Util`/`Main.Util`/`Renderer.Util`: utilitários (`sha256Hex`, `createReactKey`,
  `kustomizeHash`, `isIso8601DateString`…). `Main.Util.fetch` é o HTTP do host (usa proxy/CA do
  usuário); no renderer use o `fetch` global.
- Main e renderer enxergam tipos dos 3 namespaces, mas no runtime **o namespace do outro
  processo é `undefined`** (C2). Use só o namespace do processo.

### `getInjectionToken` NÃO existe

**Não há DI exposto na API de extensões** — em nenhuma das versões:

- No v2, o contrato **C7** é explícito: `@ogre-tools/injectable`/`@ogre-tools/injectable-react`
  **não** são publicados em `FreelensExtensionApi`; "the API exposes no container and no
  injection token". Se sua extensão quiser DI para código próprio, faça bundle da sua cópia.
- No v1 (Freelens 1.10.3), o `@freelensapp/extensions` exporta apenas:
  ```ts
  export { commonExtensionApi as Common, mainExtensionApi as Main } from "@freelensapp/core/main";
  export { rendererExtensionApi as Renderer } from "@freelensapp/core/renderer";
  ```
  (arquivo `packages/extensions/src/extension-api.ts` do tag v1.10.3 — sem `getInjectionToken`).
  `getInjectionToken` era do `@ogre-tools/injectable` interno do host; extensões que o usavam o
  faziam por deep-import não suportado.

**Resumo de "tokens" reais:** `Common`, `Main`, `Renderer` (valores + type namespaces) e, no
runtime, as singletons do host: `FreelensExtensionApi.React`, `.ReactDom`, `.ReactJsxRuntime`,
`.Mobx`, `.MobxReact`, `.MonacoEditor` (tabela C3).

### Bibliotecas fornecidas pelo host (marcar externas no build)

| Module id | Global | Publicada em |
| --- | --- | --- |
| `react` | `React` | renderer |
| `react-dom` | `ReactDom` | renderer |
| `react/jsx-runtime` | `ReactJsxRuntime` | renderer |
| `mobx` | `Mobx` | ambos |
| `mobx-react` | `MobxReact` | renderer |
| `monaco-editor` | `MonacoEditor` | renderer |

O plugin `build/vite-plugin-host-modules.mjs` do exemplo (copiar para a extensão ESO) faz a
reescrita e **falha o build** se um import violar (ex.: `react` no main, ou `react-dom/client`).

---

## 12. Preferências / estado persistido (`ExtensionStore`)

v2 (`src/common/store/preferences-store.ts` — importável por main E renderer):

```ts
import { Common } from "@freelensapp/extensions";
import { observable } from "mobx";

export interface ExamplePreferencesModel {
  enabled: boolean;
}

export class ExamplePreferencesStore extends Common.Store.ExtensionStore<ExamplePreferencesModel> {
  @observable accessor enabled = false;

  constructor() {
    super({
      configName: "example-preferences-store",
      defaults: {
        enabled: false,
      },
    });
  }

  fromStore({ enabled }: ExamplePreferencesModel): void {
    this.enabled = enabled;
  }

  toJSON(): ExamplePreferencesModel {
    return { enabled: this.enabled };
  }
}
```

- v2 usa decorators standard: `@observable accessor campo` e **sem** `makeObservable(this)`.
- Carregar no `onActivate` de main E renderer: `ExamplePreferencesStore.getInstanceOrCreate().loadExtension(this)`.
- `appPreferences = [{ title, components: { Input: () => <.../>, Hint: () => <.../> } }]`.

---

## 13. Bootstrap completo (resumo v1 vs v2)

```text
v2 (Freelens 2.x):
  src/main/index.ts    → export default class X extends Main.LensExtension { onActivate() {} }
  src/renderer/index.tsx → export default class X extends Renderer.LensExtension { onActivate() {}; registros }
  package.json { main: "dist/main.js", renderer: "dist/renderer.js", engines.freelens: "^2.0.0" }
  build: vite library mode, 2 runs; host recarrega quando os entries são reescritos (pnpm dev)

v1 (Freelens 1.x / OpenLens 6 / Lens 5):
  main.ts     → export default class X extends Main.LensExtension { onActivate() {} }
  renderer.tsx → export default class X extends Renderer.LensExtension { onActivate() {}; registros }
  package.json { main: "dist/main.js", renderer: "dist/renderer.js", engines: { lens: "^5.2.0" } }
```

---

## 14. Checklist de implementação para a extensão ESO (3 CRDs)

1. `package.json`: `engines.freelens: "^2.0.0"`, `main`/`renderer`, devDeps iguais às do exemplo.
2. Copiar do template: `vite.config.mjs`, `build/` (3 plugins), `tsconfig.*` (5 programas),
   `biome.jsonc`, `.nvmrc`, scripts.
3. `src/renderer/api/types.ts`: types compartilhados (condition, secretRef, etc.).
4. Modelos por versão em `src/renderer/api/<kind>/<kind>-<version>.ts`:
   `ExternalSecret` (namespaced, `external-secrets.io/v1` + `v1beta1`),
   `SecretStore` (namespaced, `v1` + `v1beta1`),
   `ClusterSecretStore` (cluster-wide, `namespaced = false`, `v1` + `v1beta1`).
   Um arquivo por versão, com `declare kind/apiVersion` literais e static helpers
   (ex.: `ExternalSecret.getReadyCondition(object)`, `getRefreshTime(object)`).
5. List pages por kind/versão (`KubeObjectListLayout`), unidas por `createAvailableVersionPage`
   (nova primeiro), registradas 1× em `clusterPages`/`clusterPageMenus`.
6. Details panels por versão, registrados com `Renderer.K8sApi.detailsFor`.
7. Menu items (Force Sync!) registrados com `Renderer.K8sApi.menuItemFor`.
8. `customResources = [modelos com página]`.
9. Status via colunas/badges (`success`/`error`/`warning` — ver fluxcd pattern) e details;
   sem registro de status no v2.
10. Error boundaries: mapear `clusterPages`, `kubeObjectDetailItems`, `kubeObjectMenuItems`
    com os wrappers do template (`error-boundary.tsx`).
11. Verificar: `pnpm type:check && pnpm build && pnpm test:unit`; instalar a pasta no Freelens
    ("From a directory") e rodar `pnpm dev` para o loop de desenvolvimento.
