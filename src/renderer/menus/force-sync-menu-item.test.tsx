// @vitest-environment jsdom

import { Renderer } from "@freelensapp/extensions";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClusterExternalSecret } from "../api/clusterexternalsecret/clusterexternalsecret-v1";
import { ExternalSecret } from "../api/externalsecret/externalsecret-v1";
import { ForceSyncMenuItem } from "./force-sync-menu-item";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.useRealTimers();
});

const externalSecret = new ExternalSecret({
  apiVersion: "external-secrets.io/v1",
  kind: "ExternalSecret",
  metadata: { name: "hello-world", namespace: "default", selfLink: "" },
  spec: {},
});

const clusterExternalSecret = new ClusterExternalSecret({
  apiVersion: "external-secrets.io/v1",
  kind: "ClusterExternalSecret",
  metadata: { name: "hello-everywhere", selfLink: "" },
  spec: { externalSecretSpec: {} },
});

// The store of a kind, as the host returns it for a served version.
const serveExternalSecrets = (patch = vi.fn(() => Promise.resolve())) => {
  vi.spyOn(ExternalSecret, "getStore").mockReturnValue({ patch } as never);
  return patch;
};

const serveClusterExternalSecrets = (patch = vi.fn(() => Promise.resolve())) => {
  vi.spyOn(ClusterExternalSecret, "getStore").mockReturnValue({ patch } as never);
  return patch;
};

describe("ForceSyncMenuItem", () => {
  it("writes the force-sync annotation of an ExternalSecret with a merge patch, and confirms it", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-08T00:00:00.000Z"));
    const patch = serveExternalSecrets();

    render(<ForceSyncMenuItem object={externalSecret} />);
    fireEvent.click(screen.getByText("Force Sync"));

    await vi.waitFor(() =>
      expect(Renderer.Component.Notifications.ok).toHaveBeenCalledExactlyOnceWith(
        "Force sync requested for ExternalSecret default/hello-world",
      ),
    );
    expect(patch).toHaveBeenCalledExactlyOnceWith(
      externalSecret,
      { metadata: { annotations: { "external-secrets.io/force-sync": String(Date.UTC(2026, 10, 8) / 1000) } } },
      "merge",
    );
  });

  it("patches a ClusterExternalSecret through its own store", async () => {
    const externalSecretPatch = serveExternalSecrets();
    const patch = serveClusterExternalSecrets();

    render(<ForceSyncMenuItem object={clusterExternalSecret} />);
    fireEvent.click(screen.getByText("Force Sync"));

    await vi.waitFor(() =>
      expect(Renderer.Component.Notifications.ok).toHaveBeenCalledExactlyOnceWith(
        "Force sync requested for ClusterExternalSecret hello-everywhere",
      ),
    );
    expect(patch).toHaveBeenCalledOnce();
    expect(externalSecretPatch).not.toHaveBeenCalled();
  });

  it("shows a failed patch as an error notification, and leaves no unhandled rejection", async () => {
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);

    try {
      serveExternalSecrets(vi.fn(() => Promise.reject(new Error("forbidden"))));

      render(<ForceSyncMenuItem object={externalSecret} />);
      fireEvent.click(screen.getByText("Force Sync"));

      await vi.waitFor(() =>
        expect(Renderer.Component.Notifications.error).toHaveBeenCalledExactlyOnceWith(
          "Failed to force sync ExternalSecret default/hello-world: forbidden",
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(unhandled).not.toHaveBeenCalled();
      expect(Renderer.Component.Notifications.ok).not.toHaveBeenCalled();
    } finally {
      process.off("unhandledRejection", unhandled);
    }
  });

  it("shows an error notification when the host serves no version of the kind", async () => {
    render(<ForceSyncMenuItem object={externalSecret} />);
    fireEvent.click(screen.getByText("Force Sync"));

    await vi.waitFor(() =>
      expect(Renderer.Component.Notifications.error).toHaveBeenCalledExactlyOnceWith(
        "Failed to force sync ExternalSecret default/hello-world: Store for ExternalSecret is not registered. Extension won't work correctly.",
      ),
    );
  });
});
