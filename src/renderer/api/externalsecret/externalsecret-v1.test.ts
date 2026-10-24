import { describe, expect, it } from "vitest";
import { ExternalSecret } from "./externalsecret-v1";

// `@freelensapp/extensions` is stubbed for tests (see `test/freelens-extensions.ts`),
// which lets us construct a real `ExternalSecret` instance from plain resource data.
describe("ExternalSecret (v1)", () => {
  const buildExternalSecret = (spec: ExternalSecret["spec"], status?: ExternalSecret["status"]) =>
    new ExternalSecret({
      apiVersion: "external-secrets.io/v1",
      kind: "ExternalSecret",
      metadata: {
        name: "hello-world",
        namespace: "default",
        selfLink: "/apis/external-secrets.io/v1/namespaces/default/externalsecrets/hello-world",
      },
      spec,
      status,
    });

  describe("metadata", () => {
    it("is namespaced and serves external-secrets.io/v1", () => {
      expect(ExternalSecret.kind).toBe("ExternalSecret");
      expect(ExternalSecret.namespaced).toBe(true);
      expect(ExternalSecret.apiBase).toBe("/apis/external-secrets.io/v1/externalsecrets");
      expect(ExternalSecret.crd.apiVersions).toEqual(["external-secrets.io/v1"]);
      expect(ExternalSecret.crd.plural).toBe("externalsecrets");
      expect(ExternalSecret.crd.shortNames).toEqual(["es"]);
    });
  });

  describe("getReady", () => {
    it("returns true for a Ready condition with status True", () => {
      const object = buildExternalSecret({}, { conditions: [{ type: "Ready", status: "True" }] });
      expect(ExternalSecret.getReady(object)).toBe(true);
    });

    it("returns false for a Ready condition with status False", () => {
      const object = buildExternalSecret({}, { conditions: [{ type: "Ready", status: "False" }] });
      expect(ExternalSecret.getReady(object)).toBe(false);
    });

    it("returns undefined for a Ready condition with status Unknown", () => {
      const object = buildExternalSecret({}, { conditions: [{ type: "Ready", status: "Unknown" }] });
      expect(ExternalSecret.getReady(object)).toBeUndefined();
    });

    it("returns undefined when there is no Ready condition", () => {
      expect(ExternalSecret.getReady(buildExternalSecret({}))).toBeUndefined();
    });
  });

  describe("getStatusText", () => {
    it("returns the reason of a Ready condition with status True", () => {
      const object = buildExternalSecret(
        {},
        { conditions: [{ type: "Ready", status: "True", reason: "SecretSynced" }] },
      );
      expect(ExternalSecret.getStatusText(object)).toBe("SecretSynced");
    });

    it("defaults to Ready for a True condition without a reason", () => {
      const object = buildExternalSecret({}, { conditions: [{ type: "Ready", status: "True" }] });
      expect(ExternalSecret.getStatusText(object)).toBe("Ready");
    });

    it("returns the reason of a Ready condition with status False", () => {
      const object = buildExternalSecret(
        {},
        { conditions: [{ type: "Ready", status: "False", reason: "SecretSyncedError" }] },
      );
      expect(ExternalSecret.getStatusText(object)).toBe("SecretSyncedError");
    });

    it("defaults to Not Ready for a False condition without a reason", () => {
      const object = buildExternalSecret({}, { conditions: [{ type: "Ready", status: "False" }] });
      expect(ExternalSecret.getStatusText(object)).toBe("Not Ready");
    });

    it("returns Unknown for a Ready condition with status Unknown", () => {
      const object = buildExternalSecret({}, { conditions: [{ type: "Ready", status: "Unknown" }] });
      expect(ExternalSecret.getStatusText(object)).toBe("Unknown");
    });

    it("returns Unknown when there is no Ready condition", () => {
      expect(ExternalSecret.getStatusText(buildExternalSecret({}))).toBe("Unknown");
    });
  });

  describe("getStatusClass", () => {
    it("maps True to success", () => {
      const object = buildExternalSecret({}, { conditions: [{ type: "Ready", status: "True" }] });
      expect(ExternalSecret.getStatusClass(object)).toBe("success");
    });

    it("maps False to error", () => {
      const object = buildExternalSecret({}, { conditions: [{ type: "Ready", status: "False" }] });
      expect(ExternalSecret.getStatusClass(object)).toBe("error");
    });

    it("maps Unknown to warning", () => {
      const object = buildExternalSecret({}, { conditions: [{ type: "Ready", status: "Unknown" }] });
      expect(ExternalSecret.getStatusClass(object)).toBe("warning");
    });

    it("maps a missing condition to no class", () => {
      expect(ExternalSecret.getStatusClass(buildExternalSecret({}))).toBe("");
    });
  });

  describe("store columns", () => {
    it("returns the store type from the spec", () => {
      const object = buildExternalSecret({
        secretStoreRef: { name: "aws-store", kind: "ClusterSecretStore" },
      });
      expect(ExternalSecret.getStoreType(object)).toBe("ClusterSecretStore");
    });

    it("defaults the store type to SecretStore", () => {
      expect(ExternalSecret.getStoreType(buildExternalSecret({}))).toBe("SecretStore");
    });

    it("returns the store name from the spec", () => {
      const object = buildExternalSecret({ secretStoreRef: { name: "aws-store" } });
      expect(ExternalSecret.getStoreName(object)).toBe("aws-store");
    });

    it("returns undefined when there is no store reference", () => {
      expect(ExternalSecret.getStoreName(buildExternalSecret({}))).toBeUndefined();
    });
  });

  describe("getRefreshInterval", () => {
    it("returns the refresh interval from the spec", () => {
      expect(ExternalSecret.getRefreshInterval(buildExternalSecret({ refreshInterval: "30s" }))).toBe("30s");
    });

    it("defaults to 1h0m0s", () => {
      expect(ExternalSecret.getRefreshInterval(buildExternalSecret({}))).toBe("1h0m0s");
    });
  });

  describe("getRefreshTime and getSyncedResourceVersion", () => {
    it("returns the last sync time from the status", () => {
      const object = buildExternalSecret({}, { refreshTime: "2024-01-01T00:00:00Z" });
      expect(ExternalSecret.getRefreshTime(object)).toBe("2024-01-01T00:00:00Z");
    });

    it("returns undefined when the status has no refresh time", () => {
      expect(ExternalSecret.getRefreshTime(buildExternalSecret({}))).toBeUndefined();
    });

    it("returns the synced resource version from the status", () => {
      const object = buildExternalSecret({}, { syncedResourceVersion: "1-5c833527afd7ba3f426cb0082ee7e083" });
      expect(ExternalSecret.getSyncedResourceVersion(object)).toBe("1-5c833527afd7ba3f426cb0082ee7e083");
    });
  });

  describe("getTargetName", () => {
    it("returns the target name from the spec", () => {
      const object = buildExternalSecret({ target: { name: "application-config" } });
      expect(ExternalSecret.getTargetName(object)).toBe("application-config");
    });

    it("defaults to the name of the ExternalSecret", () => {
      expect(ExternalSecret.getTargetName(buildExternalSecret({}))).toBe("hello-world");
    });
  });
});
