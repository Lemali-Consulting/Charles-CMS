import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login", verifyRequest: "/login?check=1" },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLogged = !!auth?.user;
      const { pathname } = request.nextUrl;
      if (pathname === "/login") {
        if (isLogged) return Response.redirect(new URL("/", request.url));
        return true;
      }
      if (pathname.startsWith("/api/auth")) return true;
      return isLogged;
    },
    async jwt({ token, user }) {
      if (user?.email) token.email = user.email;
      if (user && "id" in user && user.id) token.sub = user.id as string;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
};
