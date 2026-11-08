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

  // An empty namespace is undefined, as the host's.
  getNs() {
    return this.metadata?.namespace || undefined;
  }

  // The host returns the API it registered for the first of the class's
  // `crd.apiVersions` that the cluster serves, and throws when there is none.
  // Without a host there is never one; a test that needs an API spies on
  // `getApi` of its class.
  static getApi(): never {
    throw new Error(`API for ${this.name} is not registered. Extension won't work correctly.`);
  }

  // The host returns the store of that API, and throws when there is none. A
  // test that needs a store spies on `getStore` of its class.
  static getStore(): never {
    throw new Error(`Store for ${this.name} is not registered. Extension won't work correctly.`);
  }
}

// The host's core Secret, with the static metadata the links are built from.
class Secret extends LensExtensionKubeObject {
  static readonly kind = "Secret";
  static readonly namespaced = true;
  static readonly apiBase = "/api/v1/secrets";
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
  return React.createElement(
    "span",
    { className, title: typeof tooltip === "string" ? tooltip : undefined },
    label,
    children,
  );
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

// The host's renders the time since the timestamp, such as `5m`; the stub names
// the timestamp, so that a test can tell which one a cell shows.
function ReactiveDuration({ timestamp }: { timestamp?: string }) {
  return React.createElement("span", null, timestamp ? `since ${timestamp}` : "<unknown>");
}

// As the host's, without the label and value classes: the name, then the
// value, and nothing for a hidden item. A test finds an item by `data-name`.
function DrawerItem({
  name,
  children,
  hidden,
}: {
  name?: React.ReactNode;
  children?: React.ReactNode;
  hidden?: boolean;
}) {
  if (hidden) return null;
  return React.createElement(
    "div",
    { "data-name": typeof name === "string" ? name : undefined },
    React.createElement("span", null, name),
    React.createElement("span", null, children),
  );
}

function DrawerTitle({ children }: { children?: React.ReactNode }) {
  return React.createElement("h3", null, children);
}

// As the host's: a link when `to` is set, the children alone otherwise.
function MaybeLink({ to, children }: { to?: string; children?: React.ReactNode }) {
  return to ? React.createElement("a", { href: to }, children) : React.createElement("span", null, children);
}

function MenuItem({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) {
  return React.createElement("div", { role: "menuitem", onClick }, children);
}

function Icon({ material, title }: { material?: string; title?: string }) {
  return React.createElement("i", { title }, material);
}

interface KubeObjectListLayoutProps {
  store: { items: unknown[] };
  renderTableContents: (item: unknown) => React.ReactNode[];
}

// Only the part of the host's list layout where it calls back into the
// extension: it calls `renderTableContents` for every item of the store from
// its own render, a child of the page, and renders the cells. It is a mock, so
// that a test can read the props a page passes.
const KubeObjectListLayout = vi.fn(({ store, renderTableContents }: KubeObjectListLayoutProps) =>
  React.createElement(
    "div",
    null,
    store.items.map((item, index) => React.createElement("div", { key: index }, ...renderTableContents(item))),
  ),
);

export const Renderer = {
  Component: {
    Badge,
    BadgeBoolean,
    DrawerItem,
    DrawerTitle,
    Icon,
    KubeObjectAge,
    KubeObjectListLayout,
    LinkToNamespace,
    MaybeLink,
    MenuItem,
    Notifications: {
      ok: vi.fn(),
      error: vi.fn(),
    },
    ReactiveDuration,
    WithTooltip,
  },
  K8sApi: {
    LensExtensionKubeObject,
    KubeApi: class KubeApi {},
    KubeObjectStore: class KubeObjectStore {},
    Secret,
  },
  Navigation: {
    // The host returns the URL that opens the details of the object; the stub
    // returns the selfLink, so that a test can tell which object a link opens.
    getMaybeDetailsUrl: (selfLink?: string) => selfLink ?? "",
  },
};

export const Common = {
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
};
