// Minimal stub of `@freelensapp/extensions` for unit tests.
//
// The published package is a shim that reads `Common`, `Main` and `Renderer`
// off `globalThis.FreelensExtensionApi`, which the Freelens host sets before it
// loads an extension. A Vitest process has no host, so importing the real
// package throws. `vitest.config.ts` aliases the import to this file instead.
// The package ships no mocks of its own to use in its place.
//
// Only the surface the tests exercise is stubbed here, and only at runtime: the
// tests are type-checked against the real declaration of the package. Extend it
// as your tests need more of the host API.
import React from "react";
import { vi } from "vitest";

class LensExtensionKubeObject {
  apiVersion?: string;
  kind?: string;
  metadata?: { name?: string; namespace?: string; creationTimestamp?: string };
  spec?: unknown;
  status?: unknown;

  constructor(data: Record<string, unknown> = {}) {
    Object.assign(this, data);
  }

  // As the host's, from the metadata.
  getName() {
    return this.metadata?.name ?? "";
  }

  getNs() {
    return this.metadata?.namespace;
  }

  getCreationTimestamp() {
    return this.metadata?.creationTimestamp ? new Date(this.metadata.creationTimestamp).getTime() : 0;
  }

  // The host returns the store it registered for one of the class's
  // `crd.apiVersions`, and throws when there is none. Without a host there is
  // never one; a test that needs a store spies on `getStore` of its class.
  static getStore(): never {
    throw new Error(`Store for ${this.name} is not registered. Extension won't work correctly.`);
  }
}

// The host's store loads the saved model with `fromStore()` and saves it
// whenever `toJSON()` changes, through a `reaction`. The stub keeps nothing; a
// test that needs that behaviour sets up the reaction itself.
class ExtensionStore<M extends object> {
  constructor(_params: { configName: string; defaults: M }) {}
}

// Host components, reduced to what the tests render. The pages reach them all
// when their renderTableContents runs.
function Badge({
  label,
  className,
  children,
  tooltip,
}: {
  label?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  tooltip?: React.ReactNode;
}) {
  return React.createElement("span", { className, title: tooltip }, label, children);
}

function BadgeBoolean({ value }: { value?: boolean }) {
  return React.createElement("span", null, value === undefined ? "-" : String(value));
}

function KubeObjectAge({ object }: { object: { metadata: { creationTimestamp?: string } } }) {
  return React.createElement("span", null, object.metadata.creationTimestamp ?? "-");
}

function LinkToNamespace({ namespace }: { namespace?: string }) {
  return React.createElement("span", null, namespace ?? "");
}

function WithTooltip({ children }: { children?: React.ReactNode; tooltip?: React.ReactNode }) {
  return React.createElement("span", null, children);
}

function Icon({ material, title, interactive }: { material?: string; title?: string; interactive?: boolean }) {
  return React.createElement("span", { title, "data-interactive": interactive }, material ?? "");
}

function MenuItem({ children, onClick }: { children?: React.ReactNode; onClick?: (event: unknown) => void }) {
  return React.createElement("div", { onClick }, children);
}

function DrawerItem({
  name,
  children,
  hidden,
  labelsOnly,
}: {
  name?: React.ReactNode;
  children?: React.ReactNode;
  hidden?: boolean;
  labelsOnly?: boolean;
}) {
  if (hidden) return null;
  return React.createElement("div", { "data-labels-only": labelsOnly }, name, children);
}

interface KubeObjectListLayoutProps {
  store: { items: unknown[] };
  renderTableContents: (item: unknown) => React.ReactNode[];
}

// Only the part of the host's list layout where it calls back into the
// extension: it calls `renderTableContents` for every item of the store from
// its own render, a child of the page, and renders the cells.
function KubeObjectListLayout({ store, renderTableContents }: KubeObjectListLayoutProps) {
  return React.createElement(
    "div",
    null,
    store.items.map((item, index) => React.createElement("div", { key: index }, ...renderTableContents(item))),
  );
}

export const Renderer = {
  Component: {
    Badge,
    BadgeBoolean,
    DrawerItem,
    Icon,
    KubeObjectAge,
    KubeObjectListLayout,
    LinkToNamespace,
    MenuItem,
    WithTooltip,
  },
  K8sApi: {
    LensExtensionKubeObject,
    KubeApi: class KubeApi {},
    KubeObjectStore: class KubeObjectStore {},
  },
};

export const Common = {
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  Store: {
    ExtensionStore,
  },
};
