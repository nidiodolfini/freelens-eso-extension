import { Renderer } from "@freelensapp/extensions";
import {
  getStoreCapabilities,
  getStoreProviderName,
  getStoreReady,
  getStoreReadyCondition,
  getStoreStatusClass,
  getStoreStatusText,
} from "../store-helpers";

import type {
  EsoCondition,
  EsoKubeObjectCRD,
  SecretStoreCapabilities,
  SecretStoreSpec,
  SecretStoreStatus,
} from "../types";

export type { SecretStoreSpec, SecretStoreStatus };

export class SecretStore extends Renderer.K8sApi.KubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  SecretStoreStatus,
  SecretStoreSpec
> {
  static readonly kind = "SecretStore";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/external-secrets.io/v1/secretstores";

  static readonly crd: EsoKubeObjectCRD = {
    apiVersions: ["external-secrets.io/v1"],
    plural: "secretstores",
    singular: "secretstore",
    shortNames: ["ss"],
    title: "Secret Stores",
  };

  static getReadyCondition(object: SecretStore): EsoCondition | undefined {
    return getStoreReadyCondition(object.status?.conditions);
  }

  /**
   * The READY column of `kubectl get ss`: the status of the Ready condition,
   * or undefined when the controller has not written one yet.
   */
  static getReady(object: SecretStore): boolean | undefined {
    return getStoreReady(object.status?.conditions);
  }

  /**
   * The STATUS column of `kubectl get ss`: the reason of the Ready
   * condition, with the controller defaults for a missing reason.
   */
  static getStatusText(object: SecretStore): string {
    return getStoreStatusText(object.status?.conditions);
  }

  static getStatusClass(object: SecretStore): string {
    return getStoreStatusClass(object.status?.conditions);
  }

  /**
   * The CAPABILITIES column of `kubectl get ss`.
   */
  static getCapabilities(object: SecretStore): SecretStoreCapabilities | undefined {
    return getStoreCapabilities(object.status);
  }

  static getProviderName(object: SecretStore): string | undefined {
    return getStoreProviderName(object.spec.provider);
  }
}

export class SecretStoreApi extends Renderer.K8sApi.KubeApi<SecretStore> {}

// `autoRegister: false` keeps the API out of the cluster's apiManager: the
// "Not Available" page of `createAvailableVersionPage` relies on the apiBase
// being found only when the cluster actually serves the CRD. The store below
// is registered in the extension's `onActivate` instead.
export const secretStoreApi = new SecretStoreApi({
  objectConstructor: SecretStore,
  autoRegister: false,
});

export class SecretStoreStore extends Renderer.K8sApi.KubeObjectStore<SecretStore> {
  readonly api = secretStoreApi;
}

export const secretStoreStore = new SecretStoreStore();
