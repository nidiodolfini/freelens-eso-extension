import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { SecretStore } from "../api/secretstore/secretstore-v1";

const { observer } = MobxReact;

const {
  Component: { Badge, DrawerItem },
} = Renderer;

export type SecretStoreDetailsProps = Renderer.Component.KubeObjectDetailsProps<SecretStore>;

function conditionClass(status: string): string {
  switch (status) {
    case "True":
      return "success";
    case "False":
      return "error";
    default:
      return "warning";
  }
}

export const SecretStoreDetails = observer(({ object }: SecretStoreDetailsProps) => {
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
      <DrawerItem name="Provider">{SecretStore.getProviderName(object) ?? "-"}</DrawerItem>
      <DrawerItem name="Controller" hidden={!object.spec.controller}>
        {object.spec.controller}
      </DrawerItem>
      <DrawerItem name="Retry Settings" hidden={!retrySettings}>
        {retryParts}
      </DrawerItem>
      <DrawerItem name="Capabilities">{SecretStore.getCapabilities(object) ?? "-"}</DrawerItem>
      <DrawerItem name="Status">
        <Badge label={SecretStore.getStatusText(object)} className={SecretStore.getStatusClass(object)} />
      </DrawerItem>
      <DrawerItem name="Conditions" labelsOnly hidden={!conditions?.length}>
        {conditions?.map((condition, index) => (
          <Badge
            key={condition.type + index}
            label={condition.reason || condition.type}
            className={conditionClass(condition.status)}
            tooltip={condition.message}
          />
        ))}
      </DrawerItem>
    </>
  );
});
