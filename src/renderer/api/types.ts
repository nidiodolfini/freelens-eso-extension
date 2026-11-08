import { Renderer } from "@freelensapp/extensions";

/**
 * The CRD metadata of an External Secrets Operator resource, with the
 * human-readable title the extension shows in its pages.
 */
export interface EsoKubeObjectCRD extends Renderer.K8sApi.LensExtensionKubeObjectCRD {
  title: string;
}

/**
 * A status condition, as ESO writes it into `status.conditions`: the
 * `BaseKubeObjectCondition` of the host's kube objects, which `K8sApi`
 * re-exports. The condition types of every kind are assignable to it.
 */
export type EsoCondition = Renderer.K8sApi.BaseKubeObjectCondition;

/**
 * `corev1.ConditionStatus`, the status of every condition.
 */
export type ConditionStatus = EsoCondition["status"];

/**
 * `metav1.LabelSelector`, as the host declares it.
 */
export type LabelSelector = Renderer.K8sApi.LabelSelector;

export interface SecretStoreRef {
  name: string;
  kind?: "SecretStore" | "ClusterSecretStore";
}

/**
 * `spec.refreshPolicy` of an ExternalSecret. `Periodic` is the controller
 * default when the field is omitted.
 */
export type ExternalSecretRefreshPolicy = "Periodic" | "CreatedOnce" | "OnChange";

/**
 * `spec.target.creationPolicy`: who owns the generated Secret.
 */
export type ExternalSecretCreationPolicy = "Owner" | "Orphan" | "Merge" | "None" | "CreateOrMerge";

/**
 * `spec.target.deletionPolicy`: what happens to the generated Secret when the
 * ExternalSecret is deleted.
 */
export type ExternalSecretDeletionPolicy = "Delete" | "Merge" | "Retain";

export type ExternalSecretMetadataPolicy = "None" | "Fetch";
export type ExternalSecretConversionStrategy = "Default" | "Unicode";
export type ExternalSecretDecodingStrategy = "Auto" | "Base64" | "Base64URL" | "None";
export type ExternalSecretNullBytePolicy = "Ignore" | "Fail";

/**
 * `spec.data[].remoteRef`: the reference to a single value in the provider.
 */
export interface ExternalSecretDataRemoteRef {
  key: string;
  metadataPolicy?: ExternalSecretMetadataPolicy;
  property?: string;
  version?: string;
  conversionStrategy?: ExternalSecretConversionStrategy;
  decodingStrategy?: ExternalSecretDecodingStrategy;
  nullBytePolicy?: ExternalSecretNullBytePolicy;
}

/**
 * The kinds of the `generators.external-secrets.io` group a `generatorRef`
 * may point to.
 */
export type GeneratorKind =
  | "ACRAccessToken"
  | "BeyondtrustWorkloadCredentialsDynamicSecret"
  | "ClusterGenerator"
  | "CloudsmithAccessToken"
  | "ECRAuthorizationToken"
  | "Fake"
  | "GCRAccessToken"
  | "GithubAccessToken"
  | "GitlabDeployToken"
  | "QuayAccessToken"
  | "Password"
  | "SSHKey"
  | "STSSessionToken"
  | "UUID"
  | "VaultDynamicSecret"
  | "Webhook"
  | "Grafana"
  | "MFA";

export interface GeneratorRef {
  apiVersion?: string;
  kind: GeneratorKind;
  name: string;
}

/**
 * `spec.data[].sourceRef`: overrides the store the value is pulled from.
 */
export interface StoreSourceRef {
  storeRef?: SecretStoreRef;
  generatorRef?: GeneratorRef;
}

/**
 * `spec.dataFrom[].sourceRef`: a store or a generator, one of the two.
 */
export interface StoreGeneratorSourceRef {
  storeRef?: SecretStoreRef;
  generatorRef?: GeneratorRef;
}

/**
 * `spec.data[]`: one key of the generated Secret mapped to one remote value.
 */
export interface ExternalSecretData {
  secretKey: string;
  remoteRef: ExternalSecretDataRemoteRef;
  sourceRef?: StoreSourceRef;
}

export interface FindName {
  regexp?: string;
}

/**
 * `spec.dataFrom[].find`: finds provider secrets by path, name or tags.
 */
export interface ExternalSecretFind {
  path?: string;
  name?: FindName;
  tags?: Record<string, string>;
  conversionStrategy?: ExternalSecretConversionStrategy;
  decodingStrategy?: ExternalSecretDecodingStrategy;
  nullBytePolicy?: ExternalSecretNullBytePolicy;
}

export type ExternalSecretRewriteMergePriorityPolicy = "IgnoreNotFound" | "Strict";
export type ExternalSecretRewriteMergeConflictPolicy = "Ignore" | "Error";
export type ExternalSecretRewriteMergeStrategy = "Extract" | "JSON";

export interface ExternalSecretRewriteMerge {
  into?: string;
  priority?: string[];
  priorityPolicy?: ExternalSecretRewriteMergePriorityPolicy;
  conflictPolicy?: ExternalSecretRewriteMergeConflictPolicy;
  strategy?: ExternalSecretRewriteMergeStrategy;
}

export interface ExternalSecretRewriteRegexp {
  source: string;
  target: string;
}

export interface ExternalSecretRewriteTransform {
  template: string;
}

/**
 * `spec.dataFrom[].rewrite[]`: one of `merge`, `regexp` or `transform`.
 */
export interface ExternalSecretRewrite {
  merge?: ExternalSecretRewriteMerge;
  regexp?: ExternalSecretRewriteRegexp;
  transform?: ExternalSecretRewriteTransform;
}

/**
 * `spec.dataFrom[]`: takes many values at once, with `extract` or `find`.
 */
export interface ExternalSecretDataFromRemoteRef {
  extract?: ExternalSecretDataRemoteRef;
  find?: ExternalSecretFind;
  rewrite?: ExternalSecretRewrite[];
  sourceRef?: StoreGeneratorSourceRef;
}

/**
 * `spec.target`: the Secret (or other manifest) the controller writes. The
 * `template` and `manifest` fields, which the UI does not read, are left out.
 */
export interface ExternalSecretTarget {
  name?: string;
  creationPolicy?: ExternalSecretCreationPolicy;
  deletionPolicy?: ExternalSecretDeletionPolicy;
  immutable?: boolean;
}

export type ExternalSecretSyncWindowKind = "allow" | "deny";

export interface ExternalSecretSyncWindowEntry {
  schedule: string;
  duration: string;
}

/**
 * `spec.syncWindows`: restricts syncs of `refreshPolicy: Periodic` to the
 * given UTC windows.
 */
export interface ExternalSecretSyncWindows {
  kind: ExternalSecretSyncWindowKind;
  windows: ExternalSecretSyncWindowEntry[];
}

export interface ExternalSecretSpec {
  secretStoreRef?: SecretStoreRef;
  refreshPolicy?: ExternalSecretRefreshPolicy;
  refreshInterval?: string;
  syncWindows?: ExternalSecretSyncWindows;
  data?: ExternalSecretData[];
  dataFrom?: ExternalSecretDataFromRemoteRef[];
  target?: ExternalSecretTarget;
}

export interface ExternalSecretStatus {
  refreshTime?: string;
  syncedResourceVersion?: string;
  conditions?: EsoCondition[];
  binding?: {
    name: string;
  };
}

/**
 * `spec.externalSecretMetadata` of a ClusterExternalSecret: the labels and
 * annotations of the ExternalSecrets it creates.
 */
export interface ExternalSecretMetadata {
  annotations?: Record<string, string>;
  labels?: Record<string, string>;
}

export interface ClusterExternalSecretSpec {
  externalSecretSpec: ExternalSecretSpec;
  externalSecretName?: string;
  externalSecretMetadata?: ExternalSecretMetadata;
  /**
   * Deprecated by the controller in favour of `namespaceSelectors`.
   */
  namespaceSelector?: LabelSelector;
  namespaceSelectors?: LabelSelector[];
  /**
   * Deprecated by the controller in favour of `namespaceSelectors`.
   */
  namespaces?: string[];
  /**
   * The interval at which the controller rechecks the namespaces, under the
   * json name `refreshTime` of the Go field `RefreshInterval`.
   */
  refreshTime?: string;
}

/**
 * A condition of a ClusterExternalSecret: the controller writes no reason and
 * no transition time, only the message naming the failed namespaces.
 */
export interface ClusterExternalSecretStatusCondition {
  type: string;
  status: ConditionStatus;
  message?: string;
}

export interface ClusterExternalSecretNamespaceFailure {
  namespace: string;
  reason?: string;
}

export interface ClusterExternalSecretStatus {
  externalSecretName?: string;
  failedNamespaces?: ClusterExternalSecretNamespaceFailure[];
  provisionedNamespaces?: string[];
  conditions?: ClusterExternalSecretStatusCondition[];
}

/**
 * `spec.secretStoreRefs[]` of a PushSecret: a store by name or by label
 * selector. `SecretStore` is the controller default for the kind.
 */
export interface PushSecretStoreRef {
  name?: string;
  labelSelector?: LabelSelector;
  kind?: "SecretStore" | "ClusterSecretStore";
}

/**
 * `spec.updatePolicy`: `Replace` is the controller default.
 */
export type PushSecretUpdatePolicy = "Replace" | "IfNotExists";

/**
 * `spec.deletionPolicy`: `None` is the controller default.
 */
export type PushSecretDeletionPolicy = "Delete" | "None";

export type PushSecretConversionStrategy = "None" | "ReverseUnicode";

export interface PushSecretSecret {
  name?: string;
  selector?: LabelSelector;
}

/**
 * `spec.selector`: the source of the pushed values, a Secret or a generator.
 */
export interface PushSecretSelector {
  secret?: PushSecretSecret;
  generatorRef?: GeneratorRef;
}

export interface PushSecretRemoteRef {
  remoteKey: string;
  property?: string;
}

export interface PushSecretMatch {
  secretKey?: string;
  remoteRef: PushSecretRemoteRef;
}

/**
 * `spec.data[]`: one key of the source Secret pushed to one remote key. The
 * `metadata` is provider-specific JSON.
 */
export interface PushSecretData {
  match: PushSecretMatch;
  metadata?: unknown;
  conversionStrategy?: PushSecretConversionStrategy;
}

export interface PushSecretDataToMatch {
  regexp?: string;
}

export interface PushSecretRewrite {
  regexp?: ExternalSecretRewriteRegexp;
  transform?: ExternalSecretRewriteTransform;
}

/**
 * `spec.dataTo[]`: pushes the matched keys of the source Secret to a store,
 * one remote key each or bundled under `remoteKey`.
 */
export interface PushSecretDataTo {
  storeRef?: PushSecretStoreRef;
  remoteKey?: string;
  match?: PushSecretDataToMatch;
  rewrite?: PushSecretRewrite[];
  metadata?: unknown;
  conversionStrategy?: PushSecretConversionStrategy;
}

/**
 * The spec of a PushSecret. The `template` field, which the UI does not
 * read, is left out.
 */
export interface PushSecretSpec {
  refreshInterval?: string;
  secretStoreRefs: PushSecretStoreRef[];
  updatePolicy?: PushSecretUpdatePolicy;
  deletionPolicy?: PushSecretDeletionPolicy;
  selector: PushSecretSelector;
  data?: PushSecretData[];
  dataTo?: PushSecretDataTo[];
}

export interface PushSecretStatusCondition {
  type: string;
  status: ConditionStatus;
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
}

/**
 * `status.syncedPushSecrets`: by store name, then by remote key, what was
 * pushed.
 */
export type SyncedPushSecretsMap = Record<string, Record<string, PushSecretData>>;

export interface PushSecretStatus {
  refreshTime?: string;
  syncedResourceVersion?: string;
  syncedPushSecrets?: SyncedPushSecretsMap;
  conditions?: PushSecretStatusCondition[];
}

/**
 * `spec.retrySettings` of a SecretStore / ClusterSecretStore.
 */
export interface SecretStoreRetrySettings {
  maxRetries?: number;
  retryInterval?: string;
}

/**
 * `spec.provider` of a SecretStore / ClusterSecretStore. The controller
 * requires exactly one of the 40+ backends (`aws`, `vault`, `gcpsm`, `fake`,
 * ...) to be set, and the shape of each backend is provider-specific, so the
 * value is left as an open record.
 */
export type SecretStoreProvider = { [name: string]: unknown };

export interface SecretStoreSpec {
  controller?: string;
  provider?: SecretStoreProvider;
  retrySettings?: SecretStoreRetrySettings;
  /**
   * Seconds (legacy integer) or a Go duration string.
   */
  refreshInterval?: number | string;
}

export type SecretStoreCapabilities = "ReadOnly" | "WriteOnly" | "ReadWrite";

export interface SecretStoreStatus {
  conditions?: EsoCondition[];
  capabilities?: SecretStoreCapabilities;
}
