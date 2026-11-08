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

const renderTableHeader: { title: string; sortBy: keyof typeof sortingCallbacks; className?: string }[] = [
  { title: "Name", sortBy: "name" },
  { title: "Store Type", sortBy: "storeType", className: styles.storeType },
  { title: "Store", sortBy: "store", className: styles.store },
  { title: "Refresh Interval", sortBy: "refreshInterval", className: styles.refreshInterval },
  { title: "Namespaces", sortBy: "namespaces", className: styles.namespaces },
  { title: "Ready", sortBy: "ready", className: styles.ready },
  { title: "Age", sortBy: "age", className: styles.age },
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
      sortingCallbacks={sortingCallbacks}
      searchFilters={[(object: KubeObject) => object.getSearchFields()]}
      renderHeaderTitle={KubeObject.crd.title}
      renderTableHeader={renderTableHeader}
      renderTableContents={(object: KubeObject) => {
        const provisioned = KubeObject.getProvisionedNamespaces(object);
        const failed = KubeObject.getFailedNamespaces(object);

        return [
          <WithTooltip>{object.getName()}</WithTooltip>,
          KubeObject.getStoreType(object),
          KubeObject.getStoreName(object) ?? "-",
          KubeObject.getRefreshInterval(object) ?? "-",
          <>
            <WithTooltip tooltip={provisioned.join(", ")}>{String(provisioned.length)}</WithTooltip>
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
