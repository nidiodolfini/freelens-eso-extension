import type { Renderer } from "@freelensapp/extensions";

/**
 * The label the controller puts on every Secret it manages
 * (`LabelManaged` in the controller's constants).
 */
export const esoManagedLabel = "reconcile.external-secrets.io/managed";

type SecretMetadata = Pick<Renderer.K8sApi.KubeObjectMetadata, "namespace" | "labels" | "ownerReferences">;

/**
 * Whether the External Secrets Operator manages the Secret: the `managed`
 * label, which the controller writes whatever the creation policy.
 */
export function isManagedByEso(metadata: SecretMetadata): boolean {
  return metadata.labels?.[esoManagedLabel] === "true";
}

/**
 * The ExternalSecret that owns the Secret, from the owner reference that
 * `creationPolicy: Owner`, the default, writes. A Secret created with
 * `Orphan`, `Merge` or `CreateOrMerge` has none.
 */
export function getOwningExternalSecret(metadata: SecretMetadata): { name: string; namespace?: string } | undefined {
  const owner = metadata.ownerReferences?.find(
    (ref) => ref.kind === "ExternalSecret" && ref.apiVersion.startsWith("external-secrets.io/"),
  );
  return owner ? { name: owner.name, namespace: metadata.namespace } : undefined;
}
