import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { selfLinkOf, storeSelfLink } from "../api/links";
import { PushSecret } from "../api/pushsecret/pushsecret-v1alpha1";
import { formatPushSecretData, formatPushSecretDataTo, formatPushSecretStoreRef } from "../api/store-helpers";

const { observer } = MobxReact;

const {
  Component: { DrawerItem, MaybeLink },
  K8sApi: { Secret },
  Navigation: { getMaybeDetailsUrl },
} = Renderer;

export type PushSecretDetailsProps = Renderer.Component.KubeObjectDetailsProps<PushSecret>;

/**
 * The details of a PushSecret. The host's own details of a custom resource, next to the panel, show the printer
 * columns of the CRD (Status, Last Sync) and the conditions, so the panel shows only what they leave out: the source
 * Secret and the stores as links, the refresh interval, the policies, the message of the Ready condition, which the
 * host shows only in a tooltip, and the data mappings.
 */
export const PushSecretDetails = observer(({ object }: PushSecretDetailsProps) => {
  const message = PushSecret.getStatusMessage(object);
  const secretName = PushSecret.getSecretName(object);
  const syncedResourceVersion = PushSecret.getSyncedResourceVersion(object);
  const data = object.spec.data ?? [];
  const dataTo = object.spec.dataTo ?? [];

  return (
    <>
      <DrawerItem name="Source Secret">
        <MaybeLink to={getMaybeDetailsUrl(secretName ? selfLinkOf(Secret, secretName, object.getNs()) : "")}>
          {PushSecret.getSourceText(object)}
        </MaybeLink>
      </DrawerItem>
      <DrawerItem name="Secret Store Refs">
        {(object.spec.secretStoreRefs ?? []).map((ref) => {
          const text = formatPushSecretStoreRef(ref);
          return (
            <div key={text}>
              <MaybeLink to={getMaybeDetailsUrl(storeSelfLink(ref.kind, ref.name, object.getNs()))}>{text}</MaybeLink>
            </div>
          );
        })}
      </DrawerItem>
      <DrawerItem name="Refresh Interval">{PushSecret.getRefreshInterval(object)}</DrawerItem>
      <DrawerItem name="Update Policy">{PushSecret.getUpdatePolicy(object)}</DrawerItem>
      <DrawerItem name="Deletion Policy">{PushSecret.getDeletionPolicy(object)}</DrawerItem>
      <DrawerItem name="Message" hidden={!message}>
        {message}
      </DrawerItem>
      <DrawerItem name="Synced Resource Version" hidden={!syncedResourceVersion}>
        {syncedResourceVersion}
      </DrawerItem>
      <DrawerItem name="Data" hidden={!data.length}>
        {data.map((entry) => {
          const text = formatPushSecretData(entry);
          return <div key={text}>{text}</div>;
        })}
      </DrawerItem>
      <DrawerItem name="Data To" hidden={!dataTo.length}>
        {dataTo.map((entry, index) => {
          const text = formatPushSecretDataTo(entry);
          return <div key={`${index}-${text}`}>{text}</div>;
        })}
      </DrawerItem>
    </>
  );
});
