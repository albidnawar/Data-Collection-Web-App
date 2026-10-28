import { DefaultSession } from "next-auth";
import type { RepRole } from "@/generated/prisma/client";

declare module "next-auth" {
  interface User {
    username: string;
    isAdmin: boolean;
    role: RepRole;
  }

  interface Session {
    user: {
      id: string;
      username: string;
      isAdmin: boolean;
      role: RepRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    repId: string;
    username: string;
    isAdmin: boolean;
    role: RepRole;
  }
}
