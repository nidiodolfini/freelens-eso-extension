import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { ExternalSecret } from "../api/externalsecret/externalsecret-v1";
import { selfLinkOf } from "../api/links";
import { getOwningExternalSecret, isManagedByEso } from "../api/secret-owner";

const { observer } = MobxReact;

const {
  Component: { DrawerItem, DrawerTitle, MaybeLink },
  Navigation: { getMaybeDetailsUrl },
} = Renderer;

export type SecretEsoDetailsProps = Renderer.Component.KubeObjectDetailsProps<Renderer.K8sApi.Secret>;

/**
 * A panel in the details of a core Secret that the External Secrets Operator manages: the way back from the Secret
 * to the ExternalSecret that owns it. It reads the owner reference and the managed label of the Secret itself, so it
 * needs no store, and renders nothing for a Secret the operator does not manage.
 */
export const SecretEsoDetails = observer(({ object }: SecretEsoDetailsProps) => {
  const owner = getOwningExternalSecret(object.metadata);

  if (!owner && !isManagedByEso(object.metadata)) return null;

  return (
    <>
      <DrawerTitle>External Secrets</DrawerTitle>
      <DrawerItem name="Managed By">External Secrets Operator</DrawerItem>
      <DrawerItem name="External Secret" hidden={!owner}>
        {owner && (
          <MaybeLink to={getMaybeDetailsUrl(selfLinkOf(ExternalSecret, owner.name, owner.namespace))}>
            {owner.name}
          </MaybeLink>
        )}
      </DrawerItem>
    </>
  );
});
