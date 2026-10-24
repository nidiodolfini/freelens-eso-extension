import { Renderer } from "@freelensapp/extensions";
import { getReady, getReadyCondition, getStatusClass, getStatusText } from "../store-helpers";

import type { EsoCondition, EsoKubeObjectCRD, ExternalSecretSpec, ExternalSecretStatus } from "../types";

export type { ExternalSecretSpec, ExternalSecretStatus };

export class ExternalSecret extends Renderer.K8sApi.KubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  ExternalSecretStatus,
  ExternalSecretSpec
> {
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
    return getReadyCondition(object.status?.conditions);
  }

  /**
   * The READY column of `kubectl get es`: the status of the Ready condition,
   * or undefined when the controller has not written one yet.
   */
  static getReady(object: ExternalSecret): boolean | undefined {
    return getReady(object.status?.conditions);
  }

  /**
   * The STATUS column of `kubectl get es`: the reason of the Ready condition,
   * with the controller defaults for a missing reason.
   */
  static getStatusText(object: ExternalSecret): string {
    return getStatusText(object.status?.conditions, "Ready", "Not Ready");
  }

  static getStatusClass(object: ExternalSecret): string {
    return getStatusClass(object.status?.conditions);
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

// `autoRegister: false` keeps the API out of the cluster's apiManager: the
// "Not Available" page of `createAvailableVersionPage` relies on the apiBase
// being found only when the cluster actually serves the CRD. The store below
// is registered in the extension's `onActivate` instead.
export const externalSecretApi = new ExternalSecretApi({
  objectConstructor: ExternalSecret,
  autoRegister: false,
});

export class ExternalSecretStore extends Renderer.K8sApi.KubeObjectStore<ExternalSecret> {
  readonly api = externalSecretApi;
}

export const externalSecretStore = new ExternalSecretStore();
