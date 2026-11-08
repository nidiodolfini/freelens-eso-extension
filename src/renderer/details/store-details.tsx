import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { formatStoreRefreshInterval, getReadyMessage, getStoreProviderName } from "../api/store-helpers";

import type { ClusterSecretStore } from "../api/clustersecretstore/clustersecretstore-v1";
import type { SecretStore } from "../api/secretstore/secretstore-v1";

const { observer } = MobxReact;

const {
  Component: { DrawerItem },
} = Renderer;

/**
 * The details panel of a SecretStore and of a ClusterSecretStore. The two
 * kinds share their spec and status, so one panel serves both registrations.
 * The host's own details of a custom resource, next to the panel, show the
 * printer columns of the CRD (Status, Capabilities, Ready) and the conditions,
 * so the panel shows only what they leave out: the provider, the controller,
 * the retry settings, the interval of the store's revalidation, and the
 * message of the Ready condition, which the host shows only in a tooltip.
 */
export type StoreDetailsProps = Renderer.Component.KubeObjectDetailsProps<SecretStore | ClusterSecretStore>;

export const StoreDetails = observer(({ object }: StoreDetailsProps) => {
  const retrySettings = object.spec.retrySettings;
  const retryParts = [
    retrySettings?.maxRetries !== undefined ? `max retries: ${retrySettings.maxRetries}` : undefined,
    retrySettings?.retryInterval ? `interval: ${retrySettings.retryInterval}` : undefined,
  ]
    .filter((part): part is string => part !== undefined)
    .join(", ");
  const refreshInterval = formatStoreRefreshInterval(object.spec.refreshInterval);
  const message = getReadyMessage(object.status?.conditions);

  return (
    <>
      <DrawerItem name="Provider">{getStoreProviderName(object.spec.provider) ?? "-"}</DrawerItem>
      <DrawerItem name="Controller" hidden={!object.spec.controller}>
        {object.spec.controller}
      </DrawerItem>
      <DrawerItem name="Retry Settings" hidden={!retryParts}>
        {retryParts}
      </DrawerItem>
      <DrawerItem name="Refresh Interval" hidden={!refreshInterval}>
        {refreshInterval}
      </DrawerItem>
      <DrawerItem name="Message" hidden={!message}>
        {message}
      </DrawerItem>
    </>
  );
});
