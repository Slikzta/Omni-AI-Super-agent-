import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import cookieParser from "cookie-parser";
import { Octokit } from "octokit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());
  app.use(
    session({
      secret: "omniagent-secret-key",
      resave: false,
      saveUninitialized: true,
      cookie: {
        secure: true,
        sameSite: "none",
        httpOnly: true,
      },
    })
  );

  // GitHub OAuth Routes
  app.get("/api/auth/github/url", (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: "GITHUB_CLIENT_ID not configured" });
    }

    const redirectUri = `${process.env.APP_URL}/auth/github/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "repo user",
      state: "omniagent_auth_state",
    });

    res.json({ url: `https://github.com/login/oauth/authorize?${params.toString()}` });
  });

  app.get(["/auth/github/callback", "/auth/github/callback/"], async (req, res) => {
    const { code, state } = req.query;
    if (!code) {
      return res.status(400).send("Missing code");
    }

    // Optional: verify state if you want to be strict
    // if (state !== "omniagent_auth_state") {
    //   return res.status(400).send("Invalid state");
    // }

    try {
      const redirectUri = `${process.env.APP_URL}/auth/github/callback`;
      const response = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: redirectUri,
        }),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      // Store token in session or cookie
      res.cookie("github_token", data.access_token, {
        secure: true,
        sameSite: "none",
        httpOnly: true,
      });

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GITHUB_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>GitHub connected! This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error("GitHub OAuth error:", error);
      res.status(500).send(`Authentication failed: ${error.message}`);
    }
  });

  app.get("/api/github/user", async (req, res) => {
    const token = req.cookies.github_token;
    if (!token) return res.status(401).json({ error: "Not connected to GitHub" });

    try {
      const octokit = new Octokit({ auth: token });
      const { data } = await octokit.rest.users.getAuthenticated();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch GitHub user" });
    }
  });

  app.post("/api/github/logout", (req, res) => {
    res.clearCookie("github_token", {
      secure: true,
      sameSite: "none",
      httpOnly: true,
    });
    res.json({ success: true });
  });

  // Supabase Config Route
  app.get("/api/config/supabase", (req, res) => {
    res.json({
      url: process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY,
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
