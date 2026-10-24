import { Renderer } from "@freelensapp/extensions";

import type { EsoCondition, EsoKubeObjectCRD, ExternalSecretSpec, ExternalSecretStatus } from "../types";

export type { ExternalSecretSpec, ExternalSecretStatus };

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

  static readonly crd: EsoKubeObjectCRD = {
    apiVersions: ["external-secrets.io/v1"],
    plural: "externalsecrets",
    singular: "externalsecret",
    shortNames: ["es"],
    title: "External Secrets",
  };

  static getReadyCondition(object: ExternalSecret): EsoCondition | undefined {
    return object.status?.conditions?.find((condition) => condition.type === "Ready");
  }

  /**
   * The READY column of `kubectl get es`: the status of the Ready condition,
   * or undefined when the controller has not written one yet.
   */
  static getReady(object: ExternalSecret): boolean | undefined {
    const condition = ExternalSecret.getReadyCondition(object);
    if (condition?.status === "True") return true;
    if (condition?.status === "False") return false;
    return undefined;
  }

  /**
   * The STATUS column of `kubectl get es`: the reason of the Ready condition,
   * with the controller defaults for a missing reason.
   */
  static getStatusText(object: ExternalSecret): string {
    const condition = ExternalSecret.getReadyCondition(object);
    if (condition?.status === "True") return condition.reason ?? "Ready";
    if (condition?.status === "False") return condition.reason ?? "Not Ready";
    return "Unknown";
  }

  static getStatusClass(object: ExternalSecret): string {
    const condition = ExternalSecret.getReadyCondition(object);
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

  /**
   * The STORETYPE column of `kubectl get es`. `SecretStore` is the
   * controller default when the kind is omitted.
   */
  static getStoreType(object: ExternalSecret): string {
    return object.spec.secretStoreRef?.kind ?? "SecretStore";
  }

  /**
   * The STORE column of `kubectl get es`: the name of the referenced store.
   */
  static getStoreName(object: ExternalSecret): string | undefined {
    return object.spec.secretStoreRef?.name;
  }

  /**
   * The REFRESH INTERVAL column of `kubectl get es`. `1h0m0s` is the
   * controller default when the field is omitted.
   */
  static getRefreshInterval(object: ExternalSecret): string {
    return object.spec.refreshInterval ?? "1h0m0s";
  }

  /**
   * The LAST SYNC column of `kubectl get es`.
   */
  static getRefreshTime(object: ExternalSecret): string | undefined {
    return object.status?.refreshTime;
  }

  static getSyncedResourceVersion(object: ExternalSecret): string | undefined {
    return object.status?.syncedResourceVersion;
  }

  /**
   * The name of the generated Secret: `spec.target.name`, or the name of the
   * ExternalSecret itself, which is the controller default.
   */
  static getTargetName(object: ExternalSecret): string {
    return object.spec.target?.name ?? object.getName();
  }
}

export class ExternalSecretApi extends Renderer.K8sApi.KubeApi<ExternalSecret> {}
export class ExternalSecretStore extends Renderer.K8sApi.KubeObjectStore<ExternalSecret, ExternalSecretApi> {}
