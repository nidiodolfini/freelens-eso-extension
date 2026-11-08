import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { ExternalSecret, type ExternalSecretApi } from "../api/externalsecret/externalsecret-v1";
import styles from "./eso-pages.module.scss";
import { LastSync } from "./last-sync";

const { observer } = MobxReact;

const {
  Component: { Badge, BadgeBoolean, KubeObjectAge, KubeObjectListLayout, LinkToNamespace, WithTooltip },
} = Renderer;

const KubeObject = ExternalSecret;
type KubeObject = ExternalSecret;
type KubeObjectApi = ExternalSecretApi;

const sortingCallbacks = {
  name: (object: KubeObject) => object.getName(),
  namespace: (object: KubeObject) => object.getNs(),
  storeType: (object: KubeObject) => KubeObject.getStoreType(object),
  store: (object: KubeObject) => KubeObject.getStoreName(object) ?? "",
  refreshInterval: (object: KubeObject) => KubeObject.getRefreshInterval(object),
  status: (object: KubeObject) => KubeObject.getStatusText(object),
  ready: (object: KubeObject) => String(KubeObject.getReady(object)),
  lastSync: (object: KubeObject) => KubeObject.getRefreshTime(object) ?? "",
  age: (object: KubeObject) => object.getCreationTimestamp(),
};

type ColumnId = keyof typeof sortingCallbacks;

// Every column has an id, the key of its sorting callback: the host makes a column with an id resizable, and lets the
// user hide it from the menu of a configurable list, which keeps the list readable in a narrow window.
const renderTableHeader: { title: string; sortBy: ColumnId; id: ColumnId; className?: string }[] = [
  { title: "Name", sortBy: "name", id: "name" },
  { title: "Namespace", sortBy: "namespace", id: "namespace" },
  { title: "Store Type", sortBy: "storeType", id: "storeType", className: styles.storeType },
  { title: "Store", sortBy: "store", id: "store", className: styles.store },
  { title: "Refresh Interval", sortBy: "refreshInterval", id: "refreshInterval", className: styles.refreshInterval },
  { title: "Status", sortBy: "status", id: "status", className: styles.status },
  { title: "Ready", sortBy: "ready", id: "ready", className: styles.ready },
  { title: "Last Sync", sortBy: "lastSync", id: "lastSync", className: styles.lastSync },
  { title: "Age", sortBy: "age", id: "age", className: styles.age },
];

// The columns mirror `kubectl get es`: STORETYPE, STORE, REFRESH INTERVAL, STATUS, READY, LAST SYNC.
export const ExternalSecretsPage = observer(() => {
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
        <LinkToNamespace namespace={object.getNs()} />,
        <WithTooltip>{KubeObject.getStoreType(object)}</WithTooltip>,
        <WithTooltip>{KubeObject.getStoreName(object) ?? "-"}</WithTooltip>,
        <WithTooltip>{KubeObject.getRefreshInterval(object)}</WithTooltip>,
        <Badge label={KubeObject.getStatusText(object)} className={KubeObject.getStatusClass(object)} />,
        <BadgeBoolean value={KubeObject.getReady(object)} />,
        <LastSync timestamp={KubeObject.getRefreshTime(object)} />,
        <KubeObjectAge object={object} key="age" />,
      ]}
    />
  );
});
