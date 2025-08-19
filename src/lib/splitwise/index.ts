import axios, { AxiosRequestConfig } from "axios";
import {
	CreateExpenseRequest,
	CreateGroupRequest,
	SplitwiseExpense,
	SplitwiseFriend,
	SplitwiseGroup,
	SplitwiseNotification,
	SplitwiseTokens,
	SplitwiseUser,
	UpdateExpenseRequest,
	UpdateUserRequest,
} from "../response/splitwise";
import { AddUserToGroupRequest } from "../../types";

export class SplitwiseAuthService {
	private readonly baseURL = "https://secure.splitwise.com/api/v3.0";
	private readonly authorizeURL =
		"https://secure.splitwise.com/oauth/authorize";
	private readonly tokenURL = "https://secure.splitwise.com/oauth/token";

	constructor(
		private clientId: string,
		private clientSecret: string,
		private redirectUri: string
	) {}

	/**
	 * Step 1: Get authorization URL
	 */
	getAuthorizationURL(scope: string[] = ["read", "write"]): string {
		const params = new URLSearchParams({
			client_id: this.clientId,
			redirect_uri: this.redirectUri,
			response_type: "code",
			scope: scope.join(","),
		});

		return `${this.authorizeURL}?${params.toString()}`;
	}

	/**
	 * Step 2: Exchange authorization code for access token
	 */
	async getAccessToken(code: string): Promise<SplitwiseTokens> {
		const data = new URLSearchParams({
			client_id: this.clientId,
			client_secret: this.clientSecret,
			grant_type: "authorization_code",
			code,
			redirect_uri: this.redirectUri,
		});

		const response = await axios.post(this.tokenURL, data.toString(), {
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
		});

		return response.data;
	}

	/**
	 * Step 3: Refresh expired access token
	 */
	async refreshAccessToken(refreshToken: string): Promise<SplitwiseTokens> {
		const data = new URLSearchParams({
			client_id: this.clientId,
			client_secret: this.clientSecret,
			grant_type: "refresh_token",
			refresh_token: refreshToken,
		});

		const response = await axios.post(this.tokenURL, data.toString(), {
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
		});

		return response.data;
	}

	/**
	 * Make authenticated API requests
	 */
	async makeAuthenticatedRequest<T = any>(
		url: string,
		method: "GET" | "POST" | "PUT" | "DELETE",
		accessToken: string,
		data?: any
	): Promise<T> {
		const fullURL = url.startsWith("http") ? url : `${this.baseURL}${url}`;

		const config: AxiosRequestConfig = {
			method: method.toLowerCase() as any,
			url: fullURL,
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/x-www-form-urlencoded",
			},
		};

		if (method !== "GET" && data) {
			config.data = new URLSearchParams(data).toString();
		} else if (method === "GET" && data) {
			config.params = data;
		}

		const response = await axios(config);
		return response.data;
	}

	/**
	 * Get current user information
	 */
	async getCurrentUser(accessToken: string): Promise<SplitwiseUser> {
		const data = await this.makeAuthenticatedRequest(
			"/get_current_user",
			"GET",
			accessToken
		);
		return data.user;
	}

	/**
	 * Update current user information
	 */
	async updateUser(
		accessToken: string,
		userData: UpdateUserRequest,
		userId?: number
	): Promise<{ user: SplitwiseUser }> {
		// API requires a user id in the path: /update_user/{id}
		const id = userId ?? (await this.getCurrentUser(accessToken)).id;
		return this.makeAuthenticatedRequest(
			`/update_user/${id}`,
			"POST",
			accessToken,
			userData
		);
	}

	/**
	 * Get all groups for the current user
	 */
	async getGroups(accessToken: string): Promise<{ groups: SplitwiseGroup[] }> {
		return this.makeAuthenticatedRequest("/get_groups", "GET", accessToken);
	}

	/**
	 * Get a specific group by ID
	 */
	async getGroup(
		accessToken: string,
		groupId: number
	): Promise<SplitwiseGroup> {
		const data = await this.makeAuthenticatedRequest(
			`/get_group/${groupId}`,
			"GET",
			accessToken
		);
		return data.group;
	}

	/**
	 * Create a new group
	 */
	async createGroup(
		accessToken: string,
		groupData: CreateGroupRequest
	): Promise<SplitwiseGroup> {
		const data = await this.makeAuthenticatedRequest(
			"/create_group",
			"POST",
			accessToken,
			groupData
		);
		return data.group;
	}

	/**
	 * Delete a group
	 */
	async deleteGroup(
		accessToken: string,
		groupId: number
	): Promise<boolean> {
		const data = await this.makeAuthenticatedRequest(
			`/delete_group/${groupId}`,
			"POST",
			accessToken
		);
		return data.success;
	}

	/**
	 * Undelete a group
	 */
	async unDeleteGroup(
		accessToken: string,
		groupId: number
	): Promise<boolean> {
		const data = await this.makeAuthenticatedRequest(
			`/undelete_group/${groupId}`,
			"POST",
			accessToken
		);
		return data.success;
	}

	/**
	 * Add a user to a group
	 */
	async addUserToGroup(
		accessToken: string,
		userData: AddUserToGroupRequest
	): Promise<boolean> {
		const inputData: AddUserToGroupRequest = {
			groupId: userData.groupId,
			userEmail: userData.userEmail,
		};
		if (userData.firstName) inputData.firstName = userData.firstName;
		if (userData.lastName) inputData.lastName = userData.lastName;

		const data = await this.makeAuthenticatedRequest(
			`/add_user_to_group`,
			"POST",
			accessToken,
			inputData
		);
		return data.success;
	}

	/**
	 * Remove a user from a group
	 */
	async removeUserFromGroup(
		accessToken: string,
		groupId: number,
		userId: number
	): Promise<boolean> {
		const data = await this.makeAuthenticatedRequest(
			`/remove_user_from_group`,
			"POST",
			accessToken,
			{ group_id: groupId, user_id: userId }
		);
		return data.success;
	}

	/**
	 * Get all friends for the current user
	 */
	async getFriends(
		accessToken: string
	): Promise<{ friends: SplitwiseFriend[] }> {
		return this.makeAuthenticatedRequest("/get_friends", "GET", accessToken);
	}

	/**
	 * Get a specific friend by ID
	 */
	async getFriend(
		accessToken: string,
		friendId: number
	): Promise<SplitwiseFriend> {
		const data = await this.makeAuthenticatedRequest(
			`/get_friend/${friendId}`,
			"GET",
			accessToken
		);
		return data.friend;
	}

	/**
	 * Get a specific expense by ID
	 */
	async getExpense(
		accessToken: string,
		expenseId: number
	): Promise<SplitwiseExpense> {
		const data = await this.makeAuthenticatedRequest(
			`/get_expense/${expenseId}`,
			"GET",
			accessToken
		);
		return data.expense;
	}

	/**
	 * Get expenses with optional filters
	 */
	async getExpenses(
		accessToken: string,
		params?: {
			group_id?: number;
			friend_id?: number;
			dated_after?: string;
			dated_before?: string;
			updated_after?: string;
			updated_before?: string;
			limit?: number;
			offset?: number;
		}
	): Promise<SplitwiseExpense[]> {
		const data = await this.makeAuthenticatedRequest(
			"/get_expenses",
			"GET",
			accessToken,
			params
		);
		return data.expenses;
	}

	/**
	 * Create a new expense
	 */
	async createExpense(
		accessToken: string,
		expenseData: CreateExpenseRequest
	): Promise<SplitwiseExpense> {
		const data = await this.makeAuthenticatedRequest(
			"/create_expense",
			"POST",
			accessToken,
			expenseData
		);
		return data.expense;
	}

	/**
	 * Update an existing expense
	 */
	async updateExpense(
		accessToken: string,
		expenseId: number,
		expenseData: UpdateExpenseRequest
	): Promise<SplitwiseExpense> {
		const data = await this.makeAuthenticatedRequest(
			`/update_expense/${expenseId}`,
			"POST",
			accessToken,
			expenseData
		);
		return data.expense;
	}

	/**
	 * Delete an expense
	 */
	async deleteExpense(
		accessToken: string,
		expenseId: number
	): Promise<boolean> {
		const data = await this.makeAuthenticatedRequest(
			`/delete_expense/${expenseId}`,
			"POST",
			accessToken
		);
		return data.success;
	}

	/**
	 * Undelete an expense
	 */
	async unDeleteExpense(
		accessToken: string,
		expenseId: number
	): Promise<boolean> {
		const data = await this.makeAuthenticatedRequest(
			`/undelete_expense/${expenseId}`,
			"POST",
			accessToken
		);
		return data.success;
	}

	/**
	 * Get notifications for the current user
	 */
	async getNotifications(
		accessToken: string,
		params?: {
			limit?: number;
			offset?: number;
		}
	): Promise<SplitwiseNotification[]> {
		const data = await this.makeAuthenticatedRequest(
			"/get_notifications",
			"GET",
			accessToken,
			params
		);
		return data.notifications;
	}
}
