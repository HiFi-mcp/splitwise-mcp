import { Context, Hono } from "hono";
import { SplitwiseAuthService } from "../splitwise";
import { Env } from "../../types";
import { requestTokensState, users } from "../users";
import { getSuccessPageResponse, getErrorPageResponse } from "../static/templates";

type Variables = {
	userId: string;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

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
			return getErrorPageResponse("Failed to get authorization token. Please try again.");
		}

		// Store request token and secret in the users map
		users.set(userId, {
			id: userId,
			requestToken: tokens.requestToken,
			requestTokenSecret: tokens.requestTokenSecret,
		});

		requestTokensState.set(tokens.requestToken, {
			id: userId,
		});

		const authUrl = splitwiseAuth.getAuthorizationURL(tokens.requestToken);

		// redirect user to authorization URL
		return cxt.redirect(authUrl, 302);
	} catch (error) {
		console.error("Error in authorize:", error);
		return getErrorPageResponse("Failed to start authorization process. Please try again.");
	}
});

/**
 * Step 2: Handle OAuth callback and exchange for access token
 */
app.get("/callback", async (cxt: Context) => {
	try {
		const oauth_token = cxt.req.query("oauth_token");
		const oauth_verifier = cxt.req.query("oauth_verifier");

		if (!oauth_token || !oauth_verifier) {
			return getErrorPageResponse("Missing required authorization parameters. Please try the authorization process again.");
		}

		const userId = requestTokensState.get(oauth_token)?.id;

		if (!userId) {
			return getErrorPageResponse("Invalid or expired authorization session. Please try the authorization process again.");
		}

		// Retrieve stored tokens
		const storedTokens = users.get(userId);
		if (
			!storedTokens ||
			!storedTokens.requestToken ||
			!storedTokens.requestTokenSecret
		) {
			return getErrorPageResponse("Invalid or expired authorization session. Please try the authorization process again.");
		}

		// Initialize SplitwiseAuthService with consumer key and secret
		const splitwiseAuth = new SplitwiseAuthService(
			cxt.env.SPLITWISE_CONSUMER_KEY!,
			cxt.env.SPLITWISE_CONSUMER_SECRET!,
			cxt.env.SPLITWISE_CALLBACK_URL!
		);

		// Exchange request token for access token
		const accessTokens = await splitwiseAuth.getAccessToken(
			storedTokens.requestToken,
			storedTokens.requestTokenSecret,
			oauth_verifier
		);

		if (!accessTokens.accessToken || !accessTokens.accessTokenSecret) {
			return getErrorPageResponse("Failed to obtain access token. Please try the authorization process again.");
		}

		// Store access tokens in the user map
		users.set(userId, {
			id: userId,
			access_token: accessTokens.accessToken,
			accessTokenSecret: accessTokens.accessTokenSecret,
			requestToken: undefined,
			requestTokenSecret: undefined,
		});

		// Clean up request token state
		requestTokensState.delete(oauth_token);

		// Return the success page
		return getSuccessPageResponse();
	} catch (error) {
		console.error("Error in callback:", error);
		return getErrorPageResponse("An unexpected error occurred during authorization. Please try again.");
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
