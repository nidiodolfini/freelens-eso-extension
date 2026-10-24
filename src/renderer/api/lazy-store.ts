import { Renderer } from "@freelensapp/extensions";

/**
 * A getter for a store of the extension, which builds the store on the first call, registers it with the cluster's
 * apiManager, and returns the same store afterwards.
 *
 * A KubeApi can only be built in a cluster frame: the host asserts "request MUST be provided if not in a cluster page
 * frame context" when one is built elsewhere, and the root frame loads the renderer entry too. So nothing is built
 * when a module loads. The pages and the menu item call the getter while they render, which happens in a cluster
 * frame only.
 *
 * The constraint is the one of the host's `RegisterableStore`, the parameter type of `registerStore`, which is a
 * conditional type the compiler leaves unresolved for a type parameter; the store is handed over as the type that
 * condition names.
 */
export function lazyStore<Store extends Renderer.K8sApi.KubeObjectStore<any, any, any>>(
  create: () => Store,
): () => Store {
  let store: Store | undefined;

  return () => {
    if (!store) {
      store = create();
      const registered: Renderer.K8sApi.KubeObjectStore<any, any, any> = store;
      Renderer.K8sApi.apiManager.registerStore(registered);
    }
    return store;
  };
}
