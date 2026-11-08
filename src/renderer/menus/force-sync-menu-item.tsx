import { Common, Renderer } from "@freelensapp/extensions";
import { ClusterExternalSecret } from "../api/clusterexternalsecret/clusterexternalsecret-v1";
import { ExternalSecret } from "../api/externalsecret/externalsecret-v1";

const {
  Component: { Icon, MenuItem, Notifications },
} = Renderer;

export type ForceSyncMenuItemProps = Common.Types.KubeObjectMenuItemProps<ExternalSecret | ClusterExternalSecret>;

/**
 * Triggers an immediate sync: the controller reconciles when the
 * `external-secrets.io/force-sync` annotation changes, so the item writes a
 * fresh Unix timestamp, as the ESO docs show for
 * `kubectl annotate es <name> force-sync=$(date +%s) --overwrite`. On a
 * ClusterExternalSecret the controller propagates the annotation to the
 * ExternalSecrets it manages. One component serves both registrations; the
 * `kind` of the object, a literal on each model, picks the store to patch.
 *
 * The patch runs in `onClick`, and an error in an event handler reaches no
 * error boundary, so a failed patch, such as a 403 for a user without the RBAC
 * to patch the object, is shown as an error notification and the promise
 * never rejects. The host's API rejects a failed request with a
 * `JsonApiErrorParsed`, which is no `Error` and whose `toString()` gives the
 * messages of the response.
 */
export const ForceSyncMenuItem = ({ object, toolbar }: ForceSyncMenuItemProps) => {
  if (!object) return <></>;

  const forceSync = async () => {
    const { name, namespace } = object.metadata;
    const target = `${object.kind} ${namespace ? `${namespace}/` : ""}${name}`;
    const patch = {
      metadata: {
        annotations: {
          "external-secrets.io/force-sync": String(Math.floor(Date.now() / 1000)),
        },
      },
    };

    try {
      if (object.kind === "ClusterExternalSecret") {
        await ClusterExternalSecret.getStore<ClusterExternalSecret>().patch(object, patch, "merge");
      } else {
        await ExternalSecret.getStore<ExternalSecret>().patch(object, patch, "merge");
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      Notifications.error(`Failed to force sync ${target}: ${reason}`);
      return;
    }

    Notifications.ok(`Force sync requested for ${target}`);
  };

  return (
    <MenuItem onClick={forceSync}>
      <Icon material="sync" interactive={toolbar} title="Force Sync" />
      <span className="title">Force Sync</span>
    </MenuItem>
  );
};
