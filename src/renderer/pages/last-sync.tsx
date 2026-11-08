import { Renderer } from "@freelensapp/extensions";

const {
  Component: { ReactiveDuration, WithTooltip },
} = Renderer;

export interface LastSyncProps {
  timestamp: string | undefined;
}

/**
 * The time of the last sync as `kubectl get` prints a `date` column: the time since it, such as `5m`, which fits a
 * narrow column, with the date in the tooltip. A dash for an object that has not synced yet.
 */
export function LastSync({ timestamp }: LastSyncProps) {
  if (!timestamp) return <>-</>;

  return (
    <WithTooltip tooltip={new Date(timestamp)}>
      <ReactiveDuration timestamp={timestamp} />
    </WithTooltip>
  );
}
