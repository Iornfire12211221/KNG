import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";

// Context creation function
export const createContext = async (opts: FetchCreateContextFnOptions) => {
  let prisma = null;
  
  try {
    // Динамически импортируем Prisma только если DATABASE_URL доступен
    if (process.env.DATABASE_URL) {
      const { prisma: prismaClient } = await import("../../lib/prisma");
      prisma = prismaClient;
    }
  } catch (error) {
    console.log('⚠️ Prisma not available, using fallback mode');
  }
  
  return {
    req: opts.req,
    prisma, // null если база недоступна
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;