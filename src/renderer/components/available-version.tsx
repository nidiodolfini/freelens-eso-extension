import { Common, Renderer } from "@freelensapp/extensions";
import { observer } from "mobx-react";
import styles from "./available-version.module.scss";

export interface AvailableVersionPageProps {
  extension: Renderer.LensExtension;
}

/**
 * A model and its page. The model serves the versions of its `crd.apiVersions`, and the host picks the first of them
 * that the cluster serves.
 */
interface VersionVariant<T extends AvailableVersionPageProps> {
  kubeObjectClass: typeof Renderer.K8sApi.LensExtensionKubeObject<any, any, any>;
  PageComponent: React.ComponentType<T>;
}

/**
 * Creates a page component that automatically selects the correct API version based on cluster availability.
 *
 * Tries the models in order and renders the page of the first one the host has a store for.
 * Shows a helpful message, with every version of the models, if it has none (CRD not installed).
 *
 * The component is an observer: `getStore()` reads the host's observable API registry, so the page renders again
 * when the host registers an API after the page was first rendered, as it does for a page opened while the cluster
 * frame is still loading its CRDs.
 *
 * @param resourceName - Human-readable resource name (e.g., "OCI Repositories")
 * @param variants - Array of models and their pages, ordered by preference
 * @returns A page component that auto-detects a valid API version if present
 *
 * @example
 * ```tsx
 * createAvailableVersionPage(
 *   "Examples",
 *   [
 *     { kubeObjectClass: ExamplesV1alpha2, PageComponent: ExamplesV1alpha2Page },
 *     { kubeObjectClass: ExamplesV1alpha1, PageComponent: ExamplesV1alpha1Page },
 *   ]
 * );
 * ```
 */
export function createAvailableVersionPage<T extends AvailableVersionPageProps>(
  resourceName: string,
  variants: VersionVariant<T>[],
): React.ComponentType<T> {
  const versionsOf = (variant: VersionVariant<T>) => variant.kubeObjectClass.crd?.apiVersions ?? [];

  return observer((props: T) => {
    for (const variant of variants) {
      try {
        const store = variant.kubeObjectClass.getStore();
        if (store) {
          Common.logger.debug(
            `[${props.extension.name}]: Rendering ${resourceName} page with API version ${store.api.apiVersionWithGroup}`,
          );
          return <variant.PageComponent {...props} />;
        }
      } catch (error) {
        Common.logger.debug(
          `[${props.extension.name}]: API versions ${versionsOf(variant).join(", ")} not available for ${resourceName}: ${error}`,
        );
      }
    }

    // No version available - CRD not installed in cluster
    const triedVersions = variants.flatMap(versionsOf).join(", ");
    Common.logger.info(
      `[${props.extension.name}]: ${resourceName} CRD not found in cluster (tried versions: ${triedVersions})`,
    );

    return (
      <div className={styles.unavailablePage}>
        <div className={styles.unavailableContent}>
          <h3 className={styles.unavailableTitle}>{resourceName} Not Available</h3>
          <p className={styles.unavailableMessage}>
            The <strong>{resourceName}</strong> CRDs are not installed in this cluster.
          </p>
          <p className={styles.unavailableDetails}>
            Tried API versions: <code>{triedVersions}</code>
          </p>
        </div>
      </div>
    );
  });
}
