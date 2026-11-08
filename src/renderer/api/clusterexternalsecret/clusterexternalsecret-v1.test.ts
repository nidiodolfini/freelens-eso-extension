import { describe, expect, it } from "vitest";
import { ClusterExternalSecret } from "./clusterexternalsecret-v1";

describe("ClusterExternalSecret (v1)", () => {
  const build = (spec: Partial<ClusterExternalSecret["spec"]>, status?: ClusterExternalSecret["status"]) =>
    new ClusterExternalSecret({
      apiVersion: "external-secrets.io/v1",
      kind: "ClusterExternalSecret",
      metadata: {
        name: "hello-everywhere",
        selfLink: "/apis/external-secrets.io/v1/clusterexternalsecrets/hello-everywhere",
      },
      spec: { externalSecretSpec: {}, ...spec },
      status,
    });

  describe("metadata", () => {
    it("is cluster-scoped and serves external-secrets.io/v1, then v1beta1 where v1 is not served", () => {
      expect(ClusterExternalSecret.kind).toBe("ClusterExternalSecret");
      expect(ClusterExternalSecret.namespaced).toBe(false);
      expect(ClusterExternalSecret.apiBase).toBe("/apis/external-secrets.io/v1/clusterexternalsecrets");
      expect(ClusterExternalSecret.crd.apiVersions).toEqual(["external-secrets.io/v1", "external-secrets.io/v1beta1"]);
      expect(ClusterExternalSecret.crd.plural).toBe("clusterexternalsecrets");
      expect(ClusterExternalSecret.crd.shortNames).toEqual(["ces"]);
    });
  });

  describe("getReady and getStatusMessage", () => {
    it("reads the Ready condition, which has a message and no reason", () => {
      const object = build({}, { conditions: [{ type: "Ready", status: "False", message: "one namespace failed" }] });
      expect(ClusterExternalSecret.getReady(object)).toBe(false);
      expect(ClusterExternalSecret.getStatusClass(object)).toBe("error");
      expect(ClusterExternalSecret.getStatusMessage(object)).toBe("one namespace failed");
    });

    it("returns undefined without a Ready condition", () => {
      expect(ClusterExternalSecret.getReady(build({}))).toBeUndefined();
      expect(ClusterExternalSecret.getStatusMessage(build({}))).toBeUndefined();
    });
  });

  describe("the store columns", () => {
    it("read the store of the embedded ExternalSecret spec", () => {
      const object = build({
        externalSecretSpec: { secretStoreRef: { name: "fake-cluster-store", kind: "ClusterSecretStore" } },
      });
      expect(ClusterExternalSecret.getStoreType(object)).toBe("ClusterSecretStore");
      expect(ClusterExternalSecret.getStoreName(object)).toBe("fake-cluster-store");
    });

    it("default the store type to SecretStore", () => {
      expect(ClusterExternalSecret.getStoreType(build({}))).toBe("SecretStore");
      expect(ClusterExternalSecret.getStoreName(build({}))).toBeUndefined();
    });
  });

  describe("getRefreshInterval", () => {
    it("reads spec.refreshTime, with no default", () => {
      expect(ClusterExternalSecret.getRefreshInterval(build({ refreshTime: "1m" }))).toBe("1m");
      expect(ClusterExternalSecret.getRefreshInterval(build({}))).toBeUndefined();
    });
  });

  describe("getExternalSecretName", () => {
    it("prefers the spec, then the status, then the object's name", () => {
      expect(ClusterExternalSecret.getExternalSecretName(build({ externalSecretName: "from-spec" }))).toBe("from-spec");
      expect(ClusterExternalSecret.getExternalSecretName(build({}, { externalSecretName: "from-status" }))).toBe(
        "from-status",
      );
      expect(ClusterExternalSecret.getExternalSecretName(build({}))).toBe("hello-everywhere");
    });
  });

  describe("the namespaces", () => {
    it("read the provisioned and the failed namespaces of the status", () => {
      const object = build(
        {},
        {
          provisionedNamespaces: ["default", "apps"],
          failedNamespaces: [{ namespace: "locked", reason: "secret store not found" }],
        },
      );
      expect(ClusterExternalSecret.getProvisionedNamespaces(object)).toEqual(["default", "apps"]);
      expect(ClusterExternalSecret.getFailedNamespaces(object)).toEqual([
        { namespace: "locked", reason: "secret store not found" },
      ]);
    });

    it("are empty without a status", () => {
      expect(ClusterExternalSecret.getProvisionedNamespaces(build({}))).toEqual([]);
      expect(ClusterExternalSecret.getFailedNamespaces(build({}))).toEqual([]);
    });
  });
});
