import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import { PushSecret, type PushSecretApi } from "../api/pushsecret/pushsecret-v1alpha1";
import styles from "./eso-pages.module.scss";

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

const renderTableHeader: { title: string; sortBy: keyof typeof sortingCallbacks; className?: string }[] = [
  { title: "Name", sortBy: "name" },
  { title: "Namespace", sortBy: "namespace" },
  { title: "Secret", sortBy: "secret", className: styles.secret },
  { title: "Stores", sortBy: "stores", className: styles.stores },
  { title: "Refresh Interval", sortBy: "refreshInterval", className: styles.refreshInterval },
  { title: "Status", sortBy: "status", className: styles.status },
  { title: "Ready", sortBy: "ready", className: styles.ready },
  { title: "Last Sync", sortBy: "lastSync", className: styles.lastSync },
  { title: "Age", sortBy: "age", className: styles.age },
];

// The columns mirror `kubectl get ps`: STATUS, LAST SYNC, plus the source Secret and the stores it is pushed to.
export const PushSecretsPage = observer(() => {
  const store = KubeObject.getStore<KubeObject>();

  return (
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
        <WithTooltip>{KubeObject.getSourceText(object)}</WithTooltip>,
        <WithTooltip>{KubeObject.getStoreNames(object).join(", ") || "-"}</WithTooltip>,
        KubeObject.getRefreshInterval(object),
        <Badge label={KubeObject.getStatusText(object)} className={KubeObject.getStatusClass(object)} />,
        <BadgeBoolean value={KubeObject.getReady(object)} />,
        <WithTooltip>{KubeObject.getRefreshTime(object) ?? "-"}</WithTooltip>,
        <KubeObjectAge object={object} key="age" />,
      ]}
    />
  );
});
