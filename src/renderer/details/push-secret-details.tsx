import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { selfLinkOf, storeSelfLink } from "../api/links";
import { PushSecret } from "../api/pushsecret/pushsecret-v1alpha1";
import {
  formatPushSecretData,
  formatPushSecretDataTo,
  formatPushSecretStoreRef,
  getConditionClass,
} from "../api/store-helpers";

const { observer } = MobxReact;

const {
  Component: { Badge, DrawerItem, MaybeLink },
  K8sApi: { Secret },
  Navigation: { getMaybeDetailsUrl },
} = Renderer;

export type PushSecretDetailsProps = Renderer.Component.KubeObjectDetailsProps<PushSecret>;

export const PushSecretDetails = observer(({ object }: PushSecretDetailsProps) => {
  const conditions = object.status?.conditions;
  const message = PushSecret.getStatusMessage(object);
  const secretName = PushSecret.getSecretName(object);
  const data = object.spec.data ?? [];
  const dataTo = object.spec.dataTo ?? [];

  return (
    <>
      <DrawerItem name="Source Secret">
        <MaybeLink to={getMaybeDetailsUrl(secretName ? selfLinkOf(Secret, secretName, object.getNs()) : "")}>
          {PushSecret.getSourceText(object)}
        </MaybeLink>
      </DrawerItem>
      <DrawerItem name="Stores">
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
      <DrawerItem name="Status">
        <Badge label={PushSecret.getStatusText(object)} className={PushSecret.getStatusClass(object)} />
      </DrawerItem>
      <DrawerItem name="Message" hidden={!message}>
        {message}
      </DrawerItem>
      <DrawerItem name="Last Sync">{PushSecret.getRefreshTime(object) ?? "-"}</DrawerItem>
      <DrawerItem name="Synced Resource Version">{PushSecret.getSyncedResourceVersion(object) ?? "-"}</DrawerItem>
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
