import { Context, Hono } from "hono";
import { SplitwiseAuthService } from "../splitwise";
import { Env } from "../../types";
import { RedisGlobalStore } from "../users";
import {
	getSuccessPageResponse,
	getErrorPageResponse,
} from "../static/templates";

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

		const redis = new RedisGlobalStore({
			url: cxt.env.REDIS_URL!,
			token: cxt.env.REDIS_TOKEN!,
		});

		const tokens = await splitwiseAuth.getRequestToken();

		if (!tokens.requestToken || !tokens.requestTokenSecret) {
			return getErrorPageResponse(
				"Failed to get authorization token. Please try again."
			);
		}

		// Store request token and secret in the users map
		await redis.setUser(userId, {
			id: userId,
			requestToken: tokens.requestToken,
			requestTokenSecret: tokens.requestTokenSecret,
		});

		await redis.setRequestToken(tokens.requestToken, {
			id: userId,
		});

		const authUrl = splitwiseAuth.getAuthorizationURL(tokens.requestToken);

		console.log(authUrl);

		// redirect user to authorization URL
		return cxt.redirect(authUrl, 302);
	} catch (error) {
		console.error("Error in authorize:", error);
		return getErrorPageResponse(
			"Failed to start authorization process. Please try again."
		);
	}
});

/**
 * Step 2: Handle OAuth callback and exchange for access token
 */
app.get("/callback", async (cxt: Context) => {
	try {
		const oauth_token = cxt.req.query("oauth_token");
		const oauth_verifier = cxt.req.query("oauth_verifier");

		const redis = new RedisGlobalStore({
			url: cxt.env.REDIS_URL!,
			token: cxt.env.REDIS_TOKEN!,
		});

		if (!oauth_token || !oauth_verifier) {
			return getErrorPageResponse(
				"Missing required authorization parameters. Please try the authorization process again."
			);
		}

		const user = await redis.getRequestToken(oauth_token);

		const userId = user?.id;

		console.log(userId);

		if (!userId) {
			return getErrorPageResponse(
				"Invalid or expired authorization session. Please try the authorization process again."
			);
		}

		// Retrieve stored tokens
		const storedTokens = await redis.getUser(userId);
		if (
			!storedTokens ||
			!storedTokens.requestToken ||
			!storedTokens.requestTokenSecret
		) {
			return getErrorPageResponse(
				"Invalid or expired authorization session. Please try the authorization process again."
			);
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
			return getErrorPageResponse(
				"Failed to obtain access token. Please try the authorization process again."
			);
		}

		// Store access tokens in the user map and remove request tokens
		await redis.updateUser(userId, {
			access_token: accessTokens.accessToken,
			accessTokenSecret: accessTokens.accessTokenSecret,
		});

		// Remove request tokens from user record
		await redis.removeUserFields(userId, [
			"requestToken",
			"requestTokenSecret",
		]);

		// Return the success page
		return getSuccessPageResponse();
	} catch (error) {
		console.error("Error in callback:", error);
		return getErrorPageResponse(
			"An unexpected error occurred during authorization. Please try again."
		);
	}
});

app.get("/token/:id", async (ctx: Context) => {
	const userId = ctx.req.param("id");

	const redis = new RedisGlobalStore({
		url: ctx.env.REDIS_URL!,
		token: ctx.env.REDIS_TOKEN!,
	});

	const user = await redis.getUser(userId);

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
