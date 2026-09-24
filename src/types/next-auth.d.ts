import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    username: string;
    isAdmin: boolean;
  }

  interface Session {
    user: {
      id: string;
      username: string;
      isAdmin: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    repId: string;
    username: string;
    isAdmin: boolean;
  }
}
