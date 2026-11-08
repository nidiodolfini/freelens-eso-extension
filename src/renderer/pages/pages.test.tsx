// @vitest-environment jsdom

import { Renderer } from "@freelensapp/extensions";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClusterExternalSecret } from "../api/clusterexternalsecret/clusterexternalsecret-v1";
import { ClusterSecretStore } from "../api/clustersecretstore/clustersecretstore-v1";
import { ExternalSecret } from "../api/externalsecret/externalsecret-v1";
import { PushSecret } from "../api/pushsecret/pushsecret-v1alpha1";
import { SecretStore } from "../api/secretstore/secretstore-v1";
import { ClusterExternalSecretsPage } from "./cluster-external-secrets-page";
import { ClusterSecretStoresPage } from "./cluster-secret-stores-page";
import { ExternalSecretsPage } from "./external-secrets-page";
import { PushSecretsPage } from "./push-secrets-page";
import { SecretStoresPage } from "./secret-stores-page";

import type { EsoKubeObjectCRD } from "../api/types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.mocked(Renderer.Component.KubeObjectListLayout).mockClear();
});

interface PageCase {
  title: string;
  Page: () => React.ReactNode;
  model: { crd: EsoKubeObjectCRD; getStore: unknown };
  object: Renderer.K8sApi.KubeObject;
  /** The columns, in order: those of `kubectl get` for the kind, with the extension's own. */
  columns: string[];
}

const metadata = (name: string, namespace?: string) => ({ name, namespace, selfLink: "" });

const pages: PageCase[] = [
  {
    title: "External Secrets",
    Page: ExternalSecretsPage,
    model: ExternalSecret,
    object: new ExternalSecret({
      apiVersion: "external-secrets.io/v1",
      kind: "ExternalSecret",
      metadata: metadata("hello-world", "default"),
      spec: {},
      status: { refreshTime: "2024-01-01T00:00:00Z" },
    }),
    columns: ["Name", "Namespace", "Store Type", "Store", "Refresh Interval", "Status", "Ready", "Last Sync", "Age"],
  },
  {
    title: "Cluster External Secrets",
    Page: ClusterExternalSecretsPage,
    model: ClusterExternalSecret,
    object: new ClusterExternalSecret({
      apiVersion: "external-secrets.io/v1",
      kind: "ClusterExternalSecret",
      metadata: metadata("hello-everywhere"),
      spec: { externalSecretSpec: {} },
    }),
    columns: ["Name", "Store Type", "Store", "Refresh Interval", "Namespaces", "Ready", "Age"],
  },
  {
    title: "Push Secrets",
    Page: PushSecretsPage,
    model: PushSecret,
    object: new PushSecret({
      apiVersion: "external-secrets.io/v1alpha1",
      kind: "PushSecret",
      metadata: metadata("hello-world", "default"),
      spec: { secretStoreRefs: [], selector: {} },
      status: { refreshTime: "2024-01-01T00:00:00Z" },
    }),
    columns: ["Name", "Namespace", "Secret", "Stores", "Refresh Interval", "Status", "Ready", "Last Sync", "Age"],
  },
  {
    title: "Secret Stores",
    Page: SecretStoresPage,
    model: SecretStore,
    object: new SecretStore({
      apiVersion: "external-secrets.io/v1",
      kind: "SecretStore",
      metadata: metadata("fake-store", "default"),
      spec: {},
    }),
    columns: ["Name", "Namespace", "Provider", "Status", "Capabilities", "Ready", "Age"],
  },
  {
    title: "Cluster Secret Stores",
    Page: ClusterSecretStoresPage,
    model: ClusterSecretStore,
    object: new ClusterSecretStore({
      apiVersion: "external-secrets.io/v1",
      kind: "ClusterSecretStore",
      metadata: metadata("fake-cluster-store"),
      spec: {},
    }),
    columns: ["Name", "Provider", "Status", "Capabilities", "Ready", "Age"],
  },
];

/**
 * Renders the page over a store with the one object, and returns the props the page passed to the host's list
 * layout, as its stub received them.
 */
function renderPage({ Page, model, object }: PageCase) {
  vi.spyOn(model as typeof ExternalSecret, "getStore").mockReturnValue({ items: [object] } as never);
  render(<Page />);

  const props = vi.mocked(Renderer.Component.KubeObjectListLayout).mock.lastCall?.[0];

  if (!props) {
    throw new Error("The page rendered no list layout");
  }

  return props;
}

describe.each(pages)("the $title page", (page) => {
  it("shows its columns, those of kubectl get and the extension's own", () => {
    const props = renderPage(page);

    expect(props.renderTableHeader?.map((header) => header?.title)).toEqual(page.columns);
  });

  it("is a configurable list whose every column has an id, the key of its sorting callback", () => {
    const props = renderPage(page);
    const headers = (props.renderTableHeader ?? []).filter((header) => header != null);
    const ids = headers.map((header) => header.id);

    expect(props.isConfigurable).toBe(true);
    expect(props.tableId).toBe(`${page.model.crd.plural}Table`);
    expect(new Set(ids).size).toBe(headers.length);

    for (const header of headers) {
      expect(header.id).toBeTruthy();
      expect(header.sortBy).toBe(header.id);
      expect(Object.keys(props.sortingCallbacks ?? {})).toContain(header.id);
    }
  });

  it("renders a cell for every column", () => {
    const props = renderPage(page);

    expect(props.renderTableContents(page.object)).toHaveLength(props.renderTableHeader?.length ?? 0);
  });
});

describe.each(pages.filter(({ columns }) => columns.includes("Last Sync")))(
  "the Last Sync of the $title page",
  (page) => {
    it("shows the time since the last sync, as kubectl get does for a date column", () => {
      renderPage(page);

      expect(screen.getByText("since 2024-01-01T00:00:00Z")).toBeDefined();
    });
  },
);
