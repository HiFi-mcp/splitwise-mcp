/**
 * Constructs an authorization URL for an upstream service.
 *
 * @param {Object} options
 * @param {string} options.upstream_url - The base URL of the upstream service.
 * @param {string} options.client_id - The client ID of the application.
 * @param {string} options.redirect_uri - The redirect URI of the application.
 * @param {string} [options.state] - The state parameter.
 * @param {string} [options.hosted_domain] - The hosted domain parameter.
 *
 * @returns {string} The authorization URL.
 */
export function getUpstreamAuthorizeUrl({
	upstreamUrl,
	clientId,
	scope,
	redirectUri,
	state,
	hostedDomain,
}: {
	upstreamUrl: string;
	clientId: string;
	scope: string;
	redirectUri: string;
	state?: string;
	hostedDomain?: string;
}) {
	const upstream = new URL(upstreamUrl);
	upstream.searchParams.set("client_id", clientId);
	upstream.searchParams.set("redirect_uri", redirectUri);
	upstream.searchParams.set("scope", scope);
	upstream.searchParams.set("response_type", "code");
	if (state) upstream.searchParams.set("state", state);
	if (hostedDomain) upstream.searchParams.set("hd", hostedDomain);
	return upstream.href;
}
