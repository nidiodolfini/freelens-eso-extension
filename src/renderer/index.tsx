/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
import { ClusterSecretStore, clusterSecretStoreStore } from "./api/clustersecretstore/clustersecretstore-v1";
import { ExternalSecret, externalSecretStore } from "./api/externalsecret/externalsecret-v1";
import { SecretStore, secretStoreStore } from "./api/secretstore/secretstore-v1";
import { createAvailableVersionPage } from "./components/available-version";
import {
  withDetailsErrorBoundary,
  withMenuItemErrorBoundary,
  withPageErrorBoundary,
} from "./components/error-boundary";
import { ClusterSecretStoreDetails } from "./details/cluster-secret-store-details";
import { ExternalSecretDetails } from "./details/external-secret-details";
import { SecretStoreDetails } from "./details/secret-store-details";
import { ExternalSecretsIcon } from "./icons";
import {
  ExternalSecretForceSyncMenuItem,
  type ExternalSecretForceSyncMenuItemProps,
} from "./menus/external-secret-force-sync-menu-item";
import { ClusterSecretStoresPage } from "./pages/cluster-secret-stores-page";
import { ExternalSecretsPage } from "./pages/external-secrets-page";
import { SecretStoresPage } from "./pages/secret-stores-page";

// Each kind serves a single API version, external-secrets.io/v1. The pages still go through
// createAvailableVersionPage so that each of them shows the "Not Available" page when the CRD is
// not installed in the cluster, and follows the host's API registry as it loads.
const ExternalSecretsPageAvailable = createAvailableVersionPage("External Secrets", [
  { kubeObjectClass: ExternalSecret, PageComponent: ExternalSecretsPage, version: "v1" },
]);

const SecretStoresPageAvailable = createAvailableVersionPage("Secret Stores", [
  { kubeObjectClass: SecretStore, PageComponent: SecretStoresPage, version: "v1" },
]);

const ClusterSecretStoresPageAvailable = createAvailableVersionPage("Cluster Secret Stores", [
  { kubeObjectClass: ClusterSecretStore, PageComponent: ClusterSecretStoresPage, version: "v1" },
]);

// Every page, details panel and menu item renders inside an error boundary, so that an error it throws stays in its
// place: the host has none around the details drawer or a menu item, and its boundary around the cluster frame would
// replace the whole cluster view. Each registration field is mapped through its wrapper, so an entry added to it is
// wrapped too.
export default class EsoRenderer extends Renderer.LensExtension {
  onActivate() {
    // The v1 API registers the extension's stores with the cluster's
    // apiManager; `apiManager.getStore(apiBase)` resolves them when the
    // cluster serves the CRD, which is also what shows the pages' "Not
    // Available" state before that.
    Renderer.K8sApi.apiManager.registerStore(externalSecretStore);
    Renderer.K8sApi.apiManager.registerStore(secretStoreStore);
    Renderer.K8sApi.apiManager.registerStore(clusterSecretStoreStore);
  }

  clusterPages: Renderer.LensExtension["clusterPages"] = [
    {
      id: "external-secrets",
      components: {
        Page: () => <ExternalSecretsPageAvailable extension={this} />,
      },
    },
    {
      id: "secret-stores",
      components: {
        Page: () => <SecretStoresPageAvailable extension={this} />,
      },
    },
    {
      id: "cluster-secret-stores",
      components: {
        Page: () => <ClusterSecretStoresPageAvailable extension={this} />,
      },
    },
  ].map((registration) => withPageErrorBoundary(this, registration));

  clusterPageMenus = [
    {
      id: "eso",
      title: "External Secrets",
      target: { pageId: "external-secrets" },
      components: {
        Icon: ExternalSecretsIcon,
      },
    },
    {
      id: "external-secrets",
      parentId: "eso",
      title: ExternalSecret.crd.title,
      target: { pageId: "external-secrets" },
      components: {},
    },
    {
      id: "secret-stores",
      parentId: "eso",
      title: SecretStore.crd.title,
      target: { pageId: "secret-stores" },
      components: {},
    },
    {
      id: "cluster-secret-stores",
      parentId: "eso",
      title: ClusterSecretStore.crd.title,
      target: { pageId: "cluster-secret-stores" },
      components: {},
    },
  ];

  kubeObjectDetailItems: Renderer.LensExtension["kubeObjectDetailItems"] = [
    {
      kind: ExternalSecret.kind,
      apiVersions: ExternalSecret.crd.apiVersions,
      priority: 10,
      components: {
        Details: (props: Renderer.Component.KubeObjectDetailsProps<ExternalSecret>) => (
          <ExternalSecretDetails {...props} />
        ),
      },
    },
    {
      kind: SecretStore.kind,
      apiVersions: SecretStore.crd.apiVersions,
      priority: 10,
      components: {
        Details: (props: Renderer.Component.KubeObjectDetailsProps<SecretStore>) => <SecretStoreDetails {...props} />,
      },
    },
    {
      kind: ClusterSecretStore.kind,
      apiVersions: ClusterSecretStore.crd.apiVersions,
      priority: 10,
      components: {
        Details: (props: Renderer.Component.KubeObjectDetailsProps<ClusterSecretStore>) => (
          <ClusterSecretStoreDetails {...props} />
        ),
      },
    },
  ].map((registration) => withDetailsErrorBoundary(this, registration));

  kubeObjectMenuItems: Renderer.LensExtension["kubeObjectMenuItems"] = [
    {
      kind: ExternalSecret.kind,
      apiVersions: ExternalSecret.crd.apiVersions,
      components: {
        MenuItem: (props: ExternalSecretForceSyncMenuItemProps) => <ExternalSecretForceSyncMenuItem {...props} />,
      },
    },
  ].map((registration) => withMenuItemErrorBoundary(this, registration));
}
