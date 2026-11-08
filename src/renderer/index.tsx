/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { Renderer } from "@freelensapp/extensions";
import { ClusterExternalSecret } from "./api/clusterexternalsecret/clusterexternalsecret-v1";
import { ClusterSecretStore } from "./api/clustersecretstore/clustersecretstore-v1";
import { ExternalSecret } from "./api/externalsecret/externalsecret-v1";
import { PushSecret } from "./api/pushsecret/pushsecret-v1alpha1";
import { SecretStore } from "./api/secretstore/secretstore-v1";
import { createAvailableVersionPage } from "./components/available-version";
import {
  withDetailsErrorBoundary,
  withMenuItemErrorBoundary,
  withPageErrorBoundary,
} from "./components/error-boundary";
import { ClusterExternalSecretDetails } from "./details/cluster-external-secret-details";
import { ExternalSecretDetails } from "./details/external-secret-details";
import { PushSecretDetails } from "./details/push-secret-details";
import { SecretEsoDetails } from "./details/secret-eso-details";
import { StoreDetails } from "./details/store-details";
import { ExternalSecretsIcon } from "./icons/external-secrets";
import { ForceSyncMenuItem } from "./menus/force-sync-menu-item";
import { ClusterExternalSecretsPage } from "./pages/cluster-external-secrets-page";
import { ClusterSecretStoresPage } from "./pages/cluster-secret-stores-page";
import { ExternalSecretsPage } from "./pages/external-secrets-page";
import { PushSecretsPage } from "./pages/push-secrets-page";
import { SecretStoresPage } from "./pages/secret-stores-page";

// Each kind has one model. Four of them serve external-secrets.io/v1, and v1beta1 on an ESO older than 0.16, which
// serves it in place of v1 with the same schema; PushSecret is at v1alpha1. The pages still go through
// createAvailableVersionPage so that each of them shows the "Not Available" page when the CRD is not installed in the
// cluster, and follows the host's API registry as it loads.
const ExternalSecretsPageAvailable = createAvailableVersionPage("External Secrets", [
  { kubeObjectClass: ExternalSecret, PageComponent: ExternalSecretsPage },
]);

const ClusterExternalSecretsPageAvailable = createAvailableVersionPage("Cluster External Secrets", [
  { kubeObjectClass: ClusterExternalSecret, PageComponent: ClusterExternalSecretsPage },
]);

const PushSecretsPageAvailable = createAvailableVersionPage("Push Secrets", [
  { kubeObjectClass: PushSecret, PageComponent: PushSecretsPage },
]);

const SecretStoresPageAvailable = createAvailableVersionPage("Secret Stores", [
  { kubeObjectClass: SecretStore, PageComponent: SecretStoresPage },
]);

const ClusterSecretStoresPageAvailable = createAvailableVersionPage("Cluster Secret Stores", [
  { kubeObjectClass: ClusterSecretStore, PageComponent: ClusterSecretStoresPage },
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
      id: "cluster-external-secrets",
      components: {
        Page: () => <ClusterExternalSecretsPageAvailable extension={this} />,
      },
    },
    {
      id: "push-secrets",
      components: {
        Page: () => <PushSecretsPageAvailable extension={this} />,
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

  clusterPageMenus: Renderer.LensExtension["clusterPageMenus"] = [
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
      id: "cluster-external-secrets",
      parentId: "eso",
      title: ClusterExternalSecret.crd.title,
      target: { pageId: "cluster-external-secrets" },
      components: {},
    },
    {
      id: "push-secrets",
      parentId: "eso",
      title: PushSecret.crd.title,
      target: { pageId: "push-secrets" },
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

  // Every kind has a page of its own, so the host leaves all of them out of the Custom Resources tree of the cluster
  // sidebar, where they would otherwise be listed a second time under external-secrets.io.
  customResources = [ExternalSecret, ClusterExternalSecret, PushSecret, SecretStore, ClusterSecretStore];

  // The helpers take `kind` and `apiVersions` from the model class and type the props of the panel and the item from
  // it, so a panel or an item written for another kind fails the type check. StoreDetails takes the union of the two
  // store models and serves both registrations, as ForceSyncMenuItem does for the two kinds that take the annotation.
  // The panel on the host's Secret is the way back from a managed Secret to its ExternalSecret.
  kubeObjectDetailItems: Renderer.LensExtension["kubeObjectDetailItems"] = [
    Renderer.K8sApi.detailsFor(ExternalSecret, { priority: 10, Details: ExternalSecretDetails }),
    Renderer.K8sApi.detailsFor(ClusterExternalSecret, { priority: 10, Details: ClusterExternalSecretDetails }),
    Renderer.K8sApi.detailsFor(PushSecret, { priority: 10, Details: PushSecretDetails }),
    Renderer.K8sApi.detailsFor(SecretStore, { priority: 10, Details: StoreDetails }),
    Renderer.K8sApi.detailsFor(ClusterSecretStore, { priority: 10, Details: StoreDetails }),
    Renderer.K8sApi.detailsFor(Renderer.K8sApi.Secret, { priority: 10, Details: SecretEsoDetails }),
  ].map((registration) => withDetailsErrorBoundary(this, registration));

  kubeObjectMenuItems: Renderer.LensExtension["kubeObjectMenuItems"] = [
    Renderer.K8sApi.menuItemFor(ExternalSecret, { MenuItem: ForceSyncMenuItem }),
    Renderer.K8sApi.menuItemFor(ClusterExternalSecret, { MenuItem: ForceSyncMenuItem }),
  ].map((registration) => withMenuItemErrorBoundary(this, registration));
}
