import { Renderer } from "@freelensapp/extensions";
import { getReady, getReadyCondition, getReadyMessage, getStatusClass } from "../store-helpers";

import type {
  ClusterExternalSecretNamespaceFailure,
  ClusterExternalSecretSpec,
  ClusterExternalSecretStatus,
  EsoCondition,
  EsoKubeObjectCRD,
} from "../types";

export type { ClusterExternalSecretSpec, ClusterExternalSecretStatus };

export class ClusterExternalSecret extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  ClusterExternalSecretStatus,
  ClusterExternalSecretSpec
> {
  declare kind: "ClusterExternalSecret";
  declare apiVersion: "external-secrets.io/v1" | "external-secrets.io/v1beta1";

  static readonly kind = "ClusterExternalSecret";
  static readonly namespaced = false;
  static readonly apiBase = "/apis/external-secrets.io/v1/clusterexternalsecrets";

  static readonly crd: EsoKubeObjectCRD = {
    // An ESO older than 0.16 serves v1beta1 in place of v1, with the same schema. The host picks the first version
    // that the cluster serves.
    apiVersions: ["external-secrets.io/v1", "external-secrets.io/v1beta1"],
    plural: "clusterexternalsecrets",
    singular: "clusterexternalsecret",
    shortNames: ["ces"],
    title: "Cluster External Secrets",
  };

  static getReadyCondition(object: ClusterExternalSecret): EsoCondition | undefined {
    return getReadyCondition(object.status?.conditions);
  }

  /**
   * The READY column of `kubectl get ces`: the status of the Ready condition,
   * or undefined when the controller has not written one yet.
   */
  static getReady(object: ClusterExternalSecret): boolean | undefined {
    return getReady(object.status?.conditions);
  }

  static getStatusClass(object: ClusterExternalSecret): string {
    return getStatusClass(object.status?.conditions);
  }

  /**
   * The message of the Ready condition. The condition of a
   * ClusterExternalSecret has no reason; the message names the namespaces
   * that failed.
   */
  static getStatusMessage(object: ClusterExternalSecret): string | undefined {
    return getReadyMessage(object.status?.conditions);
  }

  /**
   * The kind of the store the ExternalSecrets use. `SecretStore` is the
   * controller default when the kind is omitted.
   */
  static getStoreType(object: ClusterExternalSecret): string {
    return object.spec.externalSecretSpec.secretStoreRef?.kind ?? "SecretStore";
  }

  /**
   * The STORE column of `kubectl get ces`: the name of the store the
   * ExternalSecrets use.
   */
  static getStoreName(object: ClusterExternalSecret): string | undefined {
    return object.spec.externalSecretSpec.secretStoreRef?.name;
  }

  /**
   * The REFRESH INTERVAL column of `kubectl get ces`: `spec.refreshTime`, the
   * interval at which the controller rechecks the namespaces, with no
   * controller default.
   */
  static getRefreshInterval(object: ClusterExternalSecret): string | undefined {
    return object.spec.refreshTime;
  }

  /**
   * The name of the ExternalSecrets the controller creates in each namespace:
   * `spec.externalSecretName`, or the name of the ClusterExternalSecret
   * itself, which is the controller default.
   */
  static getExternalSecretName(object: ClusterExternalSecret): string {
    return object.spec.externalSecretName ?? object.status?.externalSecretName ?? object.getName();
  }

  static getProvisionedNamespaces(object: ClusterExternalSecret): string[] {
    return object.status?.provisionedNamespaces ?? [];
  }

  static getFailedNamespaces(object: ClusterExternalSecret): ClusterExternalSecretNamespaceFailure[] {
    return object.status?.failedNamespaces ?? [];
  }
}

export class ClusterExternalSecretApi extends Renderer.K8sApi.KubeApi<ClusterExternalSecret> {}
export class ClusterExternalSecretStore extends Renderer.K8sApi.KubeObjectStore<
  ClusterExternalSecret,
  ClusterExternalSecretApi
> {}
