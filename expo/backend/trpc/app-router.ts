import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { postsRouter } from "./routes/posts/posts";
import { usersRouter } from "./routes/users/users";
import { commentsRouter } from "./routes/comments/comments";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  posts: postsRouter,
  users: usersRouter,
  comments: commentsRouter,
});

export type AppRouter = typeof appRouter;