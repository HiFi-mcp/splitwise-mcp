import { z } from "zod";
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OAuthProvider } from "@cloudflare/workers-oauth-provider";
import { Env, IUsers, Props } from "./types";
import { RedisGlobalStore } from "./lib/users";
import { SplitwiseAuthService } from "./lib/splitwise";
import { SplitwiseAuthHandler } from "./lib/authHandler";


// Use Durable Object state to persist user ID across requests
let __SERVER_USER_ID: string | undefined;
async function ensureServerUserId(state: DurableObjectState): Promise<string> {
	if (!__SERVER_USER_ID) {
		// Try to get existing user ID from state
		const storedUserId = await state.storage.get<string>("userId");
		if (storedUserId) {
			__SERVER_USER_ID = storedUserId;
		} else {
			// Generate new user ID and store it
			__SERVER_USER_ID = crypto.randomUUID();
			await state.storage.put("userId", __SERVER_USER_ID);
		}
	}
	return __SERVER_USER_ID;
}

export class MyMCP extends McpAgent<Env, Props> {
	server!: McpServer;
	protected env: Env;
	private durableState: DurableObjectState;
	private globalStore!: RedisGlobalStore;

	// not using currently this does not need
	users = {
		set: (key: string, user: IUsers) => this.globalStore.setUser(key, user),
		get: (key: string) => this.globalStore.getUser(key),
		has: (key: string) => this.globalStore.hasUser(key),
		delete: (key: string) => this.globalStore.deleteUser(key),
		clear: () => this.globalStore.clearUsers(),
		size: () => this.globalStore.getUsersSize(),
		entries: async () => {
			const map = await this.globalStore.getAllUsers();
			return map.entries();
		},
		keys: async () => {
			const map = await this.globalStore.getAllUsers();
			return Array.from(map.keys());
		},
		values: async () => {
			const map = await this.globalStore.getAllUsers();
			return Array.from(map.values());
		},
	};

	constructor(state: DurableObjectState, env: Env) {
		super(state, env);
		this.env = env;
		this.durableState = state;

		// Initialize globalStore after env is set
		this.globalStore = new RedisGlobalStore({
			url: this.env.REDIS_URL!,
			token: this.env.REDIS_TOKEN!,
		});
	}
	// Compute from current env set in fetch
	get backendUrl() {
		return this.env.BACKEND_URL || "";
	}

	private splitwiseAuth: SplitwiseAuthService | null = null;

	async getUserId(): Promise<string> {
		return await ensureServerUserId(this.durableState);
	}

	// Wrapper function to validate user authentication and Splitwise configuration
	private async validateUserAndSplitwise() {
		if (!this.props.user) {
			return {
				error: true,
				content: [
					{
						type: "text" as const,
						text: "Error: User not authenticated. Please authenticate first.",
					},
				],
			};
		}

		if (!this.splitwiseAuth) {
			return {
				error: true,
				content: [
					{
						type: "text" as const,
						text: "Error: Splitwise not configured",
					},
				],
			};
		}

		return { error: false };
	}

	// Generic wrapper for Splitwise API calls
	private async executeSplitwiseCall<T>(
		apiCall: (accessToken: string, ...args: any[]) => Promise<T>,
		...args: any[]
	) {
		const validation = await this.validateUserAndSplitwise();
		if (validation.error) {
			return { content: validation.content! };
		}

		try {
			const result = await apiCall(
				(this.props as Props).user.accessToken,
				...args
			);
			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify(result, null, 2),
					},
				],
			};
		} catch (error) {
			return {
				content: [
					{
						type: "text" as const,
						text: `Error: ${error}`,
					},
				],
			};
		}
	}

	async init() {
		// Create MCP server with runtime env (after fetch set globalEnv)
		this.server = new McpServer({
			name: "Splitwise MCP",
			version: "1.0.0",
			// env: globalEnv,
		});

		// Initialize Splitwise auth service using global environment variables
		this.splitwiseAuth = new SplitwiseAuthService(
			this.env.SPLITWISE_CONSUMER_KEY || "",
			this.env.SPLITWISE_CONSUMER_SECRET || "",
			this.env.SPLITWISE_CALLBACK_URL!
		);

		const about = {
			name: "Splitwise MCP",
			version: "1.0.0",
			description:
				"This MCP server can be used to manage your Splitwise account and expenses",
			author: "HiFi-mcp",
			license: "MIT",
			homepage: "https://github.com/HiFi-mcp/splitwise-mcp",
			contact: {
				email: "hello@hifi.click",
				url: "https://web.hifi.click",
			},
			repository: {
				type: "git",
				url: "https://github.com/HiFi-mcp/splitwise-mcp",
			},
		};

		this.server.tool("about", "About this MCP server", async () => {
			return {
				content: [{ text: JSON.stringify(about, null, 2), type: "text" }],
			};
		});

		this.server.tool(
			"validate",
			"Validated this mcp server to be used by PuchAI",
			{},
			async () => {
				// Format phone number to {country_code}{number} format (remove + prefix)
				const phoneNumber = this.env.PHONE_NUMBER || "";
				const formattedPhoneNumber = phoneNumber.startsWith("+")
					? phoneNumber.substring(1)
					: phoneNumber;

				return {
					content: [{ text: formattedPhoneNumber, type: "text" }],
				};
			}
		);
		// Splitwise User Tools
		this.server.tool(
			"splitwise_get_current_user",
			"Retrieve comprehensive profile information for the currently authenticated user from Splitwise, including personal details, preferences, and account settings. This tool requires a valid authentication session.",
			{},
			async () => {
				return await this.executeSplitwiseCall(
					this.splitwiseAuth!.getCurrentUser.bind(this.splitwiseAuth)
				);
			}
		);

		this.server.tool(
			"splitwise_update_user",
			"Update the current authenticated user's profile information in Splitwise. Supports modifying personal details like name, email, password, locale preferences, date format, default currency, and timezone settings. All fields are optional - only provided values will be updated.",
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
				return await this.executeSplitwiseCall(
					this.splitwiseAuth!.updateUser.bind(this.splitwiseAuth),
					user_data
				);
			}
		);

		// Splitwise Group Tools
		this.server.tool(
			"splitwise_get_groups",
			"Retrieve a complete list of all groups that the currently authenticated user belongs to in Splitwise. Returns detailed information about each group including members, balances, and group settings. Useful for overviewing all shared expense groups.",
			async () => {
				return await this.executeSplitwiseCall(
					this.splitwiseAuth!.getGroups.bind(this.splitwiseAuth)
				);
			}
		);

		this.server.tool(
			"splitwise_get_group",
			"Get detailed information about a specific Splitwise group by its ID. Returns comprehensive group data including member details, expense history, balances, and group configuration. Requires the group_id parameter to identify the target group.",
			{
				group_id: z.number(),
			},
			async ({ group_id }) => {
				return await this.executeSplitwiseCall(
					this.splitwiseAuth!.getGroup.bind(this.splitwiseAuth),
					group_id
				);
			}
		);

		this.server.tool(
			"splitwise_create_group",
			"Create a new expense-sharing group in Splitwise. Allows setting the group name, type (house, trip, couple, etc.), default simplification settings, and optional whiteboard text. Returns the newly created group with all its details.",
			{
				group_data: z.object({
					name: z.string(),
					group_type: z.string().optional(),
					simplify_by_default: z.boolean().optional(),
					whiteboard: z.string().optional(),
				}),
			},
			async ({ group_data }) => {
				return await this.executeSplitwiseCall(
					this.splitwiseAuth!.createGroup.bind(this.splitwiseAuth),
					group_data
				);
			}
		);

		this.server.tool(
			"splitwise_delete_group",
			"Soft delete a Splitwise group by marking it as deleted. The group can be restored later using splitwise_undelete_group. This action preserves all group data and expense history while hiding it from active group lists.",
			{
				group_id: z.number(),
			},
			async ({ group_id }) => {
				return await this.executeSplitwiseCall(
					this.splitwiseAuth!.deleteGroup.bind(this.splitwiseAuth),
					group_id
				);
			}
		);

		this.server.tool(
			"splitwise_undelete_group",
			"Restore a previously deleted Splitwise group back to active status. This reverses the soft deletion and makes the group visible again with all its original data, members, and expense history intact.",
			{
				group_id: z.number(),
			},
			async ({ group_id }) => {
				return await this.executeSplitwiseCall(
					this.splitwiseAuth!.unDeleteGroup.bind(this.splitwiseAuth),
					group_id
				);
			}
		);

		this.server.tool(
			"splitwise_add_user_to_group",
			"Invite a new user to join an existing Splitwise group by their email address. Optionally specify their first and last name for the invitation. The user will receive an email invitation to join the group and can accept to become a member.",
			{
				group_id: z.number(),
				user_email: z.string(),
				first_name: z.string().optional(),
				last_name: z.string().optional(),
			},
			async ({ group_id, user_email, first_name, last_name }) => {
				const data = {
					groupId: group_id,
					userEmail: user_email,
					firstName: first_name,
					lastName: last_name,
				};

				return await this.executeSplitwiseCall(
					this.splitwiseAuth!.addUserToGroup.bind(this.splitwiseAuth),
					data
				);
			}
		);

		this.server.tool(
			"splitwise_remove_user_from_group",
			"Remove a specific user from a Splitwise group by their user ID. This action will remove the user's access to the group and their visibility of group expenses. Note: Users cannot be removed from groups where they have outstanding balances.",
			{
				group_id: z.number(),
				user_id: z.number(),
			},
			async ({ group_id, user_id }) => {
				return await this.executeSplitwiseCall(
					this.splitwiseAuth!.removeUserFromGroup.bind(this.splitwiseAuth),
					group_id,
					user_id
				);
			}
		);

		// Splitwise Friend Tools
		this.server.tool(
			"splitwise_get_friends",
			"Retrieve a complete list of all friends connected to the current user's Splitwise account. Returns friend profiles including their names, email addresses, and any shared expense history. Useful for managing personal expense relationships outside of groups.",
			async () => {
				return await this.executeSplitwiseCall(
					this.splitwiseAuth!.getFriends.bind(this.splitwiseAuth)
				);
			}
		);

		this.server.tool(
			"splitwise_get_friend",
			"Get detailed information about a specific friend in Splitwise by their friend ID. Returns comprehensive friend profile data including contact information, shared expense history, and friendship status. Use this for detailed friend management.",
			{
				friend_id: z.number(),
			},
			async ({ friend_id }) => {
				return await this.executeSplitwiseCall(
					this.splitwiseAuth!.getFriend.bind(this.splitwiseAuth),
					friend_id
				);
			}
		);

		// Splitwise Expense Tools
		this.server.tool(
			"splitwise_get_expense",
			"Retrieve detailed information about a specific expense in Splitwise by its expense ID. Returns comprehensive expense data including cost breakdown, split details, participants, category, date, and any additional metadata like receipts or notes.",
			{
				expense_id: z.number(),
			},
			async ({ expense_id }) => {
				return await this.executeSplitwiseCall(
					this.splitwiseAuth!.getExpense.bind(this.splitwiseAuth),
					expense_id
				);
			}
		);

		this.server.tool(
			"splitwise_get_expenses",
			"Retrieve a filtered list of expenses from Splitwise with comprehensive filtering options. Filter by group, friend, date ranges, or get paginated results. Supports filtering expenses by creation date, last update date, and limiting results for performance.",
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
				return await this.executeSplitwiseCall(
					this.splitwiseAuth!.getExpenses.bind(this.splitwiseAuth),
					params
				);
			}
		);

		this.server.tool(
			"splitwise_create_expense",
			"Create a new expense in Splitwise with detailed cost and split information. Supports various expense types including group expenses, personal expenses, and payments. Features include custom splits, categories, receipt uploads, recurring expenses, and email reminders.",
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
				return await this.executeSplitwiseCall(
					this.splitwiseAuth!.createExpense.bind(this.splitwiseAuth),
					expense_data
				);
			}
		);

		this.server.tool(
			"splitwise_update_expense",
			"Modify an existing expense in Splitwise with new information. All fields are optional - only provided values will be updated. Supports changing cost, description, split details, category, dates, and other expense properties while preserving the expense ID.",
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
				return await this.executeSplitwiseCall(
					this.splitwiseAuth!.updateExpense.bind(this.splitwiseAuth),
					expense_id,
					expense_data
				);
			}
		);

		this.server.tool(
			"splitwise_delete_expense",
			"Soft delete an expense from Splitwise by marking it as deleted. The expense can be restored later using splitwise_undelete_expense. This preserves all expense data and history while hiding it from active expense lists and calculations.",
			{
				expense_id: z.number(),
			},
			async ({ expense_id }) => {
				return await this.executeSplitwiseCall(
					this.splitwiseAuth!.deleteExpense.bind(this.splitwiseAuth),
					expense_id
				);
			}
		);

		this.server.tool(
			"splitwise_undelete_expense",
			"Restore a previously deleted expense back to active status in Splitwise. This reverses the soft deletion and makes the expense visible again with all its original data, splits, and history intact. Useful for recovering accidentally deleted expenses.",
			{
				expense_id: z.number(),
			},
			async ({ expense_id }) => {
				return await this.executeSplitwiseCall(
					this.splitwiseAuth!.unDeleteExpense.bind(this.splitwiseAuth),
					expense_id
				);
			}
		);

		// Splitwise Notification Tools
		this.server.tool(
			"splitwise_get_notifications",
			"Retrieve notifications for the current authenticated user from Splitwise. Returns a list of notifications including expense reminders, group invitations, balance updates, and other account activities. Supports pagination for managing large numbers of notifications.",
			{
				limit: z.number().optional(),
				offset: z.number().optional(),
			},
			async ({ limit, offset }) => {
				return await this.executeSplitwiseCall(
					this.splitwiseAuth!.getNotifications.bind(this.splitwiseAuth),
					{ limit, offset }
				);
			}
		);

		// Tool to check authentication status
		this.server.tool(
			"splitwise_check_auth",
			"Verify the current user's authentication status and session validity for Splitwise API operations. Returns whether the session is active and ready for making authenticated requests. Use this to check if re-authentication is required before calling other tools.",
			async () => {
				const validation = await this.validateUserAndSplitwise();
				if (validation.error) {
					return { content: validation.content! };
				}

				return {
					content: [
						{
							type: "text",
							text: `Authentication valid. You can use other Splitwise tools with this session.`,
						},
					],
				};
			}
		);
	}
}

export default new OAuthProvider({
	apiHandler: MyMCP.mount("/sse") as any,
	apiRoute: "/sse",
	authorizeEndpoint: "/authorize",
	clientRegistrationEndpoint: "/register",
	defaultHandler: SplitwiseAuthHandler as any,
	tokenEndpoint: "/token",
});
