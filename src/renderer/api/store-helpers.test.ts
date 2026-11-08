import { describe, expect, it } from "vitest";
import {
  formatDataFrom,
  formatLabelSelector,
  formatPushSecretData,
  formatPushSecretDataTo,
  formatPushSecretStoreRef,
  formatRemoteRef,
  getPushSecretStatusText,
  getReadyMessage,
} from "./store-helpers";

describe("formatLabelSelector", () => {
  it("joins the match labels and the expressions", () => {
    expect(
      formatLabelSelector({
        matchLabels: { team: "payments" },
        matchExpressions: [{ key: "env", operator: "In", values: ["prod", "staging"] }],
      }),
    ).toBe("team=payments, env In (prod, staging)");
  });

  it("is * for a selector that matches everything", () => {
    expect(formatLabelSelector({})).toBe("*");
    expect(formatLabelSelector(undefined)).toBe("*");
  });
});

describe("formatRemoteRef", () => {
  it("is the key alone without a property or a version", () => {
    expect(formatRemoteRef({ key: "/hello" })).toBe("/hello");
  });

  it("adds the property and the version", () => {
    expect(formatRemoteRef({ key: "/db", property: "password", version: "3" })).toBe(
      "/db (property: password, version: 3)",
    );
  });
});

describe("formatDataFrom", () => {
  it("describes an extract", () => {
    expect(formatDataFrom({ extract: { key: "/all" } })).toBe("extract /all");
  });

  it("describes a find with its criteria, the source and the rewrites", () => {
    expect(
      formatDataFrom({
        find: { path: "/apps", name: { regexp: "^db-" }, tags: { env: "prod" } },
        sourceRef: { storeRef: { name: "vault", kind: "ClusterSecretStore" } },
        rewrite: [{ regexp: { source: "^db-", target: "" } }, { transform: { template: "{{ .value | upper }}" } }],
      }),
    ).toBe("find path /apps, name ~ ^db-, tags env=prod, from ClusterSecretStore/vault, 2 rewrites");
  });

  it("describes a find without criteria as *, and a generator source", () => {
    expect(formatDataFrom({ find: {}, sourceRef: { generatorRef: { kind: "Password", name: "pw" } } })).toBe(
      "find *, from generator Password/pw",
    );
  });
});

describe("the PushSecret formatters", () => {
  it("format a store by name with the default kind, and one by selector", () => {
    expect(formatPushSecretStoreRef({ name: "fake-store" })).toBe("SecretStore/fake-store");
    expect(
      formatPushSecretStoreRef({ kind: "ClusterSecretStore", labelSelector: { matchLabels: { tier: "a" } } }),
    ).toBe("ClusterSecretStore selector tier=a");
  });

  it("format a data entry as source -> remote key", () => {
    expect(formatPushSecretData({ match: { secretKey: "hello", remoteRef: { remoteKey: "/pushed/hello" } } })).toBe(
      "hello -> /pushed/hello",
    );
    expect(formatPushSecretData({ match: { remoteRef: { remoteKey: "/all", property: "p" } } })).toBe(
      "* -> /all (property: p)",
    );
  });

  it("format a dataTo entry with its store, keys and remote key", () => {
    expect(
      formatPushSecretDataTo({
        storeRef: { name: "fake-store" },
        match: { regexp: "^DB_" },
        remoteKey: "/bundle",
        rewrite: [{ regexp: { source: "^DB_", target: "" } }],
      }),
    ).toBe("SecretStore/fake-store, keys ~ ^DB_, -> /bundle, 1 rewrite");
    expect(formatPushSecretDataTo({ storeRef: { name: "fake-store" } })).toBe(
      "SecretStore/fake-store, all keys, -> one remote key per source key",
    );
  });

  it("read the status text and the message of the Ready condition", () => {
    expect(getPushSecretStatusText([{ type: "Ready", status: "True" }])).toBe("Synced");
    expect(getPushSecretStatusText([{ type: "Ready", status: "False" }])).toBe("Errored");
    expect(getReadyMessage([{ type: "Ready", status: "False", message: "store not found" }])).toBe("store not found");
    expect(getReadyMessage([{ type: "Ready", status: "True", message: "" }])).toBeUndefined();
  });
});
