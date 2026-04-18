import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import { randomUUID } from "crypto";
import { Resend as ResendClient } from "resend";
import { authConfig } from "./auth.config";
import { isEmailAllowed, parseAllowlist } from "./allowlist";
import {
  createUser as dbCreateUser,
  getUserById,
  getUserByEmail,
  touchUserLogin,
  createVerificationToken as dbCreateVerificationToken,
  useVerificationToken as dbUseVerificationToken,
} from "./db";

function toAdapterUser(u: {
  id: string;
  email: string;
  name: string | null;
}): AdapterUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name ?? undefined,
    emailVerified: null,
  };
}

const adapter: Adapter = {
  async createUser(user) {
    const id = randomUUID();
    const created = dbCreateUser({
      id,
      email: user.email!,
      name: user.name ?? null,
    });
    return toAdapterUser(created);
  },
  async getUser(id) {
    const u = getUserById(id);
    return u ? toAdapterUser(u) : null;
  },
  async getUserByEmail(email) {
    const u = getUserByEmail(email);
    return u ? toAdapterUser(u) : null;
  },
  async getUserByAccount() {
    return null;
  },
  async updateUser(user) {
    const existing = getUserById(user.id!);
    return existing ? toAdapterUser(existing) : (user as AdapterUser);
  },
  async linkAccount() {
    return;
  },
  async createVerificationToken(token) {
    dbCreateVerificationToken({
      identifier: token.identifier,
      token: token.token,
      expires: token.expires.getTime(),
    });
    return token;
  },
  async useVerificationToken({ identifier, token }) {
    const row = dbUseVerificationToken(identifier, token);
    if (!row) return null;
    return {
      identifier: row.identifier,
      token: row.token,
      expires: new Date(row.expires),
    };
  },
};

async function sendMagicLinkEmail(params: {
  to: string;
  url: string;
  from: string;
  apiKey: string;
}) {
  const client = new ResendClient(params.apiKey);
  const { to, url, from } = params;
  await client.emails.send({
    from,
    to,
    subject: "Your Charles CMS login link",
    text:
      `Sign in to Charles CMS\n\n` +
      `Click this link to sign in: ${url}\n\n` +
      `This link expires in 15 minutes and can only be used once.\n\n` +
      `If you didn't request this, you can safely ignore this email.\n`,
    html:
      `<p>Sign in to <strong>Charles CMS</strong>.</p>` +
      `<p><a href="${url}">Click here to sign in</a>.</p>` +
      `<p>This link expires in 15 minutes and can only be used once.</p>` +
      `<p>If you didn't request this, you can safely ignore this email.</p>`,
  });
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter,
  secret: process.env.AUTH_SECRET,
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.AUTH_EMAIL_FROM,
      maxAge: 15 * 60,
      sendVerificationRequest: async ({ identifier, url }) => {
        const allowlist = parseAllowlist(process.env.AUTH_ALLOWED_EMAILS);
        if (!isEmailAllowed(identifier, allowlist)) {
          // Same "check your email" UI regardless — silently skip the send.
          return;
        }
        const apiKey = process.env.AUTH_RESEND_KEY;
        const from = process.env.AUTH_EMAIL_FROM;
        if (!apiKey || !from) {
          throw new Error("AUTH_RESEND_KEY and AUTH_EMAIL_FROM must be set");
        }
        await sendMagicLinkEmail({ to: identifier, url, from, apiKey });
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      const email = user?.email;
      if (!email) return false;
      return isEmailAllowed(email, parseAllowlist(process.env.AUTH_ALLOWED_EMAILS));
    },
  },
  events: {
    async signIn({ user }) {
      if (user?.id) touchUserLogin(user.id);
    },
  },
});

export async function getCurrentUser(): Promise<{ id: string; email: string } | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  const u = getUserByEmail(email);
  if (!u) return null;
  return { id: u.id, email: u.email };
}
