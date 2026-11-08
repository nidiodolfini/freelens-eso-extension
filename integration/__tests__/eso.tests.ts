/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// One session with the CRDs of the five kinds of one ESO release,
// TEST_ESO_VERSION or the one the types follow, and a test object of each kind,
// in the version the release serves, without the controller. The workflow runs
// it with a release that serves external-secrets.io/v1 and with one that serves
// only external-secrets.io/v1beta1. The session disconnects the kind cluster,
// sets up the CRDs, connects the cluster again, so that the app reads the CRDs
// anew, and leaves the cluster disconnected; it does not depend on another test
// file having run.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  appReady,
  clickMenuItem,
  connectApp,
  detailsItemValue,
  detailsObjectLink,
  disconnectKindCluster,
  esoApiVersion,
  esoVersion,
  expectDetailsApiVersion,
  installExtension,
  menuItemTitles,
  openDetails,
  openKindCluster,
  openListPage,
  openRowMenu,
  setUpCluster,
  tearDownCluster,
  testNamespace,
  testObjectName,
  waitForAnnotation,
  waitForDetailsItem,
  waitForMenuItem,
} from "./extension-helpers";

import type { Frame } from "playwright";

import type { AppSession } from "./extension-helpers";

interface KindView {
  kind: string;
  /** The `id` of the kind's `clusterPages` registration. */
  pageId: string;
  /** The API version the page picks, the one the release serves of the kind. */
  apiVersion: string;
  /** An item that the extension's details panel shows for the test object. */
  detailsItem: string;
  /** The extension's items in the row menu; none for a kind whose controller reads no force-sync annotation. */
  menuItems: string[];
  /** The kubectl resource of the kind, to read the test object back. */
  resource: string;
  namespaced: boolean;
}

const kindViews: KindView[] = [
  {
    kind: "ExternalSecret",
    pageId: "external-secrets",
    apiVersion: esoApiVersion,
    detailsItem: "Target Secret",
    menuItems: ["Force Sync"],
    resource: "externalsecret",
    namespaced: true,
  },
  {
    kind: "ClusterExternalSecret",
    pageId: "cluster-external-secrets",
    apiVersion: esoApiVersion,
    detailsItem: "External Secret Name",
    menuItems: ["Force Sync"],
    resource: "clusterexternalsecret",
    namespaced: false,
  },
  {
    kind: "PushSecret",
    pageId: "push-secrets",
    apiVersion: "external-secrets.io/v1alpha1",
    detailsItem: "Source Secret",
    menuItems: [],
    resource: "pushsecret",
    namespaced: true,
  },
  {
    kind: "SecretStore",
    pageId: "secret-stores",
    apiVersion: esoApiVersion,
    detailsItem: "Provider",
    menuItems: [],
    resource: "secretstore",
    namespaced: true,
  },
  {
    kind: "ClusterSecretStore",
    pageId: "cluster-secret-stores",
    apiVersion: esoApiVersion,
    detailsItem: "Provider",
    menuItems: [],
    resource: "clustersecretstore",
    namespaced: false,
  },
];

// The titles of every menu item of the extension, to tell them from the host's.
const extensionMenuItems = ["Force Sync"];

describe.skipIf(!(await appReady({ cluster: true })))(`External Secrets views with ESO ${esoVersion}`, () => {
  let session: AppSession | undefined;
  let frame: Frame;

  beforeAll(
    async () => {
      session = await connectApp();
      await disconnectKindCluster(session);
      setUpCluster();
      await installExtension(session);
      frame = await openKindCluster(session);
    },
    10 * 60 * 1000,
  );

  afterAll(
    async () => {
      let errors: string[] = [];

      try {
        // The errors first: the app refreshes the cluster while it disconnects,
        // and logs errors of its own when the refresh loses the race.
        errors = (await session?.stopCollecting()) ?? [];

        // The cluster then: the app watches the CRDs, and would log errors for
        // CRDs deleted under it.
        if (session) {
          await disconnectKindCluster(session);
        }

        await session?.close();
      } finally {
        tearDownCluster();
      }

      expect(errors).toEqual([]);
    },
    10 * 60 * 1000,
  );

  it.each(kindViews)("lists the $kind test object", async ({ pageId }) => {
    await openListPage(frame, pageId);
  });

  it.each(kindViews)(
    "shows the details of the $kind test object, in $apiVersion",
    async ({ pageId, apiVersion, detailsItem }) => {
      const row = await openListPage(frame, pageId);

      await openDetails(frame, row, detailsItem);
      await expectDetailsApiVersion(frame, apiVersion);
    },
  );

  it.each(kindViews)("shows the extension's menu items for the $kind test object", async ({ pageId, menuItems }) => {
    const row = await openListPage(frame, pageId);
    const menu = await openRowMenu(frame, row);

    for (const title of menuItems) {
      await waitForMenuItem(menu, title);
    }

    const titles = await menuItemTitles(menu);

    expect(titles.filter((title) => extensionMenuItems.includes(title))).toEqual(menuItems);
  });

  it.each(kindViews.filter(({ menuItems }) => menuItems.includes("Force Sync")))(
    "force-syncs the $kind test object",
    async ({ pageId, resource, namespaced }) => {
      const row = await openListPage(frame, pageId);
      const menu = await openRowMenu(frame, row);

      await clickMenuItem(frame, menu, "Force Sync");

      // A Unix timestamp of this run, written by the patch of the item.
      const value = await waitForAnnotation(resource, namespaced, "external-secrets.io/force-sync");

      expect(Number(value)).toBeGreaterThan(Date.now() / 1000 - 10 * 60);
    },
  );

  it("links the ExternalSecret to its store", async () => {
    const row = await openListPage(frame, "external-secrets");

    await openDetails(frame, row, "Secret Store Ref");
    await detailsItemValue(frame, "Secret Store Ref").locator("a").click();
    await waitForDetailsItem(frame, "Provider");

    expect(await detailsObjectLink(frame)).toBe(
      `/apis/${esoApiVersion}/namespaces/${testNamespace}/secretstores/${testObjectName}`,
    );
  });

  it("links the ExternalSecret and its Secret to each other", async () => {
    const row = await openListPage(frame, "external-secrets");

    await openDetails(frame, row, "Target Secret");
    await detailsItemValue(frame, "Target Secret").locator("a").click();
    await waitForDetailsItem(frame, "Managed By");

    expect(await detailsObjectLink(frame)).toBe(`/api/v1/namespaces/${testNamespace}/secrets/${testObjectName}`);

    await detailsItemValue(frame, "External Secret").locator("a").click();
    await waitForDetailsItem(frame, "Target Secret");

    expect(await detailsObjectLink(frame)).toBe(
      `/apis/${esoApiVersion}/namespaces/${testNamespace}/externalsecrets/${testObjectName}`,
    );
  });
});
