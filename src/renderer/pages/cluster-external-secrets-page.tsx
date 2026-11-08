import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import {
  ClusterExternalSecret,
  type ClusterExternalSecretApi,
} from "../api/clusterexternalsecret/clusterexternalsecret-v1";
import styles from "./eso-pages.module.scss";

const { observer } = MobxReact;

const {
  Component: { Badge, BadgeBoolean, KubeObjectAge, KubeObjectListLayout, WithTooltip },
} = Renderer;

const KubeObject = ClusterExternalSecret;
type KubeObject = ClusterExternalSecret;
type KubeObjectApi = ClusterExternalSecretApi;

const sortingCallbacks = {
  name: (object: KubeObject) => object.getName(),
  storeType: (object: KubeObject) => KubeObject.getStoreType(object),
  store: (object: KubeObject) => KubeObject.getStoreName(object) ?? "",
  refreshInterval: (object: KubeObject) => KubeObject.getRefreshInterval(object) ?? "",
  namespaces: (object: KubeObject) => KubeObject.getProvisionedNamespaces(object).length,
  ready: (object: KubeObject) => String(KubeObject.getReady(object)),
  age: (object: KubeObject) => object.getCreationTimestamp(),
};

type ColumnId = keyof typeof sortingCallbacks;

// Every column has an id, the key of its sorting callback: the host makes a column with an id resizable, and lets the
// user hide it from the menu of a configurable list, which keeps the list readable in a narrow window.
const renderTableHeader: { title: string; sortBy: ColumnId; id: ColumnId; className?: string }[] = [
  { title: "Name", sortBy: "name", id: "name" },
  { title: "Store Type", sortBy: "storeType", id: "storeType", className: styles.storeType },
  { title: "Store", sortBy: "store", id: "store", className: styles.store },
  { title: "Refresh Interval", sortBy: "refreshInterval", id: "refreshInterval", className: styles.refreshInterval },
  { title: "Namespaces", sortBy: "namespaces", id: "namespaces", className: styles.namespaces },
  { title: "Ready", sortBy: "ready", id: "ready", className: styles.ready },
  { title: "Age", sortBy: "age", id: "age", className: styles.age },
];

// The columns mirror `kubectl get ces`: STORE, REFRESH INTERVAL, READY, plus the store type and the namespaces the
// controller provisioned, with the ones that failed as an error badge.
export const ClusterExternalSecretsPage = observer(() => {
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
      renderTableContents={(object: KubeObject) => {
        const provisioned = KubeObject.getProvisionedNamespaces(object);
        const failed = KubeObject.getFailedNamespaces(object);

        return [
          <WithTooltip>{object.getName()}</WithTooltip>,
          <WithTooltip>{KubeObject.getStoreType(object)}</WithTooltip>,
          <WithTooltip>{KubeObject.getStoreName(object) ?? "-"}</WithTooltip>,
          <WithTooltip>{KubeObject.getRefreshInterval(object) ?? "-"}</WithTooltip>,
          <>
            <WithTooltip tooltip={provisioned.join(", ") || "none"}>{String(provisioned.length)}</WithTooltip>
            {failed.length > 0 && (
              <Badge
                label={`${failed.length} failed`}
                className="error"
                tooltip={failed.map((failure) => failure.namespace).join(", ")}
              />
            )}
          </>,
          <BadgeBoolean value={KubeObject.getReady(object)} />,
          <KubeObjectAge object={object} key="age" />,
        ];
      }}
    />
  );
});
