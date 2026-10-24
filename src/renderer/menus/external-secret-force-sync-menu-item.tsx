import { Common, Renderer } from "@freelensapp/extensions";
import { ExternalSecret } from "../api/externalsecret/externalsecret-v1";

const {
  Component: { Icon, MenuItem },
} = Renderer;

export type ExternalSecretForceSyncMenuItemProps = Common.Types.KubeObjectMenuItemProps<ExternalSecret>;

/**
 * Triggers an immediate sync of the ExternalSecret: the controller reconciles
 * when the `external-secrets.io/force-sync` annotation changes, so the item
 * writes a fresh Unix timestamp, as the ESO docs show for
 * `kubectl annotate es <name> force-sync=$(date +%s) --overwrite`.
 */
export const ExternalSecretForceSyncMenuItem = ({ object, toolbar }: ExternalSecretForceSyncMenuItemProps) => {
  if (!object) return <></>;

  const store = ExternalSecret.getStore<ExternalSecret>();

  const forceSync = async () => {
    await store.patch(
      object,
      {
        metadata: {
          annotations: {
            "external-secrets.io/force-sync": String(Math.floor(Date.now() / 1000)),
          },
        },
      },
      "merge",
    );
  };

  return (
    <MenuItem onClick={forceSync}>
      <Icon material="sync" interactive={toolbar} title="Force Sync" />
      <span className="title">Force Sync</span>
    </MenuItem>
  );
};
