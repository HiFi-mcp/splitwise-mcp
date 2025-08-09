import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SplitwiseAuthService } from "./lib/splitwise";
import app from "./authHandler";
import { Env } from "./types";
import { users } from "./lib/users";

// Global variable to store environment variables
let globalEnv: Env = {};

export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Splitwise MCP",
		version: "1.0.0",
	});
	backendUrl = globalEnv.BACKEND_URL || "http://localhost:3000";

	private splitwiseAuth: SplitwiseAuthService | null = null;

	async init() {
		// Initialize Splitwise auth service using global environment variables
		this.splitwiseAuth = new SplitwiseAuthService(
			globalEnv.SPLITWISE_CONSUMER_KEY || "",
			globalEnv.SPLITWISE_CONSUMER_SECRET || "",
			globalEnv.SPLITWISE_CALLBACK_URL
		);

		const userId = crypto.randomUUID();

		// Authentication tool to start OAuth flow
		this.server.tool("splitwise_authenticate", {}, async () => {
			if (!this.splitwiseAuth) {
				return {
					content: [
						{
							type: "text",
							text: "Error: Splitwise not configured. Please set SPLITWISE_CONSUMER_KEY and SPLITWISE_CONSUMER_SECRET environment variables.",
						},
					],
				};
			}

			try {
				const tokens = await this.splitwiseAuth.getRequestToken();
				const authUrl = this.splitwiseAuth.getAuthorizationURL(
					tokens.requestToken!
				);

				return {
					content: [
						{
							type: "text",
							text: `Please visit this URL to authorize Splitwise access: ${authUrl}\n\nAfter authorization, use the splitwise_complete_auth tool with the oauth_verifier code you receive.`,
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: `Error starting authentication: ${error}`,
						},
					],
				};
			}
		});

		// Tool to complete authentication with oauth verifier
		this.server.tool(
			"splitwise_complete_auth",
			{
				oauth_verifier: z.string(),
				session_id: z.string().optional(),
			},
			async ({ oauth_verifier, session_id }) => {
				if (!this.splitwiseAuth) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Splitwise not configured",
							},
						],
					};
				}

				try {
					// For now, we'll need the user to provide the request token and secret
					// In a full implementation, these would be stored in the session
					return {
						content: [
							{
								type: "text",
								text: `Please use the splitwise_get_access_token tool with your request token, request token secret, and oauth verifier: ${oauth_verifier}`,
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error completing authentication: ${error}`,
							},
						],
					};
				}
			}
		);

		// Tool to get access token (for manual token exchange)
		this.server.tool(
			"splitwise_get_access_token",
			{
				request_token: z.string(),
				request_token_secret: z.string(),
				oauth_verifier: z.string(),
			},
			async ({ request_token, request_token_secret, oauth_verifier }) => {
				if (!this.splitwiseAuth) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Splitwise not configured",
							},
						],
					};
				}

				try {
					const tokens = await this.splitwiseAuth.getAccessToken(
						request_token,
						request_token_secret,
						oauth_verifier
					);

					// Store the authenticated session
					const sessionId = crypto.randomUUID();
					authenticatedSessions.set(sessionId, {
						access_token: tokens.accessToken!,
						access_token_secret: tokens.accessTokenSecret!,
					});

					return {
						content: [
							{
								type: "text",
								text: `Authentication successful! Your session ID is: ${sessionId}\n\nUse this session ID with other Splitwise tools. Your access tokens have been securely stored.`,
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error getting access token: ${error}`,
							},
						],
					};
				}
			}
		);

		// TODO: All tools need to do proper auth check

		// Splitwise User Tools
		this.server.tool("splitwise_get_current_user", async () => {
			const user = users.get(userId);
			if (!user || !user.access_token || !user.accessTokenSecret) {
				return {
					content: [
						{
							type: "text",
							text: `Error: Invalid or expired session. Please visit ${this.backendUrl}/authorize/userId=${userId}`,
						},
					],
				};
			}

			try {
				const result = await this.splitwiseAuth.getCurrentUser(
					user.access_token,
					user.accessTokenSecret
				);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(result.user, null, 2),
						},
					],
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text",
							text: `Error getting current user: ${error}`,
						},
					],
				};
			}
		});

		this.server.tool(
			"splitwise_update_user",
			{
				session_id: z.string(),
				user_data: z.object({
					first_name: z.string().optional(),
					last_name: z.string().optional(),
					email: z.string().optional(),
					password: z.string().optional(),
					locale: z.string().optional(),
					date_format: z.string().optional(),
					default_currency: z.string().optional(),
					timezone: z.string().optional(),
				}),
			},
			async ({ session_id, user_data }) => {
				const userProps = getAuthenticatedUser(session_id);
				if (!userProps) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Invalid or expired session. Please authenticate again using splitwise_authenticate.",
							},
						],
					};
				}

				if (!this.splitwiseAuth) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Splitwise not configured",
							},
						],
					};
				}

				try {
					const result = await this.splitwiseAuth.updateUser(
						userProps.access_token,
						userProps.access_token_secret,
						user_data
					);
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(result.user, null, 2),
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error updating user: ${error}`,
							},
						],
					};
				}
			}
		);

		// Splitwise Group Tools
		this.server.tool(
			"splitwise_get_groups",
			{
				session_id: z.string(),
			},
			async ({ session_id }) => {
				const userProps = getAuthenticatedUser(session_id);
				if (!userProps) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Invalid or expired session. Please authenticate again using splitwise_authenticate.",
							},
						],
					};
				}

				if (!this.splitwiseAuth) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Splitwise not configured",
							},
						],
					};
				}

				try {
					const result = await this.splitwiseAuth.getGroups(
						userProps.access_token,
						userProps.access_token_secret
					);
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(result.groups, null, 2),
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error getting groups: ${error}`,
							},
						],
					};
				}
			}
		);

		this.server.tool(
			"splitwise_get_group",
			{
				session_id: z.string(),
				group_id: z.number(),
			},
			async ({ session_id, group_id }) => {
				const userProps = getAuthenticatedUser(session_id);
				if (!userProps) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Invalid or expired session. Please authenticate again using splitwise_authenticate.",
							},
						],
					};
				}

				if (!this.splitwiseAuth) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Splitwise not configured",
							},
						],
					};
				}

				try {
					const result = await this.splitwiseAuth.getGroup(
						userProps.access_token,
						userProps.access_token_secret,
						group_id
					);
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(result.group, null, 2),
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error getting group: ${error}`,
							},
						],
					};
				}
			}
		);

		this.server.tool(
			"splitwise_create_group",
			{
				session_id: z.string(),
				group_data: z.object({
					name: z.string(),
					group_type: z.string().optional(),
					simplify_by_default: z.boolean().optional(),
					whiteboard: z.string().optional(),
				}),
			},
			async ({ session_id, group_data }) => {
				const userProps = getAuthenticatedUser(session_id);
				if (!userProps) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Invalid or expired session. Please authenticate again using splitwise_authenticate.",
							},
						],
					};
				}

				if (!this.splitwiseAuth) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Splitwise not configured",
							},
						],
					};
				}

				try {
					const result = await this.splitwiseAuth.createGroup(
						userProps.access_token,
						userProps.access_token_secret,
						group_data
					);
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(result.group, null, 2),
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error creating group: ${error}`,
							},
						],
					};
				}
			}
		);

		this.server.tool(
			"splitwise_delete_group",
			{
				session_id: z.string(),
				group_id: z.number(),
			},
			async ({ session_id, group_id }) => {
				const userProps = getAuthenticatedUser(session_id);
				if (!userProps) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Invalid or expired session. Please authenticate again using splitwise_authenticate.",
							},
						],
					};
				}

				if (!this.splitwiseAuth) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Splitwise not configured",
							},
						],
					};
				}

				try {
					const result = await this.splitwiseAuth.deleteGroup(
						userProps.access_token,
						userProps.access_token_secret,
						group_id
					);
					return {
						content: [
							{
								type: "text",
								text: `Group deleted successfully: ${JSON.stringify(result)}`,
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error deleting group: ${error}`,
							},
						],
					};
				}
			}
		);

		this.server.tool(
			"splitwise_undelete_group",
			{
				session_id: z.string(),
				group_id: z.number(),
			},
			async ({ session_id, group_id }) => {
				const userProps = getAuthenticatedUser(session_id);
				if (!userProps) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Invalid or expired session. Please authenticate again using splitwise_authenticate.",
							},
						],
					};
				}

				if (!this.splitwiseAuth) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Splitwise not configured",
							},
						],
					};
				}

				try {
					const result = await this.splitwiseAuth.unDeleteGroup(
						userProps.access_token,
						userProps.access_token_secret,
						group_id
					);
					return {
						content: [
							{
								type: "text",
								text: `Group undeleted successfully: ${JSON.stringify(result)}`,
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error undeleting group: ${error}`,
							},
						],
					};
				}
			}
		);

		this.server.tool(
			"splitwise_add_user_to_group",
			{
				session_id: z.string(),
				group_id: z.number(),
				user_email: z.string(),
				first_name: z.string().optional(),
				last_name: z.string().optional(),
			},
			async ({ session_id, group_id, user_email, first_name, last_name }) => {
				const userProps = getAuthenticatedUser(session_id);
				if (!userProps) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Invalid or expired session. Please authenticate again using splitwise_authenticate.",
							},
						],
					};
				}

				if (!this.splitwiseAuth) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Splitwise not configured",
							},
						],
					};
				}

				try {
					const result = await this.splitwiseAuth.addUserToGroup(
						userProps.access_token,
						userProps.access_token_secret,
						group_id,
						user_email,
						first_name,
						last_name
					);
					return {
						content: [
							{
								type: "text",
								text: `User added to group successfully: ${JSON.stringify(
									result
								)}`,
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error adding user to group: ${error}`,
							},
						],
					};
				}
			}
		);

		this.server.tool(
			"splitwise_remove_user_from_group",
			{
				session_id: z.string(),
				group_id: z.number(),
				user_id: z.number(),
			},
			async ({ session_id, group_id, user_id }) => {
				const userProps = getAuthenticatedUser(session_id);
				if (!userProps) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Invalid or expired session. Please authenticate again using splitwise_authenticate.",
							},
						],
					};
				}

				if (!this.splitwiseAuth) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Splitwise not configured",
							},
						],
					};
				}

				try {
					const result = await this.splitwiseAuth.removeUserFromGroup(
						userProps.access_token,
						userProps.access_token_secret,
						group_id,
						user_id
					);
					return {
						content: [
							{
								type: "text",
								text: `User removed from group successfully: ${JSON.stringify(
									result
								)}`,
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error removing user from group: ${error}`,
							},
						],
					};
				}
			}
		);

		// Splitwise Friend Tools
		this.server.tool(
			"splitwise_get_friends",
			{
				session_id: z.string(),
			},
			async ({ session_id }) => {
				const userProps = getAuthenticatedUser(session_id);
				if (!userProps) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Invalid or expired session. Please authenticate again using splitwise_authenticate.",
							},
						],
					};
				}

				if (!this.splitwiseAuth) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Splitwise not configured",
							},
						],
					};
				}

				try {
					const result = await this.splitwiseAuth.getFriends(
						userProps.access_token,
						userProps.access_token_secret
					);
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(result.friends, null, 2),
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error getting friends: ${error}`,
							},
						],
					};
				}
			}
		);

		this.server.tool(
			"splitwise_get_friend",
			{
				session_id: z.string(),
				friend_id: z.number(),
			},
			async ({ session_id, friend_id }) => {
				const userProps = getAuthenticatedUser(session_id);
				if (!userProps) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Invalid or expired session. Please authenticate again using splitwise_authenticate.",
							},
						],
					};
				}

				if (!this.splitwiseAuth) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Splitwise not configured",
							},
						],
					};
				}

				try {
					const result = await this.splitwiseAuth.getFriend(
						userProps.access_token,
						userProps.access_token_secret,
						friend_id
					);
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(result.friend, null, 2),
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error getting friend: ${error}`,
							},
						],
					};
				}
			}
		);

		// Splitwise Expense Tools
		this.server.tool(
			"splitwise_get_expense",
			{
				session_id: z.string(),
				expense_id: z.number(),
			},
			async ({ session_id, expense_id }) => {
				const userProps = getAuthenticatedUser(session_id);
				if (!userProps) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Invalid or expired session. Please authenticate again using splitwise_authenticate.",
							},
						],
					};
				}

				if (!this.splitwiseAuth) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Splitwise not configured",
							},
						],
					};
				}

				try {
					const result = await this.splitwiseAuth.getExpense(
						userProps.access_token,
						userProps.access_token_secret,
						expense_id
					);
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(result.expense, null, 2),
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error getting expense: ${error}`,
							},
						],
					};
				}
			}
		);

		this.server.tool(
			"splitwise_get_expenses",
			{
				session_id: z.string(),
				group_id: z.number().optional(),
				friend_id: z.number().optional(),
				dated_after: z.string().optional(),
				dated_before: z.string().optional(),
				updated_after: z.string().optional(),
				updated_before: z.string().optional(),
				limit: z.number().optional(),
				offset: z.number().optional(),
			},
			async ({ session_id, ...params }) => {
				const userProps = getAuthenticatedUser(session_id);
				if (!userProps) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Invalid or expired session. Please authenticate again using splitwise_authenticate.",
							},
						],
					};
				}

				if (!this.splitwiseAuth) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Splitwise not configured",
							},
						],
					};
				}

				try {
					const result = await this.splitwiseAuth.getExpenses(
						userProps.access_token,
						userProps.access_token_secret,
						params
					);
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(result.expenses, null, 2),
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error getting expenses: ${error}`,
							},
						],
					};
				}
			}
		);

		this.server.tool(
			"splitwise_create_expense",
			{
				session_id: z.string(),
				expense_data: z.object({
					cost: z.string(),
					description: z.string(),
					date: z.string().optional(),
					currency_code: z.string().optional(),
					group_id: z.number().optional(),
					split_equally: z.boolean().optional(),
					users: z
						.array(
							z.object({
								user_id: z.number(),
								paid_share: z.string().optional(),
								owed_share: z.string().optional(),
							})
						)
						.optional(),
					payment: z.boolean().optional(),
					details: z.string().optional(),
					category_id: z.number().optional(),
					receipt: z.string().optional(),
					repeat_interval: z.string().optional(),
					email_reminder: z.boolean().optional(),
					email_reminder_in_advance: z.number().optional(),
				}),
			},
			async ({ session_id, expense_data }) => {
				const userProps = getAuthenticatedUser(session_id);
				if (!userProps) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Invalid or expired session. Please authenticate again using splitwise_authenticate.",
							},
						],
					};
				}

				if (!this.splitwiseAuth) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Splitwise not configured",
							},
						],
					};
				}

				try {
					const result = await this.splitwiseAuth.createExpense(
						userProps.access_token,
						userProps.access_token_secret,
						expense_data
					);
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(result.expense, null, 2),
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error creating expense: ${error}`,
							},
						],
					};
				}
			}
		);

		this.server.tool(
			"splitwise_update_expense",
			{
				session_id: z.string(),
				expense_id: z.number(),
				expense_data: z.object({
					cost: z.string().optional(),
					description: z.string().optional(),
					date: z.string().optional(),
					currency_code: z.string().optional(),
					group_id: z.number().optional(),
					split_equally: z.boolean().optional(),
					users: z
						.array(
							z.object({
								user_id: z.number(),
								paid_share: z.string().optional(),
								owed_share: z.string().optional(),
							})
						)
						.optional(),
					payment: z.boolean().optional(),
					details: z.string().optional(),
					category_id: z.number().optional(),
					receipt: z.string().optional(),
					repeat_interval: z.string().optional(),
					email_reminder: z.boolean().optional(),
					email_reminder_in_advance: z.number().optional(),
				}),
			},
			async ({ session_id, expense_id, expense_data }) => {
				const userProps = getAuthenticatedUser(session_id);
				if (!userProps) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Invalid or expired session. Please authenticate again using splitwise_authenticate.",
							},
						],
					};
				}

				if (!this.splitwiseAuth) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Splitwise not configured",
							},
						],
					};
				}

				try {
					const result = await this.splitwiseAuth.updateExpense(
						userProps.access_token,
						userProps.access_token_secret,
						expense_id,
						expense_data
					);
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(result.expense, null, 2),
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error updating expense: ${error}`,
							},
						],
					};
				}
			}
		);

		this.server.tool(
			"splitwise_delete_expense",
			{
				session_id: z.string(),
				expense_id: z.number(),
			},
			async ({ session_id, expense_id }) => {
				const userProps = getAuthenticatedUser(session_id);
				if (!userProps) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Invalid or expired session. Please authenticate again using splitwise_authenticate.",
							},
						],
					};
				}

				if (!this.splitwiseAuth) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Splitwise not configured",
							},
						],
					};
				}

				try {
					const result = await this.splitwiseAuth.deleteExpense(
						userProps.access_token,
						userProps.access_token_secret,
						expense_id
					);
					return {
						content: [
							{
								type: "text",
								text: `Expense deleted successfully: ${JSON.stringify(result)}`,
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error deleting expense: ${error}`,
							},
						],
					};
				}
			}
		);

		this.server.tool(
			"splitwise_undelete_expense",
			{
				session_id: z.string(),
				expense_id: z.number(),
			},
			async ({ session_id, expense_id }) => {
				const userProps = getAuthenticatedUser(session_id);
				if (!userProps) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Invalid or expired session. Please authenticate again using splitwise_authenticate.",
							},
						],
					};
				}

				if (!this.splitwiseAuth) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Splitwise not configured",
							},
						],
					};
				}

				try {
					const result = await this.splitwiseAuth.unDeleteExpense(
						userProps.access_token,
						userProps.access_token_secret,
						expense_id
					);
					return {
						content: [
							{
								type: "text",
								text: `Expense undeleted successfully: ${JSON.stringify(
									result
								)}`,
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error undeleting expense: ${error}`,
							},
						],
					};
				}
			}
		);

		// Splitwise Notification Tools
		this.server.tool(
			"splitwise_get_notifications",
			{
				session_id: z.string(),
				limit: z.number().optional(),
				offset: z.number().optional(),
			},
			async ({ session_id, limit, offset }) => {
				const userProps = getAuthenticatedUser(session_id);
				if (!userProps) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Invalid or expired session. Please authenticate again using splitwise_authenticate.",
							},
						],
					};
				}

				if (!this.splitwiseAuth) {
					return {
						content: [
							{
								type: "text",
								text: "Error: Splitwise not configured",
							},
						],
					};
				}

				try {
					const result = await this.splitwiseAuth.getNotifications(
						userProps.access_token,
						userProps.access_token_secret,
						{ limit, offset }
					);
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(result.notifications, null, 2),
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error getting notifications: ${error}`,
							},
						],
					};
				}
			}
		);

		// Tool to check authentication status
		this.server.tool(
			"splitwise_check_auth",
			{
				session_id: z.string(),
			},
			async ({ session_id }) => {
				const userProps = getAuthenticatedUser(session_id);
				if (!userProps) {
					return {
						content: [
							{
								type: "text",
								text: "Session expired or invalid. Please authenticate again using splitwise_authenticate.",
							},
						],
					};
				}

				return {
					content: [
						{
							type: "text",
							text: "Authentication valid. You can use other Splitwise tools with this session ID.",
						},
					],
				};
			}
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		// Set global environment variables
		globalEnv = env;

		const url = new URL(request.url);

		// Handle MCP endpoints
		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		// Handle OAuth provider endpoints
		if (url.pathname === "/authorize" || url.pathname === "/callback") {
			return app.fetch(request, env, ctx);
		}
	},
};
