import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { ClusterExternalSecret } from "../api/clusterexternalsecret/clusterexternalsecret-v1";
import { storeSelfLink } from "../api/links";
import { formatLabelSelector } from "../api/store-helpers";
import { ExternalSecretDataItems } from "./external-secret-data";

const { observer } = MobxReact;

const {
  Component: { Badge, DrawerItem, MaybeLink },
  Navigation: { getMaybeDetailsUrl },
} = Renderer;

export type ClusterExternalSecretDetailsProps = Renderer.Component.KubeObjectDetailsProps<ClusterExternalSecret>;

/**
 * The details of a ClusterExternalSecret. The host's own details of a custom resource, next to the panel, show the
 * printer columns of the CRD (Store, Refresh Interval, Ready) and the conditions, so the panel shows only what they
 * leave out: the ExternalSecrets it creates, the store with its kind, the namespaces it selects, provisioned and
 * failed, the message of the Ready condition, which the host shows only in a tooltip, and the data mappings.
 */
export const ClusterExternalSecretDetails = observer(({ object }: ClusterExternalSecretDetailsProps) => {
  const spec = object.spec;
  const externalSecretSpec = spec.externalSecretSpec;
  const message = ClusterExternalSecret.getStatusMessage(object);
  const storeType = ClusterExternalSecret.getStoreType(object);
  const storeName = ClusterExternalSecret.getStoreName(object);
  // A SecretStore lives in each target namespace, so only a ClusterSecretStore can be linked to.
  const storeLink = storeType === "ClusterSecretStore" ? storeSelfLink(storeType, storeName) : "";
  const selectors = [...(spec.namespaceSelectors ?? []), ...(spec.namespaceSelector ? [spec.namespaceSelector] : [])];
  const provisioned = ClusterExternalSecret.getProvisionedNamespaces(object);
  const failed = ClusterExternalSecret.getFailedNamespaces(object);

  return (
    <>
      <DrawerItem name="External Secret Name">{ClusterExternalSecret.getExternalSecretName(object)}</DrawerItem>
      <DrawerItem name="Target Secret">
        {externalSecretSpec.target?.name ?? ClusterExternalSecret.getExternalSecretName(object)}
      </DrawerItem>
      <DrawerItem name="Secret Store Ref">
        <MaybeLink to={getMaybeDetailsUrl(storeLink)}>{storeName ? `${storeType}/${storeName}` : "-"}</MaybeLink>
      </DrawerItem>
      <DrawerItem name="External Secret Refresh Interval">{externalSecretSpec.refreshInterval ?? "1h0m0s"}</DrawerItem>
      <DrawerItem name="Namespace Selectors" hidden={!selectors.length}>
        {selectors.map((selector) => {
          const text = formatLabelSelector(selector);
          return <div key={text}>{text}</div>;
        })}
      </DrawerItem>
      <DrawerItem name="Namespaces" hidden={!spec.namespaces?.length}>
        {spec.namespaces?.join(", ")}
      </DrawerItem>
      <DrawerItem name="Provisioned Namespaces" labelsOnly hidden={!provisioned.length}>
        {provisioned.map((namespace) => (
          <Badge key={namespace} label={namespace} className="success" />
        ))}
      </DrawerItem>
      <DrawerItem name="Failed Namespaces" labelsOnly hidden={!failed.length}>
        {failed.map((failure) => (
          <Badge key={failure.namespace} label={failure.namespace} className="error" tooltip={failure.reason} />
        ))}
      </DrawerItem>
      <DrawerItem name="Message" hidden={!message}>
        {message}
      </DrawerItem>
      <ExternalSecretDataItems spec={externalSecretSpec} />
    </>
  );
});
