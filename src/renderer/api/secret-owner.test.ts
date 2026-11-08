import { describe, expect, it } from "vitest";
import { getOwningExternalSecret, isManagedByEso } from "./secret-owner";

const owner = {
  apiVersion: "external-secrets.io/v1",
  kind: "ExternalSecret",
  name: "hello-world",
  uid: "1",
  controller: true,
  blockOwnerDeletion: true,
};

describe("isManagedByEso", () => {
  it("is true for the managed label the controller writes", () => {
    expect(isManagedByEso({ labels: { "reconcile.external-secrets.io/managed": "true" } })).toBe(true);
  });

  it("is false without the label, or with another value", () => {
    expect(isManagedByEso({})).toBe(false);
    expect(isManagedByEso({ labels: { "reconcile.external-secrets.io/managed": "false" } })).toBe(false);
  });
});

describe("getOwningExternalSecret", () => {
  it("returns the ExternalSecret of the owner reference, in the Secret's namespace", () => {
    expect(getOwningExternalSecret({ namespace: "default", ownerReferences: [owner] })).toEqual({
      name: "hello-world",
      namespace: "default",
    });
  });

  it("ignores owners of other kinds and groups", () => {
    const deployment = { apiVersion: "apps/v1", kind: "Deployment", name: "web", uid: "2" };
    const otherGroup = { ...owner, apiVersion: "other.io/v1" };
    expect(
      getOwningExternalSecret({ namespace: "default", ownerReferences: [deployment, otherGroup] }),
    ).toBeUndefined();
  });

  it("returns undefined for a Secret without owner references", () => {
    expect(getOwningExternalSecret({ namespace: "default" })).toBeUndefined();
  });
});
