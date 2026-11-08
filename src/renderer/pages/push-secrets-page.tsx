import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { PushSecret, type PushSecretApi } from "../api/pushsecret/pushsecret-v1alpha1";
import styles from "./eso-pages.module.scss";
import { LastSync } from "./last-sync";

const { observer } = MobxReact;

const {
  Component: { Badge, BadgeBoolean, KubeObjectAge, KubeObjectListLayout, LinkToNamespace, WithTooltip },
} = Renderer;

const KubeObject = PushSecret;
type KubeObject = PushSecret;
type KubeObjectApi = PushSecretApi;

const sortingCallbacks = {
  name: (object: KubeObject) => object.getName(),
  namespace: (object: KubeObject) => object.getNs(),
  secret: (object: KubeObject) => KubeObject.getSourceText(object),
  stores: (object: KubeObject) => KubeObject.getStoreNames(object).join(", "),
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
  { title: "Secret", sortBy: "secret", id: "secret", className: styles.secret },
  { title: "Stores", sortBy: "stores", id: "stores", className: styles.stores },
  { title: "Refresh Interval", sortBy: "refreshInterval", id: "refreshInterval", className: styles.refreshInterval },
  { title: "Status", sortBy: "status", id: "status", className: styles.status },
  { title: "Ready", sortBy: "ready", id: "ready", className: styles.ready },
  { title: "Last Sync", sortBy: "lastSync", id: "lastSync", className: styles.lastSync },
  { title: "Age", sortBy: "age", id: "age", className: styles.age },
];

// The columns mirror `kubectl get ps`: STATUS, LAST SYNC, plus the source Secret and the stores it is pushed to.
export const PushSecretsPage = observer(() => {
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
        <WithTooltip>{KubeObject.getSourceText(object)}</WithTooltip>,
        <WithTooltip>{KubeObject.getStoreNames(object).join(", ") || "-"}</WithTooltip>,
        <WithTooltip>{KubeObject.getRefreshInterval(object)}</WithTooltip>,
        <Badge label={KubeObject.getStatusText(object)} className={KubeObject.getStatusClass(object)} />,
        <BadgeBoolean value={KubeObject.getReady(object)} />,
        <LastSync timestamp={KubeObject.getRefreshTime(object)} />,
        <KubeObjectAge object={object} key="age" />,
      ]}
    />
  );
});
