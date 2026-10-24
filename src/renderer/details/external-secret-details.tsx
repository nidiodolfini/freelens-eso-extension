import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { ExternalSecret } from "../api/externalsecret/externalsecret-v1";
import { getConditionClass } from "../api/store-helpers";

const { observer } = MobxReact;

const {
  Component: { Badge, DrawerItem },
} = Renderer;

export type ExternalSecretDetailsProps = Renderer.Component.KubeObjectDetailsProps<ExternalSecret>;

export const ExternalSecretDetails = observer(({ object }: ExternalSecretDetailsProps) => {
  const conditions = object.status?.conditions;

  return (
    <>
      <DrawerItem name="Target Secret">{ExternalSecret.getTargetName(object)}</DrawerItem>
      <DrawerItem name="Store">
        {ExternalSecret.getStoreType(object)} {ExternalSecret.getStoreName(object) ?? "-"}
      </DrawerItem>
      <DrawerItem name="Refresh Policy">{object.spec.refreshPolicy ?? "Periodic"}</DrawerItem>
      <DrawerItem name="Refresh Interval">{ExternalSecret.getRefreshInterval(object)}</DrawerItem>
      <DrawerItem name="Status">
        <Badge label={ExternalSecret.getStatusText(object)} className={ExternalSecret.getStatusClass(object)} />
      </DrawerItem>
      <DrawerItem name="Last Sync">{ExternalSecret.getRefreshTime(object) ?? "-"}</DrawerItem>
      <DrawerItem name="Synced Resource Version">{ExternalSecret.getSyncedResourceVersion(object) ?? "-"}</DrawerItem>
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
