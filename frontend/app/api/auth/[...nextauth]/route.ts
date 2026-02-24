import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "mock_google_id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock_google_secret",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: {
          label: "Email or Username",
          type: "text",
          placeholder: "you@gmail.com",
        },
        password: {
          label: "Password",
          type: "password",
          placeholder: "••••••••",
        },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        // If the username looks like an email, use it directly as the email
        // This ensures the SUPERADMIN_EMAIL env var comparison works correctly
        const isEmail = credentials.username.includes("@");
        const email = isEmail
          ? credentials.username
          : `${credentials.username}@example.com`;

        // Demo admin shortcut
        if (
          credentials.username === "admin" &&
          credentials.password === "admin"
        ) {
          return { id: "1", name: "Admin User", email: "admin@example.com" };
        }

        // Accept any credentials but preserve the real email
        return {
          id: Math.random().toString(),
          name: credentials.username.split("@")[0], // Use part before @ as display name
          email,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret:
    process.env.NEXTAUTH_SECRET ||
    "fallback_super_secret_for_development_purposes_only_12345",
  pages: {
    signIn: "/login", // Redirects all signIn() requests to our custom page
    newUser: "/register", // Optional: If we wanted a default register route
  },
  callbacks: {
    async signIn({ user }) {
      // Sync user to our backend database asynchronously
      try {
        const adminEmail = (process.env.SUPERADMIN_EMAIL || "admin@example.com")
          .trim()
          .toLowerCase();
        const userEmail = (user.email || "").trim().toLowerCase();
        const role = userEmail === adminEmail ? "admin" : "user";

        fetch("http://localhost:5000/api/auth/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            name: user.name || "User",
            role,
          }),
        }).catch((e) => console.error("Failed to sync user:", e));
      } catch (err) {
        console.error("Error in signIn callback:", err);
      }
      return true; // always allow sign in
    },
    async jwt({ token, user }) {
      if (user) {
        const adminEmail = (process.env.SUPERADMIN_EMAIL || "admin@example.com")
          .trim()
          .toLowerCase();
        const userEmail = (user.email || "").trim().toLowerCase();
        token.role = userEmail === adminEmail ? "admin" : "user";
        token.email = user.email; // ensure email is always on token
        console.log(`[NextAuth] JWT for ${user.email} → role: ${token.role}`);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        // Ensure email always comes from the token (important for Google sign-in)
        if (token.email) session.user.email = token.email as string;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
