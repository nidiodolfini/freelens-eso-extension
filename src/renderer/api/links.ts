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
  /**
   * The API the host registered for the kind, in the first of its
   * `crd.apiVersions` that the cluster serves; an extension's model has it,
   * and it throws when the cluster serves none.
   */
  getApi?(): { readonly apiBase: string };
}

/**
 * The selfLink of an object of a kind, from the `apiBase` of the API the host
 * registered for the kind, so that the link names the version the cluster
 * serves, or from the kind's static `apiBase` when there is no such API:
 * `/apis/<group>/<version>/<plural>` becomes
 * `/apis/<group>/<version>/namespaces/<namespace>/<plural>/<name>` for a
 * namespaced kind, and `/apis/<group>/<version>/<plural>/<name>` otherwise.
 * `Renderer.Navigation.getMaybeDetailsUrl` turns it into the URL that opens
 * the object's details drawer, which finds the object through the API of the
 * version the link names.
 */
export function selfLinkOf(kind: KubeObjectKind, name: string, namespace?: string): string {
  const apiBase = servedApiBase(kind);
  const slash = apiBase.lastIndexOf("/");
  const prefix = apiBase.slice(0, slash);
  const plural = apiBase.slice(slash + 1);
  return kind.namespaced && namespace
    ? `${prefix}/namespaces/${namespace}/${plural}/${name}`
    : `${prefix}/${plural}/${name}`;
}

function servedApiBase(kind: KubeObjectKind): string {
  try {
    return kind.getApi?.().apiBase ?? kind.apiBase;
  } catch {
    return kind.apiBase;
  }
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
