import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const username = credentials?.username;
        const password = credentials?.password;
        if (typeof username !== "string" || typeof password !== "string") {
          return null;
        }

        const rep = await prisma.rep.findUnique({ where: { username } });
        if (!rep || !rep.active) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(password, rep.passwordHash);
        if (!passwordMatches) {
          return null;
        }

        return {
          id: rep.id,
          name: rep.name,
          username: rep.username,
          isAdmin: rep.isAdmin,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.repId = user.id;
        token.username = (user as { username: string }).username;
        token.isAdmin = (user as { isAdmin: boolean }).isAdmin;
      }
      return token;
    },
    session: async ({ session, token }) => {
      session.user.id = token.repId as string;
      session.user.username = token.username as string;
      session.user.isAdmin = token.isAdmin as boolean;
      return session;
    },
  },
});
