// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ClusterExternalSecret } from "../api/clusterexternalsecret/clusterexternalsecret-v1";
import { ClusterSecretStore } from "../api/clustersecretstore/clustersecretstore-v1";
import { ExternalSecret } from "../api/externalsecret/externalsecret-v1";
import { PushSecret } from "../api/pushsecret/pushsecret-v1alpha1";
import { SecretStore } from "../api/secretstore/secretstore-v1";
import { ClusterExternalSecretDetails } from "./cluster-external-secret-details";
import { ExternalSecretDetails } from "./external-secret-details";
import { PushSecretDetails } from "./push-secret-details";
import { SecretEsoDetails } from "./secret-eso-details";
import { StoreDetails } from "./store-details";

import type { Renderer } from "@freelensapp/extensions";

afterEach(() => {
  cleanup();
});

// What the host's own details of a custom resource show next to a panel: the printer columns of the kind's CRD,
// without Age, under the names that `startCase` gives them, and the conditions. A panel shows none of them again.
const hostItems = {
  ExternalSecret: ["Store Type", "Store", "Refresh Interval", "Status", "Ready", "Last Sync", "Conditions"],
  ClusterExternalSecret: ["Store", "Refresh Interval", "Ready", "Conditions"],
  PushSecret: ["Status", "Last Sync", "Conditions"],
  SecretStore: ["Status", "Capabilities", "Ready", "Conditions"],
};

/** The names of the panel's items, in order, as the stub of DrawerItem marks them. */
const itemNames = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("[data-name]"), (item) => item.getAttribute("data-name") ?? "");

/** The value of an item, as text. */
const itemText = (container: HTMLElement, name: string) =>
  container.querySelector(`[data-name="${name}"] > span:last-child`)?.textContent;

/** The targets of the links in an item, as the stub of `getMaybeDetailsUrl` passes the selfLinks through. */
const itemLinks = (container: HTMLElement, name: string) =>
  Array.from(container.querySelectorAll(`[data-name="${name}"] a`), (link) => link.getAttribute("href"));

const failedReady = (reason: string, message: string) => ({
  conditions: [{ type: "Ready", status: "False" as const, reason, message }],
});

const fullExternalSecret = new ExternalSecret({
  apiVersion: "external-secrets.io/v1",
  kind: "ExternalSecret",
  metadata: {
    name: "hello-world",
    namespace: "default",
    selfLink: "/apis/external-secrets.io/v1/namespaces/default/externalsecrets/hello-world",
  },
  spec: {
    secretStoreRef: { name: "vault", kind: "ClusterSecretStore" },
    refreshInterval: "30s",
    target: { name: "application-config", creationPolicy: "Merge", deletionPolicy: "Delete", immutable: true },
    data: [{ secretKey: "username", remoteRef: { key: "/db", property: "user" } }],
    dataFrom: [{ extract: { key: "/all" } }],
  },
  status: {
    refreshTime: "2024-01-01T00:00:00Z",
    syncedResourceVersion: "1-abc",
    ...failedReady("SecretSyncedError", "could not get secret data from provider"),
  },
});

const fullStore = new SecretStore({
  apiVersion: "external-secrets.io/v1",
  kind: "SecretStore",
  metadata: {
    name: "fake-store",
    namespace: "default",
    selfLink: "/apis/external-secrets.io/v1/namespaces/default/secretstores/fake-store",
  },
  spec: {
    provider: { fake: { data: [] } },
    controller: "dev",
    retrySettings: { maxRetries: 3, retryInterval: "10s" },
    refreshInterval: 60,
  },
  status: { capabilities: "ReadWrite", ...failedReady("ValidationFailed", "store validation failed") },
});

const fullClusterExternalSecret = new ClusterExternalSecret({
  apiVersion: "external-secrets.io/v1",
  kind: "ClusterExternalSecret",
  metadata: {
    name: "hello-everywhere",
    selfLink: "/apis/external-secrets.io/v1/clusterexternalsecrets/hello-everywhere",
  },
  spec: {
    externalSecretName: "hello",
    refreshTime: "1m",
    namespaceSelectors: [{ matchLabels: { team: "payments" } }],
    namespaces: ["legacy"],
    externalSecretSpec: {
      secretStoreRef: { name: "vault", kind: "ClusterSecretStore" },
      refreshInterval: "30s",
      target: { name: "app" },
      data: [{ secretKey: "token", remoteRef: { key: "/token" } }],
    },
  },
  status: {
    provisionedNamespaces: ["default"],
    failedNamespaces: [{ namespace: "locked", reason: "secret store not found" }],
    conditions: [{ type: "Ready", status: "False", message: "one namespace failed" }],
  },
});

const fullPushSecret = new PushSecret({
  apiVersion: "external-secrets.io/v1alpha1",
  kind: "PushSecret",
  metadata: {
    name: "hello-world",
    namespace: "default",
    selfLink: "/apis/external-secrets.io/v1alpha1/namespaces/default/pushsecrets/hello-world",
  },
  spec: {
    secretStoreRefs: [
      { name: "fake-store" },
      { kind: "ClusterSecretStore", labelSelector: { matchLabels: { tier: "a" } } },
    ],
    selector: { secret: { name: "hello-world" } },
    data: [{ match: { secretKey: "hello", remoteRef: { remoteKey: "/pushed/hello" } } }],
    dataTo: [{ storeRef: { name: "fake-store" }, remoteKey: "/bundle" }],
  },
  status: {
    refreshTime: "2024-01-01T00:00:00Z",
    syncedResourceVersion: "1-abc",
    ...failedReady("Errored", "set secret failed"),
  },
});

describe("the details panels", () => {
  it.each([
    { kind: "ExternalSecret", panel: () => render(<ExternalSecretDetails object={fullExternalSecret} />) },
    {
      kind: "ClusterExternalSecret",
      panel: () => render(<ClusterExternalSecretDetails object={fullClusterExternalSecret} />),
    },
    { kind: "PushSecret", panel: () => render(<PushSecretDetails object={fullPushSecret} />) },
    { kind: "SecretStore", panel: () => render(<StoreDetails object={fullStore} />) },
  ] as const)("show none of the items of the host's details of a $kind", ({ kind, panel }) => {
    const { container } = panel();

    expect(itemNames(container).length).toBeGreaterThan(0);
    expect(itemNames(container).filter((name) => hostItems[kind].includes(name))).toEqual([]);
  });
});

describe("ExternalSecretDetails", () => {
  it("shows the target and the store as links, the policies, the message and the data mappings", () => {
    const { container } = render(<ExternalSecretDetails object={fullExternalSecret} />);

    expect(itemNames(container)).toEqual([
      "Target Secret",
      "Secret Store Ref",
      "Creation Policy",
      "Deletion Policy",
      "Immutable",
      "Refresh Policy",
      "Message",
      "Synced Resource Version",
      "Data",
      "Data From",
    ]);
    expect(itemLinks(container, "Target Secret")).toEqual(["/api/v1/namespaces/default/secrets/application-config"]);
    expect(itemLinks(container, "Secret Store Ref")).toEqual([
      "/apis/external-secrets.io/v1/clustersecretstores/vault",
    ]);
    expect(itemText(container, "Secret Store Ref")).toBe("ClusterSecretStore/vault");
    expect(itemText(container, "Creation Policy")).toBe("Merge");
    expect(itemText(container, "Deletion Policy")).toBe("Delete");
    expect(itemText(container, "Message")).toBe("could not get secret data from provider");
    expect(itemText(container, "Synced Resource Version")).toBe("1-abc");
    expect(itemText(container, "Data")).toBe("username <- /db (property: user)");
    expect(itemText(container, "Data From")).toBe("extract /all");
  });

  it("shows the controller defaults, and the target as a link, for an ExternalSecret that names neither", () => {
    const object = new ExternalSecret({
      apiVersion: "external-secrets.io/v1",
      kind: "ExternalSecret",
      metadata: {
        name: "hello-world",
        namespace: "default",
        selfLink: "/apis/external-secrets.io/v1/namespaces/default/externalsecrets/hello-world",
      },
      spec: {},
    });

    const { container } = render(<ExternalSecretDetails object={object} />);

    expect(itemNames(container)).toEqual([
      "Target Secret",
      "Secret Store Ref",
      "Creation Policy",
      "Deletion Policy",
      "Refresh Policy",
    ]);
    expect(itemLinks(container, "Target Secret")).toEqual(["/api/v1/namespaces/default/secrets/hello-world"]);
    expect(itemLinks(container, "Secret Store Ref")).toEqual([]);
    expect(itemText(container, "Secret Store Ref")).toBe("-");
    expect(itemText(container, "Creation Policy")).toBe("Owner");
    expect(itemText(container, "Deletion Policy")).toBe("Retain");
    expect(itemText(container, "Refresh Policy")).toBe("Periodic");
  });

  it("links a SecretStore in the namespace of the ExternalSecret", () => {
    const object = new ExternalSecret({
      apiVersion: "external-secrets.io/v1",
      kind: "ExternalSecret",
      metadata: { name: "hello-world", namespace: "apps", selfLink: "" },
      spec: { secretStoreRef: { name: "fake-store" } },
    });

    const { container } = render(<ExternalSecretDetails object={object} />);

    expect(itemLinks(container, "Secret Store Ref")).toEqual([
      "/apis/external-secrets.io/v1/namespaces/apps/secretstores/fake-store",
    ]);
    expect(itemText(container, "Secret Store Ref")).toBe("SecretStore/fake-store");
  });
});

describe("StoreDetails", () => {
  it("shows the provider, the controller, the retry settings, the refresh interval and the message", () => {
    const { container } = render(<StoreDetails object={fullStore} />);

    expect(itemNames(container)).toEqual(["Provider", "Controller", "Retry Settings", "Refresh Interval", "Message"]);
    expect(itemText(container, "Provider")).toBe("fake");
    expect(itemText(container, "Controller")).toBe("dev");
    expect(itemText(container, "Retry Settings")).toBe("max retries: 3, interval: 10s");
    expect(itemText(container, "Refresh Interval")).toBe("60s");
    expect(itemText(container, "Message")).toBe("store validation failed");
  });

  it("serves a ClusterSecretStore too, and shows only the provider of a store that sets nothing else", () => {
    const object = new ClusterSecretStore({
      apiVersion: "external-secrets.io/v1",
      kind: "ClusterSecretStore",
      metadata: { name: "fake-cluster-store", selfLink: "" },
      spec: { provider: { gcpsm: { projectID: "myproject" } } },
    });

    const { container } = render(<StoreDetails object={object} />);

    expect(itemNames(container)).toEqual(["Provider"]);
    expect(itemText(container, "Provider")).toBe("gcpsm");
  });
});

describe("ClusterExternalSecretDetails", () => {
  it("shows the ExternalSecrets it creates, the store, the namespaces, the message and the data mappings", () => {
    const { container } = render(<ClusterExternalSecretDetails object={fullClusterExternalSecret} />);

    expect(itemNames(container)).toEqual([
      "External Secret Name",
      "Target Secret",
      "Secret Store Ref",
      "External Secret Refresh Interval",
      "Namespace Selectors",
      "Namespaces",
      "Provisioned Namespaces",
      "Failed Namespaces",
      "Message",
      "Data",
    ]);
    expect(itemText(container, "External Secret Name")).toBe("hello");
    expect(itemText(container, "Target Secret")).toBe("app");
    expect(itemLinks(container, "Secret Store Ref")).toEqual([
      "/apis/external-secrets.io/v1/clustersecretstores/vault",
    ]);
    expect(itemText(container, "External Secret Refresh Interval")).toBe("30s");
    expect(itemText(container, "Namespace Selectors")).toBe("team=payments");
    expect(itemText(container, "Namespaces")).toBe("legacy");
    expect(itemText(container, "Provisioned Namespaces")).toBe("default");
    expect(itemText(container, "Failed Namespaces")).toBe("locked");
    expect(itemText(container, "Message")).toBe("one namespace failed");
    expect(itemText(container, "Data")).toBe("token <- /token");
  });

  it("does not link a SecretStore, which lives in each target namespace", () => {
    const object = new ClusterExternalSecret({
      apiVersion: "external-secrets.io/v1",
      kind: "ClusterExternalSecret",
      metadata: { name: "hello-everywhere", selfLink: "" },
      spec: { externalSecretSpec: { secretStoreRef: { name: "fake-store", kind: "SecretStore" } } },
    });

    const { container } = render(<ClusterExternalSecretDetails object={object} />);

    expect(itemLinks(container, "Secret Store Ref")).toEqual([]);
    expect(itemText(container, "Secret Store Ref")).toBe("SecretStore/fake-store");
  });
});

describe("PushSecretDetails", () => {
  it("shows the source and the stores as links, the policies, the message and the data mappings", () => {
    const { container } = render(<PushSecretDetails object={fullPushSecret} />);

    expect(itemNames(container)).toEqual([
      "Source Secret",
      "Secret Store Refs",
      "Refresh Interval",
      "Update Policy",
      "Deletion Policy",
      "Message",
      "Synced Resource Version",
      "Data",
      "Data To",
    ]);
    expect(itemLinks(container, "Source Secret")).toEqual(["/api/v1/namespaces/default/secrets/hello-world"]);
    // A store chosen by label selector has no name to link to.
    expect(itemLinks(container, "Secret Store Refs")).toEqual([
      "/apis/external-secrets.io/v1/namespaces/default/secretstores/fake-store",
    ]);
    expect(itemText(container, "Refresh Interval")).toBe("1h0m0s");
    expect(itemText(container, "Update Policy")).toBe("Replace");
    expect(itemText(container, "Deletion Policy")).toBe("None");
    expect(itemText(container, "Message")).toBe("set secret failed");
    expect(itemText(container, "Data")).toBe("hello -> /pushed/hello");
    expect(itemText(container, "Data To")).toBe("SecretStore/fake-store, all keys, -> /bundle");
  });
});

describe("SecretEsoDetails", () => {
  const secret = (metadata: Renderer.K8sApi.KubeObjectMetadata) => ({ metadata }) as unknown as Renderer.K8sApi.Secret;

  const owner = {
    apiVersion: "external-secrets.io/v1",
    kind: "ExternalSecret",
    name: "hello-world",
    uid: "1",
    controller: true,
  };

  it("renders nothing for a Secret the operator does not manage", () => {
    const { container } = render(
      <SecretEsoDetails
        object={secret({ name: "other", namespace: "default", uid: "2", resourceVersion: "1", selfLink: "" })}
      />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("links a Secret the operator manages to the ExternalSecret that owns it", () => {
    const { container } = render(
      <SecretEsoDetails
        object={secret({
          name: "hello-world",
          namespace: "default",
          uid: "2",
          resourceVersion: "1",
          selfLink: "",
          labels: { "reconcile.external-secrets.io/managed": "true" },
          ownerReferences: [owner],
        })}
      />,
    );

    expect(container.querySelector("h3")?.textContent).toBe("External Secrets");
    expect(itemNames(container)).toEqual(["Managed By", "External Secret"]);
    expect(itemLinks(container, "External Secret")).toEqual([
      "/apis/external-secrets.io/v1/namespaces/default/externalsecrets/hello-world",
    ]);
  });

  it("shows a managed Secret without an owner, as one an ExternalSecret merges into, without a link", () => {
    const { container } = render(
      <SecretEsoDetails
        object={secret({
          name: "hello-world",
          namespace: "default",
          uid: "2",
          resourceVersion: "1",
          selfLink: "",
          labels: { "reconcile.external-secrets.io/managed": "true" },
        })}
      />,
    );

    expect(itemNames(container)).toEqual(["Managed By"]);
  });
});
