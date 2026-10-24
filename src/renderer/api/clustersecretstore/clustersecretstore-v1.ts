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

export class ClusterSecretStore extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  SecretStoreStatus,
  SecretStoreSpec
> {
  declare kind: "ClusterSecretStore";
  declare apiVersion: "external-secrets.io/v1";

  static readonly kind = "ClusterSecretStore";
  static readonly namespaced = false;
  static readonly apiBase = "/apis/external-secrets.io/v1/clustersecretstores";

  static readonly crd: EsoKubeObjectCRD = {
    apiVersions: ["external-secrets.io/v1"],
    plural: "clustersecretstores",
    singular: "clustersecretstore",
    shortNames: ["css"],
    title: "Cluster Secret Stores",
  };

  static getReadyCondition(object: ClusterSecretStore): EsoCondition | undefined {
    return getStoreReadyCondition(object.status?.conditions);
  }

  /**
   * The READY column of `kubectl get css`: the status of the Ready
   * condition, or undefined when the controller has not written one yet.
   */
  static getReady(object: ClusterSecretStore): boolean | undefined {
    return getStoreReady(object.status?.conditions);
  }

  /**
   * The STATUS column of `kubectl get css`: the reason of the Ready
   * condition, with the controller defaults for a missing reason.
   */
  static getStatusText(object: ClusterSecretStore): string {
    return getStoreStatusText(object.status?.conditions);
  }

  static getStatusClass(object: ClusterSecretStore): string {
    return getStoreStatusClass(object.status?.conditions);
  }

  /**
   * The CAPABILITIES column of `kubectl get css`.
   */
  static getCapabilities(object: ClusterSecretStore): SecretStoreCapabilities | undefined {
    return getStoreCapabilities(object.status);
  }

  static getProviderName(object: ClusterSecretStore): string | undefined {
    return getStoreProviderName(object.spec.provider);
  }
}

export class ClusterSecretStoreApi extends Renderer.K8sApi.KubeApi<ClusterSecretStore> {}
export class ClusterSecretStoreStore extends Renderer.K8sApi.KubeObjectStore<
  ClusterSecretStore,
  ClusterSecretStoreApi
> {}
