import { Renderer } from "@freelensapp/extensions";
import {
  formatGeneratorRef,
  formatLabelSelector,
  formatPushSecretStoreRef,
  getPushSecretStatusText,
  getReady,
  getReadyCondition,
  getReadyMessage,
  getStatusClass,
} from "../store-helpers";

import type {
  EsoCondition,
  EsoKubeObjectCRD,
  PushSecretDeletionPolicy,
  PushSecretSpec,
  PushSecretStatus,
  PushSecretUpdatePolicy,
} from "../types";

export type { PushSecretSpec, PushSecretStatus };

export class PushSecret extends Renderer.K8sApi.LensExtensionKubeObject<
  Renderer.K8sApi.KubeObjectMetadata,
  PushSecretStatus,
  PushSecretSpec
> {
  declare kind: "PushSecret";
  declare apiVersion: "external-secrets.io/v1alpha1";

  static readonly kind = "PushSecret";
  static readonly namespaced = true;
  static readonly apiBase = "/apis/external-secrets.io/v1alpha1/pushsecrets";

  static readonly crd: EsoKubeObjectCRD = {
    apiVersions: ["external-secrets.io/v1alpha1"],
    plural: "pushsecrets",
    singular: "pushsecret",
    shortNames: ["ps"],
    title: "Push Secrets",
  };

  static getReadyCondition(object: PushSecret): EsoCondition | undefined {
    return getReadyCondition(object.status?.conditions);
  }

  /**
   * The status of the Ready condition, or undefined when the controller has
   * not written one yet.
   */
  static getReady(object: PushSecret): boolean | undefined {
    return getReady(object.status?.conditions);
  }

  /**
   * The STATUS column of `kubectl get ps`: the reason of the Ready condition,
   * `Synced` or `Errored` by the controller's constants.
   */
  static getStatusText(object: PushSecret): string {
    return getPushSecretStatusText(object.status?.conditions);
  }

  static getStatusClass(object: PushSecret): string {
    return getStatusClass(object.status?.conditions);
  }

  static getStatusMessage(object: PushSecret): string | undefined {
    return getReadyMessage(object.status?.conditions);
  }

  /**
   * The name of the source Secret, when `spec.selector` names one; undefined
   * for a label selector or a generator.
   */
  static getSecretName(object: PushSecret): string | undefined {
    return object.spec.selector?.secret?.name;
  }

  /**
   * The source of the pushed values as one line: the Secret's name, a label
   * selector, or a generator.
   */
  static getSourceText(object: PushSecret): string {
    const selector = object.spec.selector;
    if (selector?.secret?.name) return selector.secret.name;
    if (selector?.secret?.selector) return `selector ${formatLabelSelector(selector.secret.selector)}`;
    if (selector?.generatorRef) return formatGeneratorRef(selector.generatorRef);
    return "-";
  }

  /**
   * The stores the values are pushed to, one line each.
   */
  static getStoreNames(object: PushSecret): string[] {
    return (object.spec.secretStoreRefs ?? []).map(formatPushSecretStoreRef);
  }

  /**
   * `spec.refreshInterval`, with the controller default.
   */
  static getRefreshInterval(object: PushSecret): string {
    return object.spec.refreshInterval ?? "1h0m0s";
  }

  /**
   * The LAST SYNC column of `kubectl get ps`.
   */
  static getRefreshTime(object: PushSecret): string | undefined {
    return object.status?.refreshTime;
  }

  static getSyncedResourceVersion(object: PushSecret): string | undefined {
    return object.status?.syncedResourceVersion;
  }

  static getUpdatePolicy(object: PushSecret): PushSecretUpdatePolicy {
    return object.spec.updatePolicy ?? "Replace";
  }

  static getDeletionPolicy(object: PushSecret): PushSecretDeletionPolicy {
    return object.spec.deletionPolicy ?? "None";
  }
}

export class PushSecretApi extends Renderer.K8sApi.KubeApi<PushSecret> {}
export class PushSecretStore extends Renderer.K8sApi.KubeObjectStore<PushSecret, PushSecretApi> {}
