import type {
  EsoCondition,
  ExternalSecretDataFromRemoteRef,
  ExternalSecretDataRemoteRef,
  GeneratorRef,
  LabelSelector,
  PushSecretData,
  PushSecretDataTo,
  PushSecretStoreRef,
  SecretStoreCapabilities,
  SecretStoreProvider,
  SecretStoreRef,
  SecretStoreStatus,
} from "./types";

/**
 * Pure helpers shared by the models and the details panels. Every ESO kind
 * reports its state through a `Ready` condition, so the statics of the models
 * delegate to these functions, with the default texts of their kind. The
 * formatters turn the references of a spec into the one-line texts the
 * details panels show.
 */

export function getReadyCondition(conditions: EsoCondition[] | undefined): EsoCondition | undefined {
  return conditions?.find((condition) => condition.type === "Ready");
}

/**
 * The READY column of `kubectl get`: the status of the Ready condition, or
 * undefined when the controller has not written one yet.
 */
export function getReady(conditions: EsoCondition[] | undefined): boolean | undefined {
  const condition = getReadyCondition(conditions);
  if (condition?.status === "True") return true;
  if (condition?.status === "False") return false;
  return undefined;
}

/**
 * The STATUS column of `kubectl get`: the reason of the Ready condition, with
 * the controller defaults of the kind for a missing reason.
 */
export function getStatusText(conditions: EsoCondition[] | undefined, readyText: string, notReadyText: string): string {
  const condition = getReadyCondition(conditions);
  if (condition?.status === "True") return condition.reason ?? readyText;
  if (condition?.status === "False") return condition.reason ?? notReadyText;
  return "Unknown";
}

/**
 * The STATUS column of `kubectl get ss/css`, with the defaults of the stores.
 */
export function getStoreStatusText(conditions: EsoCondition[] | undefined): string {
  return getStatusText(conditions, "Valid", "Invalid");
}

/**
 * The STATUS column of `kubectl get ps`, with the reasons the PushSecret
 * controller writes, `Synced` and `Errored`, as the defaults.
 */
export function getPushSecretStatusText(conditions: EsoCondition[] | undefined): string {
  return getStatusText(conditions, "Synced", "Errored");
}

/**
 * The message of the Ready condition, which carries the error of a failed
 * sync.
 */
export function getReadyMessage(conditions: EsoCondition[] | undefined): string | undefined {
  return getReadyCondition(conditions)?.message || undefined;
}

/**
 * The Badge class of a condition status; empty when there is no condition.
 */
export function getConditionClass(status: string | undefined): string {
  switch (status) {
    case "True":
      return "success";
    case "False":
      return "error";
    case "Unknown":
      return "warning";
    default:
      return "";
  }
}

export function getStatusClass(conditions: EsoCondition[] | undefined): string {
  return getConditionClass(getReadyCondition(conditions)?.status);
}

export function getStoreCapabilities(status: SecretStoreStatus | undefined): SecretStoreCapabilities | undefined {
  return status?.capabilities;
}

/**
 * The name of the provider backend: the first key of `spec.provider` with a
 * defined value. The controller requires exactly one, so this is either that
 * one or undefined for an incomplete object.
 */
export function getStoreProviderName(provider: SecretStoreProvider | undefined): string | undefined {
  if (!provider) return undefined;
  return Object.keys(provider).find((name) => provider[name] !== undefined && provider[name] !== null);
}

/**
 * `spec.refreshInterval` of a store, the interval of its revalidation: a
 * number of seconds, the legacy form, or a Go duration string. Undefined when
 * the field is unset, and the controller's default applies.
 */
export function formatStoreRefreshInterval(refreshInterval: number | string | undefined): string | undefined {
  if (refreshInterval === undefined || refreshInterval === "") return undefined;
  return typeof refreshInterval === "number" ? `${refreshInterval}s` : refreshInterval;
}

/**
 * A label selector as one line: `a=b, c in (d, e)`, or `*` for a selector
 * that matches everything.
 */
export function formatLabelSelector(selector: LabelSelector | undefined): string {
  const parts = Object.entries(selector?.matchLabels ?? {}).map(([key, value]) => `${key}=${value}`);
  for (const expression of selector?.matchExpressions ?? []) {
    const values = expression.values?.length ? ` (${expression.values.join(", ")})` : "";
    parts.push(`${expression.key} ${expression.operator}${values}`);
  }
  return parts.length ? parts.join(", ") : "*";
}

/**
 * A store reference as `Kind/name`, with the controller default of
 * `SecretStore` for a missing kind.
 */
export function formatStoreRef(ref: SecretStoreRef): string {
  return `${ref.kind ?? "SecretStore"}/${ref.name}`;
}

/**
 * A store reference of a PushSecret: `Kind/name`, or `Kind selector ...` for
 * one by label selector.
 */
export function formatPushSecretStoreRef(ref: PushSecretStoreRef): string {
  const kind = ref.kind ?? "SecretStore";
  return ref.name ? `${kind}/${ref.name}` : `${kind} selector ${formatLabelSelector(ref.labelSelector)}`;
}

export function formatGeneratorRef(ref: GeneratorRef): string {
  return `generator ${ref.kind}/${ref.name}`;
}

/**
 * A remote reference as its key, with the property and the version when set:
 * `/path/to/secret (property: username, version: 3)`.
 */
export function formatRemoteRef(ref: ExternalSecretDataRemoteRef): string {
  const details = [
    ref.property ? `property: ${ref.property}` : undefined,
    ref.version ? `version: ${ref.version}` : undefined,
  ].filter((part): part is string => part !== undefined);
  return details.length ? `${ref.key} (${details.join(", ")})` : ref.key;
}

/**
 * One `spec.dataFrom[]` entry as one line: what it takes (`extract` or
 * `find`), where from when a `sourceRef` overrides the store, and how many
 * rewrites follow.
 */
export function formatDataFrom(entry: ExternalSecretDataFromRemoteRef): string {
  const parts: string[] = [];
  if (entry.extract) parts.push(`extract ${formatRemoteRef(entry.extract)}`);
  if (entry.find) {
    const criteria = [
      entry.find.path ? `path ${entry.find.path}` : undefined,
      entry.find.name?.regexp ? `name ~ ${entry.find.name.regexp}` : undefined,
      entry.find.tags && Object.keys(entry.find.tags).length
        ? `tags ${Object.entries(entry.find.tags)
            .map(([key, value]) => `${key}=${value}`)
            .join(", ")}`
        : undefined,
    ].filter((part): part is string => part !== undefined);
    parts.push(`find ${criteria.length ? criteria.join(", ") : "*"}`);
  }
  if (entry.sourceRef?.storeRef) parts.push(`from ${formatStoreRef(entry.sourceRef.storeRef)}`);
  if (entry.sourceRef?.generatorRef) parts.push(`from ${formatGeneratorRef(entry.sourceRef.generatorRef)}`);
  if (entry.rewrite?.length) parts.push(`${entry.rewrite.length} rewrite${entry.rewrite.length > 1 ? "s" : ""}`);
  return parts.length ? parts.join(", ") : "-";
}

/**
 * One `spec.data[]` entry of a PushSecret as one line: the source key, or
 * the whole Secret, and the remote key it is pushed to.
 */
export function formatPushSecretData(entry: PushSecretData): string {
  const source = entry.match.secretKey ?? "*";
  const target = entry.match.remoteRef.property
    ? `${entry.match.remoteRef.remoteKey} (property: ${entry.match.remoteRef.property})`
    : entry.match.remoteRef.remoteKey;
  return `${source} -> ${target}`;
}

/**
 * One `spec.dataTo[]` entry of a PushSecret as one line: the store, the keys
 * it matches, and the remote key they are bundled under, or one remote key
 * per source key.
 */
export function formatPushSecretDataTo(entry: PushSecretDataTo): string {
  const parts = [
    entry.storeRef ? formatPushSecretStoreRef(entry.storeRef) : undefined,
    entry.match?.regexp ? `keys ~ ${entry.match.regexp}` : "all keys",
    entry.remoteKey ? `-> ${entry.remoteKey}` : "-> one remote key per source key",
    entry.rewrite?.length ? `${entry.rewrite.length} rewrite${entry.rewrite.length > 1 ? "s" : ""}` : undefined,
  ].filter((part): part is string => part !== undefined);
  return parts.join(", ");
}
