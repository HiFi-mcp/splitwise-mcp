import { Context, Hono } from "hono";
import { SplitwiseAuthService } from "../splitwise";
import { Env, Props } from "../../types";
import { getErrorPageResponse } from "../static/templates";
import {
	clientIdAlreadyApproved,
	parseRedirectApproval,
	renderApprovalDialog,
} from "../utils/oauth-worker";
import { AuthRequest } from "@cloudflare/workers-oauth-provider";
import { getUpstreamAuthorizeUrl } from "../utils/base.utils";

type Variables = {
	userId: string;
};

function RedirectToSplitwise(
	ctx: Context,
	oauthReqInfo: AuthRequest,
	headers: Record<string, string> = {},
	upstreamUrl: string
) {
	return new Response(null, {
		headers: {
			...headers,
			location: getUpstreamAuthorizeUrl({
				clientId: ctx.env.SPLITWISE_CONSUMER_KEY!,
				redirectUri: new URL("/callback", ctx.req.raw.url).href,
				scope: "read write",
				state: btoa(JSON.stringify(oauthReqInfo)),
				upstreamUrl: upstreamUrl,
			}),
		},
		status: 302,
	});
}

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * Step 1: Get request token and authorization URL
 */
app.get("/authorize", async (ctx: Context) => {
	try {
		const oauthReqInfo = await ctx.env.OAUTH_PROVIDER.parseAuthRequest(
			ctx.req.raw
		);

		const { clientId } = oauthReqInfo;
		if (!clientId) {
			return ctx.text("Invalid request", 400);
		}

		if (
			await clientIdAlreadyApproved(
				ctx.req.raw,
				oauthReqInfo.clientId,
				ctx.env.COOKIE_ENCRYPTION_KEY
			)
		) {
			const splitwiseAuth = new SplitwiseAuthService(
				ctx.env.SPLITWISE_CONSUMER_KEY!,
				ctx.env.SPLITWISE_CONSUMER_SECRET!,
				ctx.env.SPLITWISE_CALLBACK_URL!
			);

			const authUrl = splitwiseAuth.getAuthorizationURL();
			return RedirectToSplitwise(ctx, oauthReqInfo, {}, authUrl);
		}

		return renderApprovalDialog(ctx.req.raw, {
			client: await ctx.env.OAUTH_PROVIDER.lookupClient(clientId),
			server: {
				description: "This MCP Server provides Splitwise OAuth integration.",
				name: "Splitwise OAuth",
			},
			state: { oauthReqInfo },
		});
	} catch (error) {
		console.error("Error in authorize:", error);
		return getErrorPageResponse(
			"Failed to start authorization process. Please try again."
		);
	}
});

app.post("/authorize", async (ctx) => {
	const { state } = await parseRedirectApproval(
		ctx.req.raw,
		ctx.env.COOKIE_ENCRYPTION_KEY
	);
	if (!state.oauthReqInfo) {
		return ctx.text("Invalid request", 400);
	}

	const splitwiseAuth = new SplitwiseAuthService(
		ctx.env.SPLITWISE_CONSUMER_KEY!,
		ctx.env.SPLITWISE_CONSUMER_SECRET!,
		ctx.env.SPLITWISE_CALLBACK_URL!
	);

	const authUrl = splitwiseAuth.getAuthorizationURL();

	return RedirectToSplitwise(ctx, state.oauthReqInfo, {}, authUrl);
});

/**
 * Step 2: Handle OAuth callback and exchange for access token
 */
app.get("/callback", async (ctx: Context) => {
	try {
		const oauthReqInfo = JSON.parse(
			atob(ctx.req.query("state") as string)
		) as AuthRequest;

		if (!oauthReqInfo.clientId) {
			return ctx.text("Invalid state", 400);
		}

		const code = ctx.req.query("code");

		if (!code) {
			return ctx.text("Invalid state", 400);
		}

		const splitwiseAuth = new SplitwiseAuthService(
			ctx.env.SPLITWISE_CONSUMER_KEY!,
			ctx.env.SPLITWISE_CONSUMER_SECRET!,
			ctx.env.SPLITWISE_CALLBACK_URL!
		);

		const { access_token } = await splitwiseAuth.getAccessToken(code);

		if (!access_token) {
			return getErrorPageResponse(
				"Failed to obtain access token from Splitwise. Please try the authorization process again."
			);
		}

		const userData = await splitwiseAuth.getCurrentUser(access_token);
		const { first_name, email, last_name, id } = userData;

		const { redirectTo } = await ctx.env.OAUTH_PROVIDER.completeAuthorization({
			metadata: {
				label: `${first_name} ${last_name}`,
			},
			props: {
				user: {
					id: id.toString(),
					name: `${first_name} ${last_name}`,
					email: email,
					accessToken: access_token,
				},
			} as Props,
			request: oauthReqInfo,
			scope: oauthReqInfo.scope,
		});

		if (!redirectTo) {
			return getErrorPageResponse(
				"Failed to obtain access token from Splitwise. Please try the authorization process again."
			);
		}

		return ctx.redirect(redirectTo, 302);
	} catch (error) {
		console.error("Error in callback:", error);
		return getErrorPageResponse(
			"An unexpected error occurred during authorization. Please try again."
		);
	}
});

export { app as SplitwiseAuthHandler };
