import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { STARTING_BALANCE } from "@/lib/constants";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;
        if (user.isBlocked) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      // If a user already registered with email/password, a Google sign-in
      // with the same email links to that existing account.
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    // Runs before jwt. For Google sign-ins we create the DB user on the fly
    // (no Prisma adapter), mirroring /api/register: referralCode, welcome
    // bonuses, affiliate attribution from the aff_ref cookie + player diversion.
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;

      const email = (user.email ?? "").toLowerCase();
      if (!email) return false;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        if (existing.isBlocked) return false;
        // Backfill avatar if we don't have one yet
        if (!existing.image && user.image) {
          prisma.user.update({ where: { id: existing.id }, data: { image: user.image } }).catch(() => {});
        }
        return true;
      }

      // --- New Google user: replicate /api/register setup ---
      const adminSettings = await prisma.adminSettings.findMany({
        where: { key: { in: ["welcomeBonusDemo", "welcomeBonusReal", "playerDiversionPct"] } },
      }).catch(() => []);
      const bonusMap     = Object.fromEntries(adminSettings.map((s) => [s.key, Number(s.value)]));
      const welcomeDemo  = bonusMap.welcomeBonusDemo   ?? 0;
      const welcomeReal  = bonusMap.welcomeBonusReal   ?? 0;
      const diversionPct = bonusMap.playerDiversionPct ?? 0;

      // Affiliate attribution from the aff_ref cookie set by /ref/[slug]
      let affiliateId: string | undefined;
      let affiliateLinkSlug: string | undefined;
      try {
        const aff = (await cookies()).get("aff_ref")?.value;
        if (aff && /^[A-Za-z0-9_-]{4,20}$/.test(aff)) {
          const link = await prisma.affiliateLink.findUnique({ where: { slug: aff } }).catch(() => null);
          if (link) { affiliateId = link.affiliateId; affiliateLinkSlug = link.slug; }
        }
      } catch { /* cookies() may be unavailable in some contexts — ignore */ }

      // Player diversion: send a % of affiliate arrivals to the house instead
      if (affiliateId && diversionPct > 0 && Math.random() * 100 < diversionPct) {
        affiliateId = undefined;
        affiliateLinkSlug = undefined;
      }

      const referralCode   = randomBytes(4).toString("hex").toUpperCase();
      // OAuth users have no usable password — store a random hash so credentials
      // login can never succeed for them.
      const randomPassword = await bcrypt.hash(randomBytes(24).toString("hex"), 12);

      try {
        await prisma.user.create({
          data: {
            name:          user.name?.trim() || email.split("@")[0],
            email,
            password:      randomPassword,
            image:         user.image ?? undefined,
            emailVerified: true, // Google emails are pre-verified
            referralCode,
            ...(welcomeDemo > 0 ? { balance: STARTING_BALANCE + welcomeDemo } : {}),
            ...(welcomeReal > 0 ? { realBalance: welcomeReal } : {}),
            ...(affiliateId ? { affiliateId, affiliateLinkSlug } : {}),
          },
        });
      } catch (err) {
        // Unique-constraint race (user created between findUnique and create) is fine
        console.error("[auth] Google user create:", err);
      }

      if (affiliateLinkSlug) {
        prisma.affiliateLink.update({
          where: { slug: affiliateLinkSlug },
          data:  { conversions: { increment: 1 } },
        }).catch(() => {});
      }

      return true;
    },

    async jwt({ token, user, account }) {
      // Credentials: authorize() already returns the DB id
      if (account?.provider === "credentials" && user?.id) {
        token.id = user.id;
      }
      // Google: user.id is the Google sub — resolve the real DB id by email
      if (account?.provider === "google") {
        const email = (token.email ?? user?.email ?? "").toLowerCase();
        if (email) {
          const dbUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
          if (dbUser) token.id = dbUser.id;
        }
      }
      return token;
    },

    session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
