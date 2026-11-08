import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { ClusterSecretStore, type ClusterSecretStoreApi } from "../api/clustersecretstore/clustersecretstore-v1";
import styles from "./eso-pages.module.scss";

const { observer } = MobxReact;

const {
  Component: { Badge, BadgeBoolean, KubeObjectAge, KubeObjectListLayout, WithTooltip },
} = Renderer;

const KubeObject = ClusterSecretStore;
type KubeObject = ClusterSecretStore;
type KubeObjectApi = ClusterSecretStoreApi;

const sortingCallbacks = {
  name: (object: KubeObject) => object.getName(),
  provider: (object: KubeObject) => KubeObject.getProviderName(object) ?? "",
  status: (object: KubeObject) => KubeObject.getStatusText(object),
  capabilities: (object: KubeObject) => KubeObject.getCapabilities(object) ?? "",
  ready: (object: KubeObject) => String(KubeObject.getReady(object)),
  age: (object: KubeObject) => object.getCreationTimestamp(),
};

type ColumnId = keyof typeof sortingCallbacks;

// Every column has an id, the key of its sorting callback: the host makes a column with an id resizable, and lets the
// user hide it from the menu of a configurable list, which keeps the list readable in a narrow window.
const renderTableHeader: { title: string; sortBy: ColumnId; id: ColumnId; className?: string }[] = [
  { title: "Name", sortBy: "name", id: "name" },
  { title: "Provider", sortBy: "provider", id: "provider", className: styles.provider },
  { title: "Status", sortBy: "status", id: "status", className: styles.status },
  { title: "Capabilities", sortBy: "capabilities", id: "capabilities", className: styles.capabilities },
  { title: "Ready", sortBy: "ready", id: "ready", className: styles.ready },
  { title: "Age", sortBy: "age", id: "age", className: styles.age },
];

// The columns mirror `kubectl get css`: STATUS, CAPABILITIES, READY.
export const ClusterSecretStoresPage = observer(() => {
  const store = KubeObject.getStore<KubeObject>();

  return (
    <KubeObjectListLayout<KubeObject, KubeObjectApi>
      tableId={`${KubeObject.crd.plural}Table`}
      className={styles.page}
      store={store}
      isConfigurable
      sortingCallbacks={sortingCallbacks}
      searchFilters={[(object: KubeObject) => object.getSearchFields()]}
      renderHeaderTitle={KubeObject.crd.title}
      renderTableHeader={renderTableHeader}
      renderTableContents={(object: KubeObject) => [
        <WithTooltip>{object.getName()}</WithTooltip>,
        <WithTooltip>{KubeObject.getProviderName(object) ?? "-"}</WithTooltip>,
        <Badge label={KubeObject.getStatusText(object)} className={KubeObject.getStatusClass(object)} />,
        <WithTooltip>{KubeObject.getCapabilities(object) ?? "-"}</WithTooltip>,
        <BadgeBoolean value={KubeObject.getReady(object)} />,
        <KubeObjectAge object={object} key="age" />,
      ]}
    />
  );
});
