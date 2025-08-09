import { Context, Hono } from "hono";
import { SplitwiseAuthService } from "../lib/splitwise";
import { Env } from "../types";
import { users } from "../lib/users";

const app = new Hono<{ Bindings: Env }>();

/**
 * Step 1: Get request token and authorization URL
 */
app.get("/authorize/:id", async (cxt: Context) => {
	try {
		const userId = cxt.req.param("id");

		const splitwiseAuth = new SplitwiseAuthService(
			cxt.env.SPLITWISE_CONSUMER_KEY!,
			cxt.env.SPLITWISE_CONSUMER_SECRET!,
			cxt.env.SPLITWISE_CALLBACK_URL!
		);

		const tokens = await splitwiseAuth.getRequestToken();

		if (!tokens.requestToken || !tokens.requestTokenSecret) {
			return cxt.json({ error: "Failed to get request token" }, 500);
		}

		// Store tokens temporarily
		const sessionId = crypto.randomUUID();
		users.set(userId, {
			id: userId,
			requestToken: tokens.requestToken,
			requestTokenSecret: tokens.requestTokenSecret,
		});

		const authUrl = splitwiseAuth.getAuthorizationURL(tokens.requestToken);

		return cxt.json({
			success: true,
			userId: sessionId,
			authorization_url: authUrl,
			request_token: tokens.requestToken,
			request_token_secret: tokens.requestTokenSecret,
		});
	} catch (error) {
		console.error("Error in authorize:", error);
		return cxt.json({ error: "Failed to get authorization URL" }, 500);
	}
});

/**
 * Step 2: Handle OAuth callback and exchange for access token
 */
app.get("/callback", async (cxt) => {
	try {
		const oauth_token = cxt.req.query("oauth_token");
		const oauth_verifier = cxt.req.query("oauth_verifier");
		// TODO: some how need to send userId to callbacks query
		const userId = cxt.req.query("userId");

		if (!oauth_token || !oauth_verifier || !userId) {
			return cxt.json({ error: "Missing required parameters" }, 400);
		}

		// Retrieve stored tokens
		const storedTokens = users.get(userId);
		if (
			!storedTokens ||
			!storedTokens.requestToken ||
			!storedTokens.requestTokenSecret
		) {
			return cxt.json({ error: "Invalid or expired session" }, 400);
		}

		const splitwiseAuth = new SplitwiseAuthService(
			cxt.env.SPLITWISE_CONSUMER_KEY!,
			cxt.env.SPLITWISE_CONSUMER_SECRET!,
			cxt.env.SPLITWISE_CALLBACK_URL!
		);

		const accessTokens = await splitwiseAuth.getAccessToken(
			storedTokens.requestToken,
			storedTokens.requestTokenSecret,
			oauth_verifier
		);

		if (!accessTokens.accessToken || !accessTokens.accessTokenSecret) {
			cxt.json({ error: "Failed to get access token" }, 500);
		}

		return cxt.json({
			success: true,
			access_token: accessTokens.accessToken,
			access_token_secret: accessTokens.accessTokenSecret,
		});
	} catch (error) {
		console.error("Error in callback:", error);
		return cxt.json({ error: "Failed to exchange tokens" }, 500);
	}
});

app.get("/token/:id", async (ctx: Context) => {
	const userId = ctx.req.param("id");

	const user = users.get(userId);

	if (!user) {
		return ctx.json({
			sucess: false,
			message: "user not found",
		});
	}

	return ctx.json({
		sucess: true,
		message: "users fetched sucessully!",
		data: {
			user: user,
		},
	});
});

export default app;
