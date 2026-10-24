import { Renderer } from "@freelensapp/extensions";
import * as MobxReact from "mobx-react";
import {
  ExternalSecret,
  type ExternalSecretApi,
  getExternalSecretStore,
} from "../api/externalsecret/externalsecret-v1";
import styles from "./eso-pages.module.scss";
import stylesInline from "./eso-pages.module.scss?inline";

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

const renderTableHeader: { title: string; sortBy: keyof typeof sortingCallbacks; className?: string }[] = [
  { title: "Name", sortBy: "name" },
  { title: "Namespace", sortBy: "namespace" },
  { title: "Store Type", sortBy: "storeType", className: styles.storeType },
  { title: "Store", sortBy: "store", className: styles.store },
  { title: "Refresh Interval", sortBy: "refreshInterval", className: styles.refreshInterval },
  { title: "Status", sortBy: "status", className: styles.status },
  { title: "Ready", sortBy: "ready", className: styles.ready },
  { title: "Last Sync", sortBy: "lastSync", className: styles.lastSync },
  { title: "Age", sortBy: "age", className: styles.age },
];

// The columns mirror `kubectl get es`: STORETYPE, STORE, REFRESH INTERVAL, STATUS, READY, LAST SYNC.
export const ExternalSecretsPage = observer(() => {
  const store = getExternalSecretStore();

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
          KubeObject.getStoreType(object),
          KubeObject.getStoreName(object) ?? "-",
          KubeObject.getRefreshInterval(object),
          <Badge label={KubeObject.getStatusText(object)} className={KubeObject.getStatusClass(object)} />,
          <BadgeBoolean value={KubeObject.getReady(object)} />,
          <WithTooltip>{KubeObject.getRefreshTime(object) ?? "-"}</WithTooltip>,
          <KubeObjectAge object={object} key="age" />,
        ]}
      />
    </>
  );
});
