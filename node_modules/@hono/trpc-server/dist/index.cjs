"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  trpcServer: () => trpcServer
});
module.exports = __toCommonJS(index_exports);
var import_fetch = require("@trpc/server/adapters/fetch");
var trpcServer = ({
  endpoint = "/trpc",
  createContext,
  ...rest
}) => {
  const bodyProps = /* @__PURE__ */ new Set(["arrayBuffer", "blob", "formData", "json", "text"]);
  return async (c) => {
    const canWithBody = c.req.method === "GET" || c.req.method === "HEAD";
    const res = (0, import_fetch.fetchRequestHandler)({
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  trpcServer
});
