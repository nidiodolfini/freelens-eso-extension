import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import {
  getConditionClass,
  getStatusClass,
  getStoreCapabilities,
  getStoreProviderName,
  getStoreStatusText,
} from "../api/store-helpers";

import type { ClusterSecretStore } from "../api/clustersecretstore/clustersecretstore-v1";
import type { SecretStore } from "../api/secretstore/secretstore-v1";

const { observer } = MobxReact;

const {
  Component: { Badge, DrawerItem },
} = Renderer;

/**
 * The details panel of a SecretStore and of a ClusterSecretStore. The two
 * kinds share their spec and status, so one panel serves both registrations.
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
  const conditions = object.status?.conditions;

  return (
    <>
      <DrawerItem name="Provider">{getStoreProviderName(object.spec.provider) ?? "-"}</DrawerItem>
      <DrawerItem name="Controller" hidden={!object.spec.controller}>
        {object.spec.controller}
      </DrawerItem>
      <DrawerItem name="Retry Settings" hidden={!retrySettings}>
        {retryParts}
      </DrawerItem>
      <DrawerItem name="Capabilities">{getStoreCapabilities(object.status) ?? "-"}</DrawerItem>
      <DrawerItem name="Status">
        <Badge label={getStoreStatusText(conditions)} className={getStatusClass(conditions)} />
      </DrawerItem>
      <DrawerItem name="Conditions" labelsOnly hidden={!conditions?.length}>
        {conditions?.map((condition, index) => (
          <Badge
            key={condition.type + index}
            label={condition.reason || condition.type}
            className={getConditionClass(condition.status)}
            tooltip={condition.message}
          />
        ))}
      </DrawerItem>
    </>
  );
});
