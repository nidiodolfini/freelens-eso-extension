import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { ExternalSecret } from "../api/externalsecret/externalsecret-v1";
import { selfLinkOf, storeSelfLink } from "../api/links";
import { getConditionClass, getReadyMessage } from "../api/store-helpers";
import { ExternalSecretDataItems } from "./external-secret-data";

const { observer } = MobxReact;

const {
  Component: { Badge, DrawerItem, MaybeLink },
  K8sApi: { Secret },
  Navigation: { getMaybeDetailsUrl },
} = Renderer;

export type ExternalSecretDetailsProps = Renderer.Component.KubeObjectDetailsProps<ExternalSecret>;

export const ExternalSecretDetails = observer(({ object }: ExternalSecretDetailsProps) => {
  const conditions = object.status?.conditions;
  const message = getReadyMessage(conditions);
  const storeName = ExternalSecret.getStoreName(object);
  const storeType = ExternalSecret.getStoreType(object);
  const targetName = ExternalSecret.getTargetName(object);
  const target = object.spec.target;

  return (
    <>
      <DrawerItem name="Target Secret">
        <MaybeLink to={getMaybeDetailsUrl(selfLinkOf(Secret, targetName, object.getNs()))}>{targetName}</MaybeLink>
      </DrawerItem>
      <DrawerItem name="Creation Policy">{target?.creationPolicy ?? "Owner"}</DrawerItem>
      <DrawerItem name="Deletion Policy">{target?.deletionPolicy ?? "Retain"}</DrawerItem>
      <DrawerItem name="Immutable" hidden={!target?.immutable}>
        true
      </DrawerItem>
      <DrawerItem name="Store">
        <MaybeLink to={getMaybeDetailsUrl(storeSelfLink(storeType, storeName, object.getNs()))}>
          {storeType}/{storeName ?? "-"}
        </MaybeLink>
      </DrawerItem>
      <DrawerItem name="Refresh Policy">{object.spec.refreshPolicy ?? "Periodic"}</DrawerItem>
      <DrawerItem name="Refresh Interval">{ExternalSecret.getRefreshInterval(object)}</DrawerItem>
      <DrawerItem name="Status">
        <Badge label={ExternalSecret.getStatusText(object)} className={ExternalSecret.getStatusClass(object)} />
      </DrawerItem>
      <DrawerItem name="Message" hidden={!message}>
        {message}
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
      <ExternalSecretDataItems spec={object.spec} />
    </>
  );
});
