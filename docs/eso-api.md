# External Secrets Operator (ESO) — Referência da API

> Documento de referência para a extensão Freelens do ESO.
> Fonte primária: tipos Go do controller (external-secrets/external-secrets, branch `main`)
> e docs oficiais em <https://external-secrets.io/latest/>.
> Todos os campos abaixo vêm dos tipos Go reais (tags json + marcadores kubebuilder), não de memória.

## Fontes

| Fonte                                        | URL                                                                                                                               |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Tipos Go v1 (ExternalSecret)                 | <https://raw.githubusercontent.com/external-secrets/external-secrets/main/apis/externalsecrets/v1/externalsecret_types.go>        |
| Tipos Go v1 (SecretStore/ClusterSecretStore) | <https://raw.githubusercontent.com/external-secrets/external-secrets/main/apis/externalsecrets/v1/secretstore_types.go>           |
| Tipos Go v1 (ClusterExternalSecret)          | <https://raw.githubusercontent.com/external-secrets/external-secrets/main/apis/externalsecrets/v1/clusterexternalsecret_types.go> |
| Tipos Go v1alpha1 (PushSecret)               | <https://raw.githubusercontent.com/external-secrets/external-secrets/main/apis/externalsecrets/v1alpha1/pushsecret_types.go>      |
| Tipos Go v1beta1 (legado)                    | <https://raw.githubusercontent.com/external-secrets/external-secrets/main/apis/externalsecrets/v1beta1/secretstore_types.go>      |
| Docs: ExternalSecret                         | <https://external-secrets.io/latest/api/externalsecret/>                                                                          |
| Docs: ClusterExternalSecret                  | <https://external-secrets.io/latest/api/clusterexternalsecret/>                                                                   |
| Docs: PushSecret                             | <https://external-secrets.io/latest/api/pushsecret/>                                                                              |
| Docs: SecretStore                            | <https://external-secrets.io/latest/api/secretstore/>                                                                             |
| Docs: ClusterSecretStore                     | <https://external-secrets.io/latest/api/clustersecretstore/>                                                                      |
| Spec completa (todos os types)               | <https://external-secrets.io/latest/api/spec/>                                                                                    |
| FAQ (force-sync, status)                     | <https://external-secrets.io/latest/introduction/faq/>                                                                            |

> A URL `https://external-secrets.io/latest/api/status/` retorna **404** — não existe página
> de status separada na doc atual. A documentação de status está nos tipos Go, nas páginas de
> cada resource e na FAQ (seções citadas abaixo).

## Visão geral

- **Grupo:** `external-secrets.io`
- **Versões servidas:** `v1` (storage, atual) para ExternalSecret, ClusterExternalSecret,
  SecretStore e ClusterSecretStore; `v1beta1` existe nesses CRDs com `served: false`
  (deprecated — migração 0.9.x); `v1alpha1` (obsoleta) nesses kinds. **PushSecret** e
  ClusterPushSecret só servem `v1alpha1`. Grupo auxiliar: `generators.external-secrets.io/v1alpha1`
  (Generators). Verificado nos CRDs da release `helm-chart-2.14.0` (ESO 2.14.0).
- **Category comum:** `external-secrets` (agrupa todos os recursos no kubectl/UI).
- **Short names:** ExternalSecret = `es`, ClusterExternalSecret = `ces`, PushSecret = `ps`,
  SecretStore = `ss`, ClusterSecretStore = `css`.

### Print columns (o que o `kubectl get` mostra — e o que a UI deve espelhar)

`ExternalSecret` (marcadores `+kubebuilder:printcolumn` do tipo Go):

| Coluna             | JSONPath                                        |
| ------------------ | ----------------------------------------------- |
| `StoreType`        | `.spec.secretStoreRef.kind`                     |
| `Store`            | `.spec.secretStoreRef.name`                     |
| `Refresh Interval` | `.spec.refreshInterval`                         |
| `Status`           | `.status.conditions[?(@.type=="Ready")].reason` |
| `Ready`            | `.status.conditions[?(@.type=="Ready")].status` |
| `Last Sync`        | `.status.refreshTime`                           |

`SecretStore` / `ClusterSecretStore`:

| Coluna         | JSONPath                                        |
| -------------- | ----------------------------------------------- |
| `AGE`          | `.metadata.creationTimestamp`                   |
| `Status`       | `.status.conditions[?(@.type=="Ready")].reason` |
| `Capabilities` | `.status.capabilities`                          |
| `Ready`        | `.status.conditions[?(@.type=="Ready")].status` |

`ClusterExternalSecret`:

| Coluna             | JSONPath                                        |
| ------------------ | ----------------------------------------------- |
| `Store`            | `.spec.externalSecretSpec.secretStoreRef.name`  |
| `Refresh Interval` | `.spec.refreshTime`                             |
| `Ready`            | `.status.conditions[?(@.type=="Ready")].status` |

`PushSecret`:

| Coluna      | JSONPath                                        |
| ----------- | ----------------------------------------------- |
| `AGE`       | `.metadata.creationTimestamp`                   |
| `Status`    | `.status.conditions[?(@.type=="Ready")].reason` |
| `Last Sync` | `.status.refreshTime`                           |

---

## 1. `ExternalSecret` (namespaced)

```yaml
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: hello-world
  namespace: default
spec:
  secretStoreRef: # qual store usar
    name: aws-store
    kind: SecretStore # SecretStore (default) | ClusterSecretStore
  refreshPolicy: Periodic # CreatedOnce | Periodic (default) | OnChange
  refreshInterval: 1h0m0s # Go duration; default "1h0m0s"; "0s" = cria uma vez e não atualiza
  syncWindows: # opcional; UTC; só vale p/ refreshPolicy Periodic
    kind: allow # allow | deny
    windows:
      - schedule: "0 9 * * 1-5"
        duration: 8h
  data: # mapeia chaves individuais
    - secretKey: username
      remoteRef:
        key: /path/to/secret
        property: username
  dataFrom: # extrai tudo / find / generator
    - extract:
        key: /path/to/all
  target:
    name: application-config
    creationPolicy: Owner # Owner (default) | Orphan | Merge | None | CreateOrMerge
    deletionPolicy: Retain # Delete | Merge | Retain (default)
    template: # blueprint do Secret criado (engine v2, go templates)
      metadata: {}
      data: {}
    immutable: false
status:
  refreshTime: "2024-01-01T00:00:00Z"
  syncedResourceVersion: "1-5c833527afd7ba3f426cb0082ee7e083"
  conditions:
    - type: Ready
      status: "True"
      reason: SecretSynced
      message: Secret was synced
      lastTransitionTime: "2024-01-01T00:00:00Z"
  binding: {}
```

### 1.1 `spec` (ExternalSecretSpec — campos completos)

| Campo (json)      | Tipo Go                             | Obrigatório?                                                        | Notas                                                                                                                                                     |
| ----------------- | ----------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `secretStoreRef`  | `SecretStoreRef{name, kind}`        | opcional no type (praticamente sempre presente)                     | `kind` ∈ `SecretStore`/`ClusterSecretStore` (default `SecretStore`); `name` regex DNS-1123                                                                |
| `target`          | `ExternalSecretTarget`              | opcional; default `{creationPolicy: Owner, deletionPolicy: Retain}` | `name` (default = metadata.name, imutável), `creationPolicy`, `deletionPolicy`, `template`, `manifest` (criar ConfigMap/CR em vez de Secret), `immutable` |
| `refreshPolicy`   | `ExternalSecretRefreshPolicy`       | opcional (default `Periodic`)                                       | `CreatedOnce` \| `Periodic` \| `OnChange`                                                                                                                 |
| `refreshInterval` | `*metav1.Duration`                  | opcional; default `1h0m0s`                                          | unidades Go: `ns`,`us`,`ms`,`s`,`m`,`h`; `0s` = fetch único                                                                                               |
| `syncWindows`     | `*ExternalSecretSyncWindows`        | opcional                                                            | `kind: allow\|deny` + `windows[] {schedule (5-campos cron ou @daily/@every), duration}`; avaliado em UTC; só `Periodic`                                   |
| `data`            | `[]ExternalSecretData`              | opcional                                                            | `secretKey` (obrig.), `remoteRef` (obrig.), `sourceRef` (override de store)                                                                               |
| `dataFrom`        | `[]ExternalSecretDataFromRemoteRef` | opcional                                                            | `extract`, `find`, `rewrite[]`, `sourceRef` (store ou generator)                                                                                          |

`remoteRef` = `{key (obrig.), metadataPolicy (None|Fetch), property, version, conversionStrategy (Default|Unicode), decodingStrategy (Auto|Base64|Base64URL|None), nullBytePolicy (Ignore|Fail)}`.

### 1.2 `status` (ExternalSecretStatus — TODOS os campos)

```go
type ExternalSecretStatus struct {
    // refreshTime: momento em que o secret externo foi buscado e o target atualizado
    RefreshTime metav1.Time `json:"refreshTime,omitempty"`   // +nullable

    // SyncedResourceVersion: última versão sincronizada (resourceVersion do Secret gerado)
    SyncedResourceVersion string `json:"syncedResourceVersion,omitempty"`

    Conditions []ExternalSecretStatusCondition `json:"conditions,omitempty"`

    // Binding: referência servicebinding.io ProvisionedService para o secret
    Binding corev1.LocalObjectReference `json:"binding,omitempty"`
}
```

> `status.creationTime` **não existe** no v1 — o "quando foi criado" é
> `metadata.creationTimestamp`; o "quando o status mudou pela última vez" é
> `status.conditions[].lastTransitionTime`.

### 1.3 `status.conditions` — tipos e significados

```go
// +kubebuilder:validation:Enum=Ready;Deleted
type ExternalSecretConditionType string

const (
    ExternalSecretReady   ExternalSecretConditionType = "Ready"   // o secret está pronto e sincronizado
    ExternalSecretDeleted ExternalSecretConditionType = "Deleted" // o secret foi deletado (deletionPolicy Delete)
)

type ExternalSecretStatusCondition struct {
    Type               ExternalSecretConditionType `json:"type"`
    Status             corev1.ConditionStatus      `json:"status"`   // True | False | Unknown
    Reason             string                      `json:"reason,omitempty"`
    Message            string                      `json:"message,omitempty"`
    LastTransitionTime metav1.Time                 `json:"lastTransitionTime,omitempty"`
}
```

**Condition `Ready`** — estado geral de sincronização. Reasons possíveis (constantes do controller):

| Reason                                                                           | Significado                                                                                                  |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `SecretSynced`                                                                   | Sincronizado com sucesso (Ready=True) — "Secret was synced"                                                  |
| `SecretSyncedError`                                                              | Erro ao sincronizar (Ready=False) — provider inacessível, secret faltando com `deletionPolicy: Retain`, etc. |
| `SecretDeleted`                                                                  | Secret foi deletado do cluster                                                                               |
| `SecretMissing`                                                                  | Secret target está ausente                                                                                   |
| `SecretImmutable`                                                                | Target é `immutable: true` e não pode ser atualizado                                                         |
| `SecretOwnedByOther`                                                             | Secret alvo é owned por outro ExternalSecret                                                                 |
| `UpdateFailed`                                                                   | Falha ao atualizar o Secret (também emitida como Event Warning)                                              |
| `MissingProviderSecret`                                                          | Secret não existe no provider                                                                                |
| `ParameterDeprecated`                                                            | Parâmetro deprecado em uso                                                                                   |
| `Created` / `Updated` / `Deleted`                                                | Eventos de lifecycle do Secret                                                                               |
| `ResourceSynced` / `ResourceSyncedError` / `ResourceDeleted` / `ResourceMissing` | Mesmas situações para `spec.target.manifest` (alvo não-Secret)                                               |

**Condition `Deleted`** — presente durante o fluxo de `deletionPolicy: Delete`: quando todos os
secrets do provider somem, o controller deleta o Secret do cluster e registra essa condição.

### 1.4 Annotations e labels do controller (constantes reais)

```go
AnnotationDataHash = "reconcile.external-secrets.io/data-hash" // hash dos dados no Secret gerado
AnnotationForceSync = "external-secrets.io/force-sync"         // força sincronização (ver seção 4)

LabelManaged     = "reconcile.external-secrets.io/managed"     // = "true" em todo Secret gerenciado
LabelManagedValue = "true"
LabelOwner       = "reconcile.external-secrets.io/created-by"  // aponta para o ExternalSecret dono (creationPolicy Owner)
```

### 1.5 Políticas de refresh (docs oficiais)

- **`Periodic` (default):** cria o Secret se não existe; atualiza a cada `refreshInterval`;
  `refreshInterval: 0` = cria uma vez e nunca atualiza; mudanças no spec do ES também disparam sync.
- **`CreatedOnce`:** sync único no primeiro reconcile do objeto (rastreado em
  `status.syncedResourceVersion` + `status.refreshTime`); re-sincroniza só se o Secret alvo for
  alterado/deletado; **recriar o ExternalSecret re-sincroniza** (status zera). Combinar com
  `target.immutable: true` para credenciais geradas uma única vez.
- **`OnChange`:** só sincroniza quando metadata ou spec do ExternalSecret mudam; independente de
  `refreshInterval`.
- **`syncWindows`** só funciona com `Periodic` (ou não definido). `kind: allow` → syncs só dentro
  de janela ativa; `kind: deny` → syncs bloqueados dentro da janela. Janela = cron UTC + `duration`.

---

## 2. `SecretStore` (namespaced) e `ClusterSecretStore` (cluster-wide)

Os dois compartilham os mesmos tipos de spec/status (`SecretStoreSpec`/`SecretStoreStatus`).
Diferença: escopo (Namespaced vs Cluster) e, no CSS, `spec.conditions` restringe namespaces.

```go
// +kubebuilder:resource:scope=Namespaced,categories={external-secrets},shortName=ss
type SecretStore struct { Spec SecretStoreSpec; Status SecretStoreStatus }

// +kubebuilder:resource:scope=Cluster,categories={external-secrets},shortName=css
type ClusterSecretStore struct { Spec SecretStoreSpec; Status SecretStoreStatus }
```

### 2.1 `spec` (SecretStoreSpec — campos completos)

| Campo (json)      | Tipo Go                         | Obrigatório?    | Notas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------- | ------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `controller`      | `string`                        | opcional        | seleciona qual controller ESO processa (análogo a ingressClassName)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `provider`        | `*SecretStoreProvider`          | **obrigatório** | **exatamente um** provider (MinProperties=1, MaxProperties=1): `aws`, `azurekv`, `akeyless`, `bitwardensecretsmanager`, `vault`, `ovh`, `gcpsm`, `oracle`, `ibm`, `yandexcertificatemanager`, `yandexlockbox`, `github`, `gitlab`, `onepassword`, `onepasswordSDK`, `webhook`, `kubernetes`, `crd`, `fake`, `senhasegura`, `scaleway`, `doppler`, `previder`, `onboardbase`, `keepersecurity`, `conjur`, `delinea`, `secretserver`, `chef`, `pulumi`, `fortanix`, `passworddepot`, `passbolt`, `dvls`, `infisical`, `beyondtrust`, `beyondtrustworkloadcredentials`, `cloudrusm`, `volcengine`, `ngrok`, `barbican`, `nebiusmysterybox`, `openbao` |
| `retrySettings`   | `*SecretStoreRetrySettings`     | opcional        | `maxRetries` (int32), `retryInterval` (string)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `refreshInterval` | `*intstr.IntOrString`           | opcional        | inteiro em **segundos** (legado) OU string Go duration ("5m","1h"); vazio/0 = default do controller                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `conditions`      | `[]ClusterSecretStoreCondition` | opcional        | **só relevante no ClusterSecretStore** — restringe quais namespaces podem usar o store                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

`ClusterSecretStoreCondition` (um OU outro dentro de cada item; basta um item casar):

```go
type ClusterSecretStoreCondition struct {
    NamespaceSelector *metav1.LabelSelector `json:"namespaceSelector,omitempty"` // matchLabels
    Namespaces        []string              `json:"namespaces,omitempty"`        // nomes exatos
    NamespaceRegexes  []string              `json:"namespaceRegexes,omitempty"`  // regex sobre nomes
}
```

### 2.2 `status` (SecretStoreStatus — TODOS os campos)

```go
type SecretStoreStatus struct {
    Conditions   []SecretStoreStatusCondition `json:"conditions,omitempty"`
    Capabilities SecretStoreCapabilities      `json:"capabilities,omitempty"`
}

type SecretStoreConditionType string
const SecretStoreReady SecretStoreConditionType = "Ready" // store pronto e capaz de servir requests

type SecretStoreStatusCondition struct {
    Type   SecretStoreConditionType `json:"type"`
    Status corev1.ConditionStatus   `json:"status"`
    Reason string                   `json:"reason,omitempty"`
    Message string                  `json:"message,omitempty"`
    LastTransitionTime metav1.Time  `json:"lastTransitionTime,omitempty"`
}

type SecretStoreCapabilities string
const (
    SecretStoreReadOnly  = "ReadOnly"
    SecretStoreWriteOnly = "WriteOnly"
    SecretStoreReadWrite = "ReadWrite"
)
```

**Condition `Ready`** no store: se `status: "False"`, os controllers de ExternalSecret **devem
impedir tentativas de fetch**. Reasons (v1):

| Reason                      | Significado                                                 |
| --------------------------- | ----------------------------------------------------------- |
| `Valid`                     | Store validado com sucesso (Ready=True) — "store validated" |
| `ValidationFailed`          | Validação do store falhou                                   |
| `InvalidStoreConfiguration` | Configuração do store inválida                              |
| `InvalidProviderConfig`     | Configuração do provider inválida                           |
| `ProviderNotFound`          | Provider citado no spec não pôde ser resolvido              |
| `ValidationUnknown`         | Validação em estado desconhecido                            |
| `StoreUnmaintained`         | Provider sem mantenedor explícito (warning)                 |
| `StoreDeprecated`           | Provider deprecado                                          |

> Nota histórica: no **v1beta1** os reasons eram os mesmos (`Valid`,
> `InvalidStoreConfiguration`, `InvalidProviderConfig`, `ValidationFailed`); o type de condição
> sempre foi `Ready` no v1beta1/v1. Muita documentação antiga fala em condição "Valid" — na
> prática é a condition **`type: Ready` com `reason: Valid`**.

### 2.3 YAML de exemplo (docs oficiais, resumido)

```yaml
apiVersion: external-secrets.io/v1
kind: SecretStore
metadata:
  name: example
  namespace: example-ns
spec:
  controller: dev # opcional
  retrySettings:
    maxRetries: 5
    retryInterval: "10s"
  provider: # exatamente um
    vault:
      server: "https://vault.acme.org"
      path: "secret"
      version: "v2"
      auth:
        tokenSecretRef:
          name: "my-secret"
          key: "vault-token"
status:
  conditions:
    - type: Ready
      status: "False"
      reason: "ValidationFailed"
      message: "SecretStore validation failed"
      lastTransitionTime: "2019-08-12T12:33:02Z"
```

```yaml
apiVersion: external-secrets.io/v1
kind: ClusterSecretStore
metadata:
  name: example
spec:
  provider:
    gcpsm:
      projectID: myproject
      auth:
        secretRef:
          secretAccessKeySecretRef:
            name: gcpsm-secret
            namespace: example
            key: secret-access-credentials
  conditions: # restringe quais namespaces podem usar o CSS
    - namespaceSelector:
        matchLabels:
          my.namespace.io/some-label: "value"
    - namespaces:
        - "namespace-a"
        - "namespace-b"
    - namespaceRegexes:
        - "^namespace-a-.*$"
```

Annotation útil: `external-secrets.io/ignore-maintenance-checks: "true"` desativa events de
warning de stores não mantidos.

---

## 3. Como detectar visualmente o estado de sync (sucesso vs erro)

**ExternalSecret:**

```text
$ kubectl get es
NAME           STORETYPE   STORE       REFRESH INTERVAL   STATUS          READY   LAST SYNC
hello-world    SecretStore aws-store   1h0m0s             SecretSynced    True    2024-01-01T00:00:00Z
```

- **Sucesso:** coluna `Ready= True` e `Status= SecretSynced` (a coluna Status é literalmente
  `.status.conditions[?(@.type=="Ready")].reason`).
- **Erro:** `Ready= False` + reasons como `SecretSyncedError`, `UpdateFailed`, `SecretImmutable`,
  `SecretOwnedByOther`, `MissingProviderSecret`.
- `kubectl describe es my-external-secret` mostra:

```text
Status:
  Conditions:
    Last Transition Time:   2022-05-21T21:02:47Z
    Message:                Secret was synced
    Reason:                 SecretSynced
    Status:                 True
    Type:                   Ready
  Refresh Time:             2022-05-21T21:06:47Z
  Synced Resource Version:  1-5c833527afd7ba3f426cb0082ee7e083
Events:
  Type     Reason        Age    From               Message
  ----     ------        ----   ----               -------
  Warning  UpdateFailed  4m12s  external-secrets   secrets "yyyyyyy" already exists
  Normal   Updated       12s    external-secrets   Updated Secret
```

- **Último sync:** `status.refreshTime` (FAQ: `kubectl get es my-external-secret -o yaml | grep refreshTime`).
- **Última mudança de estado:** `status.conditions[].lastTransitionTime`.
- **Condição `Deleted`** (tipo adicional): aparecer no fluxo de `deletionPolicy: Delete`.

**SecretStore / ClusterSecretStore:**

```text
$ kubectl get ss / css
NAME      AGE    STATUS    CAPABILITIES   READY
example   10m    Valid     ReadWrite      True
```

- **Ok:** `READY= True`, `STATUS= Valid` ("store validated").
- **Erro:** `READY= False` com `ValidationFailed`, `InvalidStoreConfiguration`,
  `InvalidProviderConfig`, `ProviderNotFound`. Se o store não está Ready, **nenhum
  ExternalSecret que o referencie sincroniza** (o controller ES bloqueia o fetch).
- `status.capabilities`: `ReadOnly` | `WriteOnly` | `ReadWrite`.

---

## 4. Refresh manual ("force-sync")

### 4.1 O mecanismo

O controller observa a annotation **`external-secrets.io/force-sync`** no ExternalSecret
(constante Go `AnnotationForceSync`). Qualquer mudança de annotation/label/spec do recurso
dispara um reconcile; a convenção é gravar um timestamp novo a cada vez, garantindo que o valor
sempre mude:

```bash
kubectl annotate es my-es force-sync=$(date +%s) --overwrite
```

(Comando exato da doc "Manual Refresh" em <https://external-secrets.io/latest/api/externalsecret/>.
A doc usa a chave curta `force-sync` no exemplo; a chave completa reconhecida pelo controller é
`external-secrets.io/force-sync` — use a completa por segurança, como a própria FAQ faz.)

### 4.2 Em quais recursos funciona

- **`ExternalSecret`** — o caso principal (comando acima).
- **`ClusterExternalSecret`** — propaga para todos os ExternalSecrets que ele gerencia
  (o comentário do tipo Go diz que os ExternalSecrets de um CES "mirror the state and value of
  this annotation"). Comando da FAQ oficial:

```bash
kubectl annotate ces my-ces external-secrets.io/force-sync=$(date +%s) --overwrite
```

- **Não se aplica** a SecretStore/ClusterSecretStore (o `spec.refreshInterval` do _store_ —
  inteiro em segundos ou duration string, default do controller — é que controla re-validação
  periódica do store, não um force-sync manual).

### 4.3 Interação com `refreshPolicy`

A doc oficial ressalva: _"If supported by the configured refreshPolicy"_. Ou seja:

- `Periodic` (default): force-sync funciona — annotation nova dispara sincronização imediata.
- `CreatedOnce`: o sync é "uma vez por objeto"; o force-sync **não** re-sincroniza
  (o objeto já sincronizou e a política proíbe atualizações).
- `OnChange`: mudar a annotation **é** uma mudança de metadata, portanto dispara o sync — o
  force-sync funciona naturalmente nesse policy (aliás, editar metadata/spec é o único gatilho).

### 4.4 Relevância para a extensão Freelens

Um menu item "Force Sync" implementa exatamente o `kubectl annotate`:

```ts
const store = ExternalSecret.getStore<ExternalSecret>();

await store.patch(
  object,
  {
    metadata: {
      annotations: {
        "external-secrets.io/force-sync": String(Math.floor(Date.now() / 1000)),
      },
    },
  },
  "merge",
);
```

Depois do patch, o usuário vê `Ready=True/SecretSynced` e `refreshTime` atualizado quando a
sincronização termina; em caso de erro, `Ready=False` com `SecretSyncedError` + message.

---

## 5. `ClusterExternalSecret` (cluster-wide)

Cria um `ExternalSecret` com o mesmo spec em cada namespace selecionado, e acompanha em quais
deu certo. Tipos Go em `apis/externalsecrets/v1/clusterexternalsecret_types.go`.

```yaml
apiVersion: external-secrets.io/v1
kind: ClusterExternalSecret
metadata:
  name: hello-everywhere
spec:
  externalSecretName: hello-everywhere # default = metadata.name
  refreshTime: 1m # json do campo Go RefreshInterval: com que frequência rechecar os namespaces
  namespaceSelectors: # ORed; namespaceSelector e namespaces (singular/lista) estão deprecated
    - matchLabels:
        kubernetes.io/metadata.name: default
  externalSecretMetadata: # labels/annotations dos ExternalSecrets criados
    labels: {}
  externalSecretSpec: # ExternalSecretSpec completo (seção 1.1)
    secretStoreRef:
      name: fake-cluster-store
      kind: ClusterSecretStore
    target:
      name: hello-everywhere
    data:
      - secretKey: hello
        remoteRef:
          key: /hello
status:
  externalSecretName: hello-everywhere
  provisionedNamespaces: [default]
  failedNamespaces:
    - namespace: locked
      reason: secret store not found
  conditions:
    - type: Ready
      status: "False"
      message: one or more namespaces failed
```

### 5.1 `spec` (ClusterExternalSecretSpec)

| Campo (json)             | Tipo Go                   | Obrigatório?                     | Notas                                                                          |
| ------------------------ | ------------------------- | -------------------------------- | ------------------------------------------------------------------------------ |
| `externalSecretSpec`     | `ExternalSecretSpec`      | **obrigatório**                  | o spec dos ExternalSecrets criados                                             |
| `externalSecretName`     | `string`                  | opcional (default metadata.name) | nome dos ExternalSecrets criados                                               |
| `externalSecretMetadata` | `ExternalSecretMetadata`  | opcional                         | `annotations`, `labels` dos ExternalSecrets criados                            |
| `namespaceSelector`      | `*metav1.LabelSelector`   | opcional, **deprecated**         | use `namespaceSelectors`                                                       |
| `namespaceSelectors`     | `[]*metav1.LabelSelector` | opcional                         | ORed entre si                                                                  |
| `namespaces`             | `[]string`                | opcional, **deprecated**         | nomes exatos, ORed com os selectors                                            |
| `refreshTime`            | `*metav1.Duration`        | opcional, sem default            | campo Go `RefreshInterval`; é a coluna `Refresh Interval` do `kubectl get ces` |

### 5.2 `status` (ClusterExternalSecretStatus)

```go
type ClusterExternalSecretStatus struct {
    ExternalSecretName    string                                  `json:"externalSecretName,omitempty"`
    FailedNamespaces      []ClusterExternalSecretNamespaceFailure `json:"failedNamespaces,omitempty"`      // {namespace, reason}
    ProvisionedNamespaces []string                                `json:"provisionedNamespaces,omitempty"`
    Conditions            []ClusterExternalSecretStatusCondition  `json:"conditions,omitempty"`
}

type ClusterExternalSecretStatusCondition struct {
    Type    ClusterExternalSecretConditionType `json:"type"`   // "Ready"
    Status  corev1.ConditionStatus             `json:"status"` // True | False | Unknown
    Message string                             `json:"message,omitempty"`
}
```

> A condition do CES **não tem `reason` nem `lastTransitionTime`**: só `message`, que nomeia os
> namespaces que falharam. Por isso a UI mostra `Ready` + `Message`, e não uma coluna `Status`.

O force-sync vale para o CES e propaga aos ExternalSecrets filhos (seção 4.2).

---

## 6. `PushSecret` (namespaced, `v1alpha1`)

O caminho inverso: lê um Secret do cluster (ou um generator) e **empurra** os valores para um ou
mais stores. Tipos Go em `apis/externalsecrets/v1alpha1/pushsecret_types.go`; só `v1alpha1` é
servida. Short name `ps`.

```yaml
apiVersion: external-secrets.io/v1alpha1
kind: PushSecret
metadata:
  name: hello-world
  namespace: default
spec:
  refreshInterval: 1h0m0s # default
  updatePolicy: Replace # Replace (default) | IfNotExists
  deletionPolicy: None # None (default) | Delete
  secretStoreRefs: # obrigatório; por nome ou labelSelector
    - name: fake-store
      kind: SecretStore # SecretStore (default) | ClusterSecretStore
  selector: # obrigatório; exatamente um de secret | generatorRef
    secret:
      name: hello-world # ou selector: {matchLabels: ...}
  data: # chave a chave
    - match:
        secretKey: hello # omitido = o Secret inteiro
        remoteRef:
          remoteKey: /pushed/hello
          property: value
      conversionStrategy: None # None (default) | ReverseUnicode
  dataTo: # em massa
    - storeRef: {name: fake-store}
      match: {regexp: "^DB_"}
      remoteKey: /bundle # com remoteKey, tudo num JSON; sem, uma chave remota por chave
      rewrite: [{regexp: {source: "^DB_", target: ""}}]
status:
  refreshTime: "2024-01-01T00:00:00Z"
  syncedResourceVersion: "1-abc"
  syncedPushSecrets: # store -> remoteKey -> PushSecretData
    fake-store:
      /pushed/hello: {match: {secretKey: hello, remoteRef: {remoteKey: /pushed/hello}}}
  conditions:
    - type: Ready
      status: "True"
      reason: Synced
      message: PushSecret synced successfully
      lastTransitionTime: "2024-01-01T00:00:00Z"
```

### 6.1 `spec` (PushSecretSpec)

| Campo (json)      | Tipo Go                    | Obrigatório?               | Notas                                                                                                          |
| ----------------- | -------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `refreshInterval` | `*metav1.Duration`         | opcional (default 1h0m0s)  |                                                                                                                |
| `secretStoreRefs` | `[]PushSecretStoreRef`     | **obrigatório**            | `{name?, labelSelector?, kind? (default SecretStore)}`                                                         |
| `updatePolicy`    | `PushSecretUpdatePolicy`   | opcional (default Replace) | `Replace` \| `IfNotExists`                                                                                     |
| `deletionPolicy`  | `PushSecretDeletionPolicy` | opcional (default None)    | `Delete` \| `None`                                                                                             |
| `selector`        | `PushSecretSelector`       | **obrigatório**            | exatamente um: `secret {name? \| selector?}` ou `generatorRef {apiVersion?, kind, name}`                       |
| `data`            | `[]PushSecretData`         | opcional                   | `match {secretKey?, remoteRef {remoteKey, property?}}`, `metadata` (JSON), `conversionStrategy`                |
| `dataTo`          | `[]PushSecretDataTo`       | opcional                   | `storeRef`, `remoteKey?`, `match.regexp?`, `rewrite[] {regexp \| transform}`, `metadata`, `conversionStrategy` |
| `template`        | `*ExternalSecretTemplate`  | opcional                   | blueprint do Secret; a extensão não lê                                                                         |

### 6.2 `status` (PushSecretStatus)

```go
type PushSecretStatus struct {
    RefreshTime           metav1.Time                 `json:"refreshTime,omitempty"`
    SyncedResourceVersion string                      `json:"syncedResourceVersion,omitempty"`
    SyncedPushSecrets     SyncedPushSecretsMap        `json:"syncedPushSecrets,omitempty"` // map[store]map[remoteKey]PushSecretData
    Conditions            []PushSecretStatusCondition `json:"conditions,omitempty"`
}

type PushSecretStatusCondition struct {
    Type               PushSecretConditionType `json:"type"`   // "Ready"
    Status             corev1.ConditionStatus  `json:"status"`
    Reason             string                  `json:"reason,omitempty"`
    Message            string                  `json:"message,omitempty"`
    LastTransitionTime metav1.Time             `json:"lastTransitionTime,omitempty"`
}
```

Reasons (constantes do controller): `Synced` (Ready=True), `Errored` (Ready=False),
`SourceDeleted` (o Secret de origem sumiu e os remotos foram limpos, com `deletionPolicy: Delete`).

A anotação `external-secrets.io/force-sync` não está documentada para PushSecret; a extensão
não oferece Force Sync nesse kind.

---

## 7. O caminho de volta: do Secret ao ExternalSecret

Um Secret gerado pelo ESO carrega (seção 1.4) a label `reconcile.external-secrets.io/managed: "true"`
e, com `creationPolicy: Owner` (default), um `ownerReference` de `kind: ExternalSecret`. A
extensão lê os dois do próprio Secret para mostrar, nos detalhes dele, um link para o
ExternalSecret dono; com `Orphan`, `Merge` ou `CreateOrMerge` não há owner e só a label aparece.
