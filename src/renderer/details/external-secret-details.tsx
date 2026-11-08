import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { ExternalSecret } from "../api/externalsecret/externalsecret-v1";
import { selfLinkOf, storeSelfLink } from "../api/links";
import { getReadyMessage } from "../api/store-helpers";
import { ExternalSecretDataItems } from "./external-secret-data";

const { observer } = MobxReact;

const {
  Component: { DrawerItem, MaybeLink },
  K8sApi: { Secret },
  Navigation: { getMaybeDetailsUrl },
} = Renderer;

export type ExternalSecretDetailsProps = Renderer.Component.KubeObjectDetailsProps<ExternalSecret>;

/**
 * The details of an ExternalSecret. The host's own details of a custom resource, next to the panel, show the printer
 * columns of the CRD (Store Type, Store, Refresh Interval, Status, Ready, Last Sync) and the conditions, so the panel
 * shows only what they leave out: the target Secret and the store as links, the policies, the message of the Ready
 * condition, which the host shows only in a tooltip, and the data mappings.
 */
export const ExternalSecretDetails = observer(({ object }: ExternalSecretDetailsProps) => {
  const message = getReadyMessage(object.status?.conditions);
  const storeName = ExternalSecret.getStoreName(object);
  const storeType = ExternalSecret.getStoreType(object);
  const targetName = ExternalSecret.getTargetName(object);
  const syncedResourceVersion = ExternalSecret.getSyncedResourceVersion(object);
  const target = object.spec.target;

  return (
    <>
      <DrawerItem name="Target Secret">
        <MaybeLink to={getMaybeDetailsUrl(selfLinkOf(Secret, targetName, object.getNs()))}>{targetName}</MaybeLink>
      </DrawerItem>
      <DrawerItem name="Secret Store Ref">
        <MaybeLink to={getMaybeDetailsUrl(storeSelfLink(storeType, storeName, object.getNs()))}>
          {storeName ? `${storeType}/${storeName}` : "-"}
        </MaybeLink>
      </DrawerItem>
      <DrawerItem name="Creation Policy">{target?.creationPolicy ?? "Owner"}</DrawerItem>
      <DrawerItem name="Deletion Policy">{target?.deletionPolicy ?? "Retain"}</DrawerItem>
      <DrawerItem name="Immutable" hidden={!target?.immutable}>
        true
      </DrawerItem>
      <DrawerItem name="Refresh Policy">{object.spec.refreshPolicy ?? "Periodic"}</DrawerItem>
      <DrawerItem name="Message" hidden={!message}>
        {message}
      </DrawerItem>
      <DrawerItem name="Synced Resource Version" hidden={!syncedResourceVersion}>
        {syncedResourceVersion}
      </DrawerItem>
      <ExternalSecretDataItems spec={object.spec} />
    </>
  );
});
