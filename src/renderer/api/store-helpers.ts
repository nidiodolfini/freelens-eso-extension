import type { EsoCondition, SecretStoreCapabilities, SecretStoreProvider, SecretStoreStatus } from "./types";

/**
 * Pure helpers shared by the models and the details panels. Every ESO kind
 * reports its state through a `Ready` condition, so the statics of the models
 * delegate to these functions, with the default texts of their kind.
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
