import { describe, expect, it } from "vitest";
import { SecretStore } from "./secretstore-v1";

describe("SecretStore (v1)", () => {
  const buildSecretStore = (spec: SecretStore["spec"], status?: SecretStore["status"]) =>
    new SecretStore({
      apiVersion: "external-secrets.io/v1",
      kind: "SecretStore",
      metadata: {
        name: "fake-store",
        namespace: "default",
        selfLink: "/apis/external-secrets.io/v1/namespaces/default/secretstores/fake-store",
      },
      spec,
      status,
    });

  describe("metadata", () => {
    it("is namespaced and serves external-secrets.io/v1", () => {
      expect(SecretStore.kind).toBe("SecretStore");
      expect(SecretStore.namespaced).toBe(true);
      expect(SecretStore.apiBase).toBe("/apis/external-secrets.io/v1/secretstores");
      expect(SecretStore.crd.apiVersions).toEqual(["external-secrets.io/v1"]);
      expect(SecretStore.crd.plural).toBe("secretstores");
      expect(SecretStore.crd.shortNames).toEqual(["ss"]);
    });
  });

  describe("getReady", () => {
    it("returns true for a Ready condition with status True", () => {
      const object = buildSecretStore({}, { conditions: [{ type: "Ready", status: "True" }] });
      expect(SecretStore.getReady(object)).toBe(true);
    });

    it("returns false for a Ready condition with status False", () => {
      const object = buildSecretStore({}, { conditions: [{ type: "Ready", status: "False" }] });
      expect(SecretStore.getReady(object)).toBe(false);
    });

    it("returns undefined for a Ready condition with status Unknown", () => {
      const object = buildSecretStore({}, { conditions: [{ type: "Ready", status: "Unknown" }] });
      expect(SecretStore.getReady(object)).toBeUndefined();
    });

    it("returns undefined when there is no Ready condition", () => {
      expect(SecretStore.getReady(buildSecretStore({}))).toBeUndefined();
    });
  });

  describe("getStatusText", () => {
    it("returns the reason of a Ready condition with status True", () => {
      const object = buildSecretStore({}, { conditions: [{ type: "Ready", status: "True", reason: "Valid" }] });
      expect(SecretStore.getStatusText(object)).toBe("Valid");
    });

    it("defaults to Valid for a True condition without a reason", () => {
      const object = buildSecretStore({}, { conditions: [{ type: "Ready", status: "True" }] });
      expect(SecretStore.getStatusText(object)).toBe("Valid");
    });

    it("returns the reason of a Ready condition with status False", () => {
      const object = buildSecretStore(
        {},
        { conditions: [{ type: "Ready", status: "False", reason: "ValidationFailed" }] },
      );
      expect(SecretStore.getStatusText(object)).toBe("ValidationFailed");
    });

    it("defaults to Invalid for a False condition without a reason", () => {
      const object = buildSecretStore({}, { conditions: [{ type: "Ready", status: "False" }] });
      expect(SecretStore.getStatusText(object)).toBe("Invalid");
    });

    it("returns Unknown for a Ready condition with status Unknown", () => {
      const object = buildSecretStore({}, { conditions: [{ type: "Ready", status: "Unknown" }] });
      expect(SecretStore.getStatusText(object)).toBe("Unknown");
    });

    it("returns Unknown when there is no Ready condition", () => {
      expect(SecretStore.getStatusText(buildSecretStore({}))).toBe("Unknown");
    });
  });

  describe("getStatusClass", () => {
    it("maps True to success", () => {
      const object = buildSecretStore({}, { conditions: [{ type: "Ready", status: "True" }] });
      expect(SecretStore.getStatusClass(object)).toBe("success");
    });

    it("maps False to error", () => {
      const object = buildSecretStore({}, { conditions: [{ type: "Ready", status: "False" }] });
      expect(SecretStore.getStatusClass(object)).toBe("error");
    });

    it("maps Unknown to warning", () => {
      const object = buildSecretStore({}, { conditions: [{ type: "Ready", status: "Unknown" }] });
      expect(SecretStore.getStatusClass(object)).toBe("warning");
    });

    it("maps a missing condition to no class", () => {
      expect(SecretStore.getStatusClass(buildSecretStore({}))).toBe("");
    });
  });

  describe("getProviderName", () => {
    it("returns the name of the provider backend", () => {
      const object = buildSecretStore({ provider: { fake: { data: [] } } });
      expect(SecretStore.getProviderName(object)).toBe("fake");
    });

    it("returns the first defined backend when several are set", () => {
      const object = buildSecretStore({ provider: { aws: { region: "us-east-1" }, fake: {} } });
      expect(SecretStore.getProviderName(object)).toBe("aws");
    });

    it("skips backends without a defined value", () => {
      const object = buildSecretStore({ provider: { aws: undefined, fake: { data: [] } } });
      expect(SecretStore.getProviderName(object)).toBe("fake");
    });

    it("returns undefined when there is no provider", () => {
      expect(SecretStore.getProviderName(buildSecretStore({}))).toBeUndefined();
    });
  });

  describe("getCapabilities", () => {
    it("returns the capabilities from the status", () => {
      const object = buildSecretStore({}, { capabilities: "ReadWrite" });
      expect(SecretStore.getCapabilities(object)).toBe("ReadWrite");
    });

    it("returns undefined when the status has no capabilities", () => {
      expect(SecretStore.getCapabilities(buildSecretStore({}))).toBeUndefined();
    });
  });
});
