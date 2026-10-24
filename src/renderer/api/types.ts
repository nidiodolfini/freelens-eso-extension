import { Renderer } from "@freelensapp/extensions";

/**
 * The CRD metadata of an External Secrets Operator resource, with the
 * human-readable title the extension shows in its pages.
 */
export interface EsoKubeObjectCRD extends Renderer.K8sApi.LensExtensionKubeObjectCRD {
  title: string;
}

/**
 * A status condition, as ESO writes it into `status.conditions`. ESO's own
 * condition types (Ready, Deleted) are not an enum of the extension: the
 * field stays a plain string so the models can also read conditions of older
 * objects.
 */
export interface EsoCondition {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
}

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

/**
 * `spec.data[].remoteRef`: the reference to a single value in the provider.
 */
export interface ExternalSecretRemoteRef {
  key: string;
  property?: string;
  version?: string;
  metadataPolicy?: "None" | "Fetch";
  conversionStrategy?: "Default" | "Unicode";
  decodingStrategy?: "Auto" | "Base64" | "Base64URL" | "None";
  nullBytePolicy?: "Ignore" | "Fail";
}

/**
 * `spec.data[]`: one key of the generated Secret mapped to one remote value.
 */
export interface ExternalSecretData {
  secretKey: string;
  remoteRef: ExternalSecretRemoteRef;
}

/**
 * `spec.dataFrom[]`: takes many values at once. The UI reads only the
 * provider key of the most common variant, `extract`.
 */
export interface ExternalSecretDataFromRemoteRef {
  extract?: {
    key: string;
    property?: string;
  };
}

/**
 * `spec.target`: the Secret (or other manifest) the controller writes.
 */
export interface ExternalSecretTarget {
  name?: string;
  creationPolicy?: ExternalSecretCreationPolicy;
  deletionPolicy?: ExternalSecretDeletionPolicy;
  immutable?: boolean;
}

/**
 * `spec.syncWindows`: restricts syncs of `refreshPolicy: Periodic` to the
 * given UTC windows.
 */
export interface ExternalSecretSyncWindows {
  kind?: "allow" | "deny";
  windows?: {
    schedule: string;
    duration: string;
  }[];
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
