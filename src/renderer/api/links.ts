import { ClusterSecretStore } from "./clustersecretstore/clustersecretstore-v1";
import { SecretStore } from "./secretstore/secretstore-v1";

/**
 * The static metadata of a model class that names where its objects live: the
 * `apiBase` and `namespaced` of a `KubeObject` subclass, the extension's own
 * or a built-in one of the host such as `Renderer.K8sApi.Secret`.
 */
export interface KubeObjectKind {
  readonly apiBase: string;
  readonly namespaced: boolean;
}

/**
 * The selfLink of an object of a kind, from the kind's `apiBase`:
 * `/apis/<group>/<version>/<plural>` becomes
 * `/apis/<group>/<version>/namespaces/<namespace>/<plural>/<name>` for a
 * namespaced kind, and `/apis/<group>/<version>/<plural>/<name>` otherwise.
 * `Renderer.Navigation.getMaybeDetailsUrl` turns it into the URL that opens
 * the object's details drawer.
 */
export function selfLinkOf(kind: KubeObjectKind, name: string, namespace?: string): string {
  const slash = kind.apiBase.lastIndexOf("/");
  const prefix = kind.apiBase.slice(0, slash);
  const plural = kind.apiBase.slice(slash + 1);
  return kind.namespaced && namespace
    ? `${prefix}/namespaces/${namespace}/${plural}/${name}`
    : `${prefix}/${plural}/${name}`;
}

/**
 * The selfLink of the store an object refers to: a ClusterSecretStore by
 * name, or a SecretStore in the object's namespace, the controller default
 * for a missing kind. Empty when the store cannot be named, as for a
 * SecretStore referred to from a cluster-scoped object, which lives in each
 * target namespace; `getMaybeDetailsUrl` renders no link for it.
 */
export function storeSelfLink(kind: string | undefined, name: string | undefined, namespace?: string): string {
  if (!name) return "";
  if (kind === "ClusterSecretStore") return selfLinkOf(ClusterSecretStore, name);
  return namespace ? selfLinkOf(SecretStore, name, namespace) : "";
}
