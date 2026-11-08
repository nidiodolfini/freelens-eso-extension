import { describe, expect, it } from "vitest";
import { ExternalSecret } from "./externalsecret/externalsecret-v1";
import { selfLinkOf, storeSelfLink } from "./links";

describe("selfLinkOf", () => {
  it("places the namespace before the plural of a namespaced kind", () => {
    expect(selfLinkOf(ExternalSecret, "hello-world", "default")).toBe(
      "/apis/external-secrets.io/v1/namespaces/default/externalsecrets/hello-world",
    );
  });

  it("appends the name to the apiBase of a cluster-scoped kind", () => {
    expect(selfLinkOf({ apiBase: "/apis/external-secrets.io/v1/clustersecretstores", namespaced: false }, "x")).toBe(
      "/apis/external-secrets.io/v1/clustersecretstores/x",
    );
  });

  it("handles a core kind, whose apiBase starts with /api", () => {
    expect(selfLinkOf({ apiBase: "/api/v1/secrets", namespaced: true }, "hello-world", "default")).toBe(
      "/api/v1/namespaces/default/secrets/hello-world",
    );
  });
});

describe("storeSelfLink", () => {
  it("links a ClusterSecretStore by name", () => {
    expect(storeSelfLink("ClusterSecretStore", "fake-cluster-store", "default")).toBe(
      "/apis/external-secrets.io/v1/clustersecretstores/fake-cluster-store",
    );
  });

  it("links a SecretStore in the namespace, also when the kind is omitted", () => {
    expect(storeSelfLink(undefined, "fake-store", "default")).toBe(
      "/apis/external-secrets.io/v1/namespaces/default/secretstores/fake-store",
    );
  });

  it("returns no link for a SecretStore without a namespace, or without a name", () => {
    expect(storeSelfLink("SecretStore", "fake-store")).toBe("");
    expect(storeSelfLink("ClusterSecretStore", undefined)).toBe("");
  });
});
