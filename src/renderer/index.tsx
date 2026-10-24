/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
import { ClusterSecretStore } from "./api/clustersecretstore/clustersecretstore-v1";
import { ExternalSecret } from "./api/externalsecret/externalsecret-v1";
import { SecretStore } from "./api/secretstore/secretstore-v1";
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
import { ExternalSecretForceSyncMenuItem } from "./menus/external-secret-force-sync-menu-item";
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
      id: "external-secrets",
      title: "External Secrets",
      target: { pageId: "external-secrets" },
      components: {
        Icon: ExternalSecretsIcon,
      },
    },
    {
      id: "secret-stores",
      title: "Secret Stores",
      target: { pageId: "secret-stores" },
      components: {
        Icon: ExternalSecretsIcon,
      },
    },
    {
      id: "cluster-secret-stores",
      title: "Cluster Secret Stores",
      target: { pageId: "cluster-secret-stores" },
      components: {
        Icon: ExternalSecretsIcon,
      },
    },
  ];

  kubeObjectDetailItems: Renderer.LensExtension["kubeObjectDetailItems"] = [
    Renderer.K8sApi.detailsFor(ExternalSecret, {
      priority: 10,
      Details: ExternalSecretDetails,
    }),
    Renderer.K8sApi.detailsFor(SecretStore, {
      priority: 10,
      Details: SecretStoreDetails,
    }),
    Renderer.K8sApi.detailsFor(ClusterSecretStore, {
      priority: 10,
      Details: ClusterSecretStoreDetails,
    }),
  ].map((registration) => withDetailsErrorBoundary(this, registration));

  customResources = [ExternalSecret, SecretStore, ClusterSecretStore];

  kubeObjectMenuItems: Renderer.LensExtension["kubeObjectMenuItems"] = [
    Renderer.K8sApi.menuItemFor(ExternalSecret, {
      MenuItem: ExternalSecretForceSyncMenuItem,
    }),
  ].map((registration) => withMenuItemErrorBoundary(this, registration));
}
