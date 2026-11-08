import { describe, expect, it } from "vitest";
import { PushSecret } from "./pushsecret-v1alpha1";

describe("PushSecret (v1alpha1)", () => {
  const build = (spec: Partial<PushSecret["spec"]>, status?: PushSecret["status"]) =>
    new PushSecret({
      apiVersion: "external-secrets.io/v1alpha1",
      kind: "PushSecret",
      metadata: {
        name: "hello-world",
        namespace: "default",
        selfLink: "/apis/external-secrets.io/v1alpha1/namespaces/default/pushsecrets/hello-world",
      },
      spec: { secretStoreRefs: [], selector: {}, ...spec },
      status,
    });

  describe("metadata", () => {
    it("is namespaced and serves external-secrets.io/v1alpha1", () => {
      expect(PushSecret.kind).toBe("PushSecret");
      expect(PushSecret.namespaced).toBe(true);
      expect(PushSecret.apiBase).toBe("/apis/external-secrets.io/v1alpha1/pushsecrets");
      expect(PushSecret.crd.apiVersions).toEqual(["external-secrets.io/v1alpha1"]);
      expect(PushSecret.crd.plural).toBe("pushsecrets");
      expect(PushSecret.crd.shortNames).toEqual(["ps"]);
    });
  });

  describe("the status columns", () => {
    it("read the Ready condition with the controller's reasons as defaults", () => {
      const synced = build({}, { conditions: [{ type: "Ready", status: "True" }] });
      expect(PushSecret.getReady(synced)).toBe(true);
      expect(PushSecret.getStatusText(synced)).toBe("Synced");
      expect(PushSecret.getStatusClass(synced)).toBe("success");

      const errored = build({}, { conditions: [{ type: "Ready", status: "False", message: "store not ready" }] });
      expect(PushSecret.getReady(errored)).toBe(false);
      expect(PushSecret.getStatusText(errored)).toBe("Errored");
      expect(PushSecret.getStatusMessage(errored)).toBe("store not ready");
    });

    it("return Unknown without a Ready condition", () => {
      expect(PushSecret.getReady(build({}))).toBeUndefined();
      expect(PushSecret.getStatusText(build({}))).toBe("Unknown");
    });
  });

  describe("getSourceText", () => {
    it("names the source Secret", () => {
      const object = build({ selector: { secret: { name: "hello-world" } } });
      expect(PushSecret.getSecretName(object)).toBe("hello-world");
      expect(PushSecret.getSourceText(object)).toBe("hello-world");
    });

    it("describes a label selector and a generator, which name no Secret", () => {
      const bySelector = build({ selector: { secret: { selector: { matchLabels: { app: "web" } } } } });
      expect(PushSecret.getSecretName(bySelector)).toBeUndefined();
      expect(PushSecret.getSourceText(bySelector)).toBe("selector app=web");

      const byGenerator = build({ selector: { generatorRef: { kind: "Password", name: "pw" } } });
      expect(PushSecret.getSourceText(byGenerator)).toBe("generator Password/pw");
    });
  });

  describe("getStoreNames", () => {
    it("formats every store reference", () => {
      const object = build({
        secretStoreRefs: [{ name: "fake-store" }, { kind: "ClusterSecretStore", labelSelector: { matchLabels: {} } }],
      });
      expect(PushSecret.getStoreNames(object)).toEqual(["SecretStore/fake-store", "ClusterSecretStore selector *"]);
    });
  });

  describe("the defaults of the spec", () => {
    it("fill in the controller defaults", () => {
      const object = build({});
      expect(PushSecret.getRefreshInterval(object)).toBe("1h0m0s");
      expect(PushSecret.getUpdatePolicy(object)).toBe("Replace");
      expect(PushSecret.getDeletionPolicy(object)).toBe("None");
    });

    it("read the values of the spec", () => {
      const object = build({ refreshInterval: "30s", updatePolicy: "IfNotExists", deletionPolicy: "Delete" });
      expect(PushSecret.getRefreshInterval(object)).toBe("30s");
      expect(PushSecret.getUpdatePolicy(object)).toBe("IfNotExists");
      expect(PushSecret.getDeletionPolicy(object)).toBe("Delete");
    });
  });

  describe("the sync status", () => {
    it("reads the refresh time and the synced resource version", () => {
      const object = build({}, { refreshTime: "2024-01-01T00:00:00Z", syncedResourceVersion: "1-abc" });
      expect(PushSecret.getRefreshTime(object)).toBe("2024-01-01T00:00:00Z");
      expect(PushSecret.getSyncedResourceVersion(object)).toBe("1-abc");
    });
  });
});
