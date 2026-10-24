import { describe, expect, it } from "vitest";
import { ClusterSecretStore } from "./clustersecretstore-v1";

describe("ClusterSecretStore (v1)", () => {
  const buildClusterSecretStore = (spec: ClusterSecretStore["spec"], status?: ClusterSecretStore["status"]) =>
    new ClusterSecretStore({
      apiVersion: "external-secrets.io/v1",
      kind: "ClusterSecretStore",
      metadata: {
        name: "fake-cluster-store",
        selfLink: "/apis/external-secrets.io/v1/clustersecretstores/fake-cluster-store",
      },
      spec,
      status,
    });

  describe("metadata", () => {
    it("is cluster-scoped and serves external-secrets.io/v1", () => {
      expect(ClusterSecretStore.kind).toBe("ClusterSecretStore");
      expect(ClusterSecretStore.namespaced).toBe(false);
      expect(ClusterSecretStore.apiBase).toBe("/apis/external-secrets.io/v1/clustersecretstores");
      expect(ClusterSecretStore.crd.apiVersions).toEqual(["external-secrets.io/v1"]);
      expect(ClusterSecretStore.crd.plural).toBe("clustersecretstores");
      expect(ClusterSecretStore.crd.shortNames).toEqual(["css"]);
    });
  });

  describe("getReady", () => {
    it("returns true for a Ready condition with status True", () => {
      const object = buildClusterSecretStore({}, { conditions: [{ type: "Ready", status: "True" }] });
      expect(ClusterSecretStore.getReady(object)).toBe(true);
    });

    it("returns false for a Ready condition with status False", () => {
      const object = buildClusterSecretStore({}, { conditions: [{ type: "Ready", status: "False" }] });
      expect(ClusterSecretStore.getReady(object)).toBe(false);
    });

    it("returns undefined for a Ready condition with status Unknown", () => {
      const object = buildClusterSecretStore({}, { conditions: [{ type: "Ready", status: "Unknown" }] });
      expect(ClusterSecretStore.getReady(object)).toBeUndefined();
    });

    it("returns undefined when there is no Ready condition", () => {
      expect(ClusterSecretStore.getReady(buildClusterSecretStore({}))).toBeUndefined();
    });
  });

  describe("getStatusText", () => {
    it("returns the reason of a Ready condition with status True", () => {
      const object = buildClusterSecretStore({}, { conditions: [{ type: "Ready", status: "True", reason: "Valid" }] });
      expect(ClusterSecretStore.getStatusText(object)).toBe("Valid");
    });

    it("defaults to Valid for a True condition without a reason", () => {
      const object = buildClusterSecretStore({}, { conditions: [{ type: "Ready", status: "True" }] });
      expect(ClusterSecretStore.getStatusText(object)).toBe("Valid");
    });

    it("returns the reason of a Ready condition with status False", () => {
      const object = buildClusterSecretStore(
        {},
        { conditions: [{ type: "Ready", status: "False", reason: "InvalidStoreConfiguration" }] },
      );
      expect(ClusterSecretStore.getStatusText(object)).toBe("InvalidStoreConfiguration");
    });

    it("defaults to Invalid for a False condition without a reason", () => {
      const object = buildClusterSecretStore({}, { conditions: [{ type: "Ready", status: "False" }] });
      expect(ClusterSecretStore.getStatusText(object)).toBe("Invalid");
    });

    it("returns Unknown for a Ready condition with status Unknown", () => {
      const object = buildClusterSecretStore({}, { conditions: [{ type: "Ready", status: "Unknown" }] });
      expect(ClusterSecretStore.getStatusText(object)).toBe("Unknown");
    });

    it("returns Unknown when there is no Ready condition", () => {
      expect(ClusterSecretStore.getStatusText(buildClusterSecretStore({}))).toBe("Unknown");
    });
  });

  describe("getStatusClass", () => {
    it("maps True to success", () => {
      const object = buildClusterSecretStore({}, { conditions: [{ type: "Ready", status: "True" }] });
      expect(ClusterSecretStore.getStatusClass(object)).toBe("success");
    });

    it("maps False to error", () => {
      const object = buildClusterSecretStore({}, { conditions: [{ type: "Ready", status: "False" }] });
      expect(ClusterSecretStore.getStatusClass(object)).toBe("error");
    });

    it("maps Unknown to warning", () => {
      const object = buildClusterSecretStore({}, { conditions: [{ type: "Ready", status: "Unknown" }] });
      expect(ClusterSecretStore.getStatusClass(object)).toBe("warning");
    });

    it("maps a missing condition to no class", () => {
      expect(ClusterSecretStore.getStatusClass(buildClusterSecretStore({}))).toBe("");
    });
  });

  describe("getProviderName", () => {
    it("returns the name of the provider backend", () => {
      const object = buildClusterSecretStore({ provider: { gcpsm: { projectID: "myproject" } } });
      expect(ClusterSecretStore.getProviderName(object)).toBe("gcpsm");
    });

    it("returns undefined when there is no provider", () => {
      expect(ClusterSecretStore.getProviderName(buildClusterSecretStore({}))).toBeUndefined();
    });
  });

  describe("getCapabilities", () => {
    it("returns the capabilities from the status", () => {
      const object = buildClusterSecretStore({}, { capabilities: "ReadOnly" });
      expect(ClusterSecretStore.getCapabilities(object)).toBe("ReadOnly");
    });

    it("returns undefined when the status has no capabilities", () => {
      expect(ClusterSecretStore.getCapabilities(buildClusterSecretStore({}))).toBeUndefined();
    });
  });
});
