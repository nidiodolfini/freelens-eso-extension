import { Renderer } from "@freelensapp/extensions";
import { formatDataFrom, formatRemoteRef, formatStoreRef } from "../api/store-helpers";

import type { ExternalSecretSpec } from "../api/types";

const {
  Component: { DrawerItem },
} = Renderer;

export interface ExternalSecretDataItemsProps {
  spec: ExternalSecretSpec;
}

/**
 * The data mappings of an ExternalSecret spec, one line per entry: `spec.data[]`, as the key of the Secret and the
 * remote reference it takes its value from, and `spec.dataFrom[]`. Shared by the ExternalSecret details and the
 * ClusterExternalSecret details, whose `externalSecretSpec` is the same type.
 */
export function ExternalSecretDataItems({ spec }: ExternalSecretDataItemsProps) {
  const data = spec.data ?? [];
  const dataFrom = spec.dataFrom ?? [];

  return (
    <>
      <DrawerItem name="Data" hidden={!data.length}>
        {data.map((entry) => (
          <div key={entry.secretKey}>
            {entry.secretKey} {"<-"} {formatRemoteRef(entry.remoteRef)}
            {entry.sourceRef?.storeRef ? ` from ${formatStoreRef(entry.sourceRef.storeRef)}` : ""}
          </div>
        ))}
      </DrawerItem>
      <DrawerItem name="Data From" hidden={!dataFrom.length}>
        {dataFrom.map((entry, index) => (
          <div key={`${index}-${formatDataFrom(entry)}`}>{formatDataFrom(entry)}</div>
        ))}
      </DrawerItem>
    </>
  );
}
