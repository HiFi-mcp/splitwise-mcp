import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SplitwiseAuthService } from "./lib/splitwise";
import app from "./lib/authHandler";
import { Env } from "./types";
import { users } from "./lib/users";

// Global variable to store environment variables
let globalEnv: Env = {};

// Lazy-initialized server-scoped ID (Cloudflare-safe). Generated on first request/tool call.
// TODO: not sure that the userId is generated correctly for each user
let __SERVER_USER_ID: string | undefined;
function ensureServerUserId(): string {
	if (!__SERVER_USER_ID) {
		__SERVER_USER_ID = crypto.randomUUID();
	}
	return __SERVER_USER_ID;
}

export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Splitwise MCP",
		version: "1.0.0",
	});
	backendUrl = globalEnv.BACKEND_URL || "http://localhost:3000";

	private splitwiseAuth: SplitwiseAuthService | null = null;
	get userId() {
		return ensureServerUserId();
	}

	async init() {
		// Initialize Splitwise auth service using global environment variables
		this.splitwiseAuth = new SplitwiseAuthService(
			globalEnv.SPLITWISE_CONSUMER_KEY || "",
			globalEnv.SPLITWISE_CONSUMER_SECRET || "",
			globalEnv.SPLITWISE_CALLBACK_URL
		);

		// TODO: Work on tools auth is completed
		// TODO: Go through all tools and implement it with req specifications and fn

		// Splitwise User Tools
		this.server.tool("splitwise_get_current_user", async () => {
			const user = users.get(this.userId);
			if (!user || !user.access_token || !user.accessTokenSecret) {
				return {
					content: [
						{
							type: "text",
							text: `Error: Invalid or expired session. Please visit ${this.backendUrl}/authorize/${this.userId}`,
						},
					],
				};
			}

			try {
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
				const result = await this.splitwiseAuth.getCurrentUser(
					user.access_token!,
					user.accessTokenSecret!
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
			async ({ user_data }) => {
				const userProps = users.get(this.userId);
				if (
					!userProps ||
					!userProps.access_token ||
					!userProps.accessTokenSecret
				) {
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
						userProps.accessTokenSecret,
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
		this.server.tool("splitwise_get_groups", {}, async () => {
			const userProps = users.get(this.userId);
			if (
				!userProps ||
				!userProps.access_token ||
				!userProps.accessTokenSecret
			) {
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
					userProps.accessTokenSecret
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
		});

		this.server.tool(
			"splitwise_get_group",
			{
				group_id: z.number(),
			},
			async ({ group_id }) => {
				const userProps = users.get(this.userId);
				if (
					!userProps ||
					!userProps.access_token ||
					!userProps.accessTokenSecret
				) {
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
						userProps.accessTokenSecret,
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
				group_data: z.object({
					name: z.string(),
					group_type: z.string().optional(),
					simplify_by_default: z.boolean().optional(),
					whiteboard: z.string().optional(),
				}),
			},
			async ({ group_data }) => {
				const userProps = users.get(this.userId);
				if (
					!userProps ||
					!userProps.access_token ||
					!userProps.accessTokenSecret
				) {
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
						userProps.accessTokenSecret,
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
				group_id: z.number(),
			},
			async ({ group_id }) => {
				const userProps = users.get(this.userId);
				if (
					!userProps ||
					!userProps.access_token ||
					!userProps.accessTokenSecret
				) {
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
						userProps.accessTokenSecret,
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
				group_id: z.number(),
			},
			async ({ group_id }) => {
				const userProps = users.get(this.userId);
				if (
					!userProps ||
					!userProps.access_token ||
					!userProps.accessTokenSecret
				) {
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
						userProps.accessTokenSecret,
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
				group_id: z.number(),
				user_email: z.string(),
				first_name: z.string().optional(),
				last_name: z.string().optional(),
			},
			async ({ group_id, user_email, first_name, last_name }) => {
				const userProps = users.get(this.userId);
				if (
					!userProps ||
					!userProps.access_token ||
					!userProps.accessTokenSecret
				) {
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
					const data = {
						groupId: group_id,
						userEmail: user_email,
						firstName: first_name,
						lastName: last_name,
					};

					const result = await this.splitwiseAuth.addUserToGroup(
						userProps.access_token,
						userProps.accessTokenSecret,
						data
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
				group_id: z.number(),
				user_id: z.number(),
			},
			async ({ group_id, user_id }) => {
				const userProps = users.get(this.userId);
				if (
					!userProps ||
					!userProps.access_token ||
					!userProps.accessTokenSecret
				) {
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
						userProps.accessTokenSecret,
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
		this.server.tool("splitwise_get_friends", {}, async () => {
			const userProps = users.get(this.userId);
			if (
				!userProps ||
				!userProps.access_token ||
				!userProps.accessTokenSecret
			) {
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
					userProps.accessTokenSecret
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
		});

		this.server.tool(
			"splitwise_get_friend",
			{
				friend_id: z.number(),
			},
			async ({ friend_id }) => {
				const userProps = users.get(this.userId);
				if (
					!userProps ||
					!userProps.access_token ||
					!userProps.accessTokenSecret
				) {
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
						userProps.accessTokenSecret,
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
				expense_id: z.number(),
			},
			async ({ expense_id }) => {
				const userProps = users.get(this.userId);
				if (
					!userProps ||
					!userProps.access_token ||
					!userProps.accessTokenSecret
				) {
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
						userProps.accessTokenSecret,
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
				group_id: z.number().optional(),
				friend_id: z.number().optional(),
				dated_after: z.string().optional(),
				dated_before: z.string().optional(),
				updated_after: z.string().optional(),
				updated_before: z.string().optional(),
				limit: z.number().optional(),
				offset: z.number().optional(),
			},
			async ({ ...params }) => {
				const userProps = users.get(this.userId);
				if (
					!userProps ||
					!userProps.access_token ||
					!userProps.accessTokenSecret
				) {
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
						userProps.accessTokenSecret,
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
			async ({ expense_data }) => {
				const userProps = users.get(this.userId);
				if (
					!userProps ||
					!userProps.access_token ||
					!userProps.accessTokenSecret
				) {
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
						userProps.accessTokenSecret,
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
			async ({ expense_id, expense_data }) => {
				const userProps = users.get(this.userId);
				if (
					!userProps ||
					!userProps.access_token ||
					!userProps.accessTokenSecret
				) {
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
						userProps.accessTokenSecret,
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
				expense_id: z.number(),
			},
			async ({ expense_id }) => {
				const userProps = users.get(this.userId);
				if (
					!userProps ||
					!userProps.access_token ||
					!userProps.accessTokenSecret
				) {
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
						userProps.accessTokenSecret,
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
				expense_id: z.number(),
			},
			async ({ expense_id }) => {
				const userProps = users.get(this.userId);
				if (
					!userProps ||
					!userProps.access_token ||
					!userProps.accessTokenSecret
				) {
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
						userProps.accessTokenSecret,
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
				limit: z.number().optional(),
				offset: z.number().optional(),
			},
			async ({ limit, offset }) => {
				const userProps = users.get(this.userId);
				if (
					!userProps ||
					!userProps.access_token ||
					!userProps.accessTokenSecret
				) {
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
						userProps.accessTokenSecret,
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
		this.server.tool("splitwise_check_auth", {}, async () => {
			const userProps = users.get(this.userId);
			if (
				!userProps ||
				!userProps.access_token ||
				!userProps.accessTokenSecret
			) {
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
		});
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
		if (
			url.pathname.startsWith("/authorize") ||
			url.pathname === "/callback" ||
			url.pathname.startsWith("/token")
		) {
			return app.fetch(request, env, ctx);
		}

		// Return 404 for unknown routes
		return new Response("Not Found", { status: 404 });
	},
};
