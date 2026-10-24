import type { EsoCondition, SecretStoreCapabilities, SecretStoreProvider, SecretStoreStatus } from "./types";

/**
 * Pure helpers shared by the SecretStore and ClusterSecretStore models: both
 * kinds carry the same spec and status, so their statics delegate to these
 * functions.
 */

export function getStoreReadyCondition(conditions: EsoCondition[] | undefined): EsoCondition | undefined {
  return conditions?.find((condition) => condition.type === "Ready");
}

export function getStoreReady(conditions: EsoCondition[] | undefined): boolean | undefined {
  const condition = getStoreReadyCondition(conditions);
  if (condition?.status === "True") return true;
  if (condition?.status === "False") return false;
  return undefined;
}

/**
 * The STATUS column of `kubectl get ss/css`: the reason of the Ready
 * condition, with the controller defaults for a missing reason.
 */
export function getStoreStatusText(conditions: EsoCondition[] | undefined): string {
  const condition = getStoreReadyCondition(conditions);
  if (condition?.status === "True") return condition.reason ?? "Valid";
  if (condition?.status === "False") return condition.reason ?? "Invalid";
  return "Unknown";
}

export function getStoreStatusClass(conditions: EsoCondition[] | undefined): string {
  const condition = getStoreReadyCondition(conditions);
  switch (condition?.status) {
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
