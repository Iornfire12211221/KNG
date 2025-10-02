import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { postsRouter } from "./routes/posts/posts";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  posts: postsRouter,
});

export type AppRouter = typeof appRouter;