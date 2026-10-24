import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { getSecretStoreStore, SecretStore, type SecretStoreApi } from "../api/secretstore/secretstore-v1";
import styles from "./eso-pages.module.scss";
import stylesInline from "./eso-pages.module.scss?inline";

const { observer } = MobxReact;

const {
  Component: { Badge, BadgeBoolean, KubeObjectAge, KubeObjectListLayout, LinkToNamespace, WithTooltip },
} = Renderer;

const KubeObject = SecretStore;
type KubeObject = SecretStore;
type KubeObjectApi = SecretStoreApi;

const sortingCallbacks = {
  name: (object: KubeObject) => object.getName(),
  namespace: (object: KubeObject) => object.getNs(),
  provider: (object: KubeObject) => KubeObject.getProviderName(object) ?? "",
  status: (object: KubeObject) => KubeObject.getStatusText(object),
  capabilities: (object: KubeObject) => KubeObject.getCapabilities(object) ?? "",
  ready: (object: KubeObject) => String(KubeObject.getReady(object)),
  age: (object: KubeObject) => object.getCreationTimestamp(),
};

const renderTableHeader: { title: string; sortBy: keyof typeof sortingCallbacks; className?: string }[] = [
  { title: "Name", sortBy: "name" },
  { title: "Namespace", sortBy: "namespace" },
  { title: "Provider", sortBy: "provider", className: styles.provider },
  { title: "Status", sortBy: "status", className: styles.status },
  { title: "Capabilities", sortBy: "capabilities", className: styles.capabilities },
  { title: "Ready", sortBy: "ready", className: styles.ready },
  { title: "Age", sortBy: "age", className: styles.age },
];

// The columns mirror `kubectl get ss`: STATUS, CAPABILITIES, READY.
export const SecretStoresPage = observer(() => {
  const store = getSecretStoreStore();

  return (
    <>
      <style>{stylesInline}</style>
      <KubeObjectListLayout<KubeObject, KubeObjectApi>
        tableId={`${KubeObject.crd.plural}Table`}
        className={styles.page}
        store={store}
        sortingCallbacks={sortingCallbacks}
        searchFilters={[(object: KubeObject) => object.getSearchFields()]}
        renderHeaderTitle={KubeObject.crd.title}
        renderTableHeader={renderTableHeader}
        renderTableContents={(object: KubeObject) => [
          <WithTooltip>{object.getName()}</WithTooltip>,
          <LinkToNamespace namespace={object.getNs()} />,
          <WithTooltip>{KubeObject.getProviderName(object) ?? "-"}</WithTooltip>,
          <Badge label={KubeObject.getStatusText(object)} className={KubeObject.getStatusClass(object)} />,
          KubeObject.getCapabilities(object) ?? "-",
          <BadgeBoolean value={KubeObject.getReady(object)} />,
          <KubeObjectAge object={object} key="age" />,
        ]}
      />
    </>
  );
});
