// @vitest-environment jsdom

import { Renderer } from "@freelensapp/extensions";
import { act, cleanup, render, screen } from "@testing-library/react";
import { observable, runInAction } from "mobx";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type AvailableVersionPageProps, createAvailableVersionPage } from "./available-version";

// A minimal stub extension - only `name` is read by the pages below.
const extension = { name: "example-extension" } as Renderer.LensExtension;

// The stub's `getStore()` throws, as the host's does for a model none of whose
// versions is served. A test marks a model as served by spying on `getStore` of
// its class. ExampleV1 serves two versions, as a model whose older version has
// the same schema does.
class ExampleV1 extends Renderer.K8sApi.LensExtensionKubeObject {
  static readonly crd = {
    apiVersions: ["example.com/v1", "example.com/v1beta1"],
    plural: "examples",
    singular: "example",
  };
}

class ExampleV1alpha1 extends Renderer.K8sApi.LensExtensionKubeObject {
  static readonly crd = { apiVersions: ["example.com/v1alpha1"], plural: "examples", singular: "example" };
}

// The store of the API the host registered, in the version the cluster serves.
function storeIn(apiVersion: string) {
  return { api: { apiVersionWithGroup: apiVersion } } as Renderer.K8sApi.KubeObjectStore<any, any, any>;
}

function serve(kubeObjectClass: typeof Renderer.K8sApi.LensExtensionKubeObject<any, any, any>, apiVersion: string) {
  vi.spyOn(kubeObjectClass, "getStore").mockReturnValue(storeIn(apiVersion));
}

const ExamplesPage = createAvailableVersionPage<AvailableVersionPageProps>("Examples", [
  {
    kubeObjectClass: ExampleV1,
    PageComponent: ({ extension }) => <span>v1 page of {extension.name}</span>,
  },
  {
    kubeObjectClass: ExampleV1alpha1,
    PageComponent: ({ extension }) => <span>v1alpha1 page of {extension.name}</span>,
  },
]);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("createAvailableVersionPage", () => {
  it("renders the first model that has a store, with the extension", () => {
    serve(ExampleV1, "example.com/v1beta1");
    serve(ExampleV1alpha1, "example.com/v1alpha1");

    render(<ExamplesPage extension={extension} />);

    expect(screen.getByText("v1 page of example-extension")).toBeDefined();
    expect(screen.queryByText(/v1alpha1 page/)).toBeNull();
  });

  it("falls back to a later model when an earlier one has no store", () => {
    serve(ExampleV1alpha1, "example.com/v1alpha1");

    render(<ExamplesPage extension={extension} />);

    expect(screen.getByText("v1alpha1 page of example-extension")).toBeDefined();
  });

  it("renders the not available page with every version of its models when none has a store", () => {
    render(<ExamplesPage extension={extension} />);

    expect(screen.getByText("Examples Not Available")).toBeDefined();
    expect(screen.getByText("example.com/v1, example.com/v1beta1, example.com/v1alpha1")).toBeDefined();
  });

  it("renders the model's page once the host serves it after the first render", () => {
    // The host's `getStore()` reads its observable API registry. The spy reads an
    // observable in its place, so that serving the version is a change the page sees.
    const served = observable.box(false);
    vi.spyOn(ExampleV1, "getStore").mockImplementation(() => {
      if (!served.get()) {
        throw new Error("no API for ExampleV1");
      }
      return storeIn("example.com/v1");
    });

    render(<ExamplesPage extension={extension} />);

    expect(screen.getByText("Examples Not Available")).toBeDefined();

    act(() => runInAction(() => served.set(true)));

    expect(screen.getByText("v1 page of example-extension")).toBeDefined();
    expect(screen.queryByText("Examples Not Available")).toBeNull();
  });
});
