// src/index.ts
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
var trpcServer = ({
  endpoint = "/trpc",
  createContext,
  ...rest
}) => {
  const bodyProps = /* @__PURE__ */ new Set(["arrayBuffer", "blob", "formData", "json", "text"]);
  return async (c) => {
    const canWithBody = c.req.method === "GET" || c.req.method === "HEAD";
    const res = fetchRequestHandler({
      ...rest,
      createContext: async (opts) => ({
        ...createContext ? await createContext(opts, c) : {},
        // propagate env by default
        env: c.env
      }),
      endpoint,
      req: canWithBody ? c.req.raw : new Proxy(c.req.raw, {
        get(t, p, _r) {
          if (bodyProps.has(p)) {
            return () => c.req[p]();
          }
          return Reflect.get(t, p, t);
        }
      })
    }).then(
      (res2) => (
        // @ts-expect-error c.body accepts both ReadableStream and null but is not typed well
        c.body(res2.body, res2)
      )
    );
    return res;
  };
};
export {
  trpcServer
};
