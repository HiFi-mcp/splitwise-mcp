import OAuth from "oauth-1.0a";
import crypto from "crypto-js";
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
	private oauth: OAuth;
	private readonly baseURL = "https://secure.splitwise.com/api/v3.0";
	private readonly authorizeURL = "https://secure.splitwise.com/authorize";

	constructor(
		private consumerKey: string,
		private consumerSecret: string,
		private callbackURL?: string
	) {
		this.oauth = new OAuth({
			consumer: {
				key: this.consumerKey,
				secret: this.consumerSecret,
			},
			signature_method: "HMAC-SHA1",
			hash_function(base_string, key) {
				return crypto.HmacSHA1(base_string, key).toString(crypto.enc.Base64);
			},
		});
	}

	/**
	 * Step 1: Get Request Token
	 */
	async getRequestToken(): Promise<SplitwiseTokens> {
		try {
			const requestData = {
				url: `${this.baseURL}/get_request_token`,
				method: "POST",
				data: this.callbackURL ? { oauth_callback: this.callbackURL } : {},
			};

			const authHeader = this.oauth.toHeader(this.oauth.authorize(requestData));

			const response = await axios.post(requestData.url, requestData.data, {
				headers: {
					...authHeader,
					"Content-Type": "application/x-www-form-urlencoded",
				},
			});

			// Parse response (format: oauth_token=...&oauth_token_secret=...&oauth_callback_confirmed=true)
			const params = new URLSearchParams(response.data);

			return {
				requestToken: params.get("oauth_token") || undefined,
				requestTokenSecret: params.get("oauth_token_secret") || undefined,
			};
		} catch (error) {
			console.error("Error getting request token:", error);
			throw new Error("Failed to get request token");
		}
	}

	/**
	 * Step 2: Generate Authorization URL
	 */
	getAuthorizationURL(requestToken: string): string {
		return `${this.authorizeURL}?oauth_token=${requestToken}`;
	}

	/**
	 * Step 3: Exchange Request Token for Access Token
	 */
	async getAccessToken(
		requestToken: string,
		requestTokenSecret: string,
		oauthVerifier: string
	): Promise<SplitwiseTokens> {
		try {
			const requestData = {
				url: `${this.baseURL}/get_access_token`,
				method: "POST",
				data: { oauth_verifier: oauthVerifier },
			};

			const token = {
				key: requestToken,
				secret: requestTokenSecret,
			};

			const authHeader = this.oauth.toHeader(
				this.oauth.authorize(requestData, token)
			);

			const response = await axios.post(requestData.url, requestData.data, {
				headers: {
					...authHeader,
					"Content-Type": "application/x-www-form-urlencoded",
				},
			});

			// Parse response
			const params = new URLSearchParams(response.data);

			return {
				accessToken: params.get("oauth_token") || undefined,
				accessTokenSecret: params.get("oauth_token_secret") || undefined,
			};
		} catch (error) {
			console.error("Error getting access token:", error);
			throw new Error("Failed to get access token");
		}
	}

	/**
	 * Make authenticated API requests
	 */
	async makeAuthenticatedRequest<T = any>(
		url: string,
		method: "GET" | "POST" | "PUT" | "DELETE",
		accessToken: string,
		accessTokenSecret: string,
		data?: any
	): Promise<T> {
		try {
			const fullURL = url.startsWith("http") ? url : `${this.baseURL}${url}`;

			// Convert data to form data format for OAuth signature calculation
			let formData = {};
			if (data) {
				if (method === "GET") {
					formData = data;
				} else {
					// For POST/PUT/DELETE, convert to form data
					formData = data;
				}
			}

			const requestData = {
				url: fullURL,
				method,
				data: formData,
			};

			const token = {
				key: accessToken,
				secret: accessTokenSecret,
			};

			const authHeader = this.oauth.toHeader(
				this.oauth.authorize(requestData, token)
			);

			const config: AxiosRequestConfig = {
				method: method.toLowerCase() as any,
				url: fullURL,
				headers: {
					...authHeader,
					"Content-Type": "application/x-www-form-urlencoded",
				},
			};

			if (method !== "GET" && data) {
				// Convert data to form data for POST requests
				const formDataString = new URLSearchParams(data).toString();
				config.data = formDataString;
			} else if (method === "GET" && data) {
				config.params = data;
			}

			const response = await axios(config);
			return response.data;
		} catch (error) {
			console.error("Error making authenticated request:", error);
			throw error;
		}
	}

	/**
	 * Get current user information
	 */
	async getCurrentUser(
		accessToken: string,
		accessTokenSecret: string
	): Promise<{ user: SplitwiseUser }> {
		return this.makeAuthenticatedRequest(
			"/get_current_user",
			"GET",
			accessToken,
			accessTokenSecret
		);
	}

	/**
	 * Update current user information
	 */
	async updateUser(
		accessToken: string,
		accessTokenSecret: string,
		userData: UpdateUserRequest,
		userId?: number
	): Promise<{ user: SplitwiseUser }> {
		// API requires a user id in the path: /update_user/{id}
		const id =
			userId ??
			(await this.getCurrentUser(accessToken, accessTokenSecret)).user.id;
		return this.makeAuthenticatedRequest(
			`/update_user/${id}`,
			"POST",
			accessToken,
			accessTokenSecret,
			userData
		);
	}

	/**
	 * Get all groups for the current user
	 */
	async getGroups(
		accessToken: string,
		accessTokenSecret: string
	): Promise<{ groups: SplitwiseGroup[] }> {
		return this.makeAuthenticatedRequest(
			"/get_groups",
			"GET",
			accessToken,
			accessTokenSecret
		);
	}

	/**
	 * Get a specific group by ID
	 */
	async getGroup(
		accessToken: string,
		accessTokenSecret: string,
		groupId: number
	): Promise<{ group: SplitwiseGroup }> {
		return this.makeAuthenticatedRequest(
			`/get_group/${groupId}`,
			"GET",
			accessToken,
			accessTokenSecret
		);
	}

	/**
	 * Create a new group
	 */
	async createGroup(
		accessToken: string,
		accessTokenSecret: string,
		groupData: CreateGroupRequest
	): Promise<{ group: SplitwiseGroup }> {
		return this.makeAuthenticatedRequest(
			"/create_group",
			"POST",
			accessToken,
			accessTokenSecret,
			groupData
		);
	}

	/**
	 * Delete a group
	 */
	async deleteGroup(
		accessToken: string,
		accessTokenSecret: string,
		groupId: number
	): Promise<{ success: boolean }> {
		return this.makeAuthenticatedRequest(
			`/delete_group/${groupId}`,
			"POST",
			accessToken,
			accessTokenSecret
		);
	}

	/**
	 * Undelete a group
	 */
	async unDeleteGroup(
		accessToken: string,
		accessTokenSecret: string,
		groupId: number
	): Promise<{ success: boolean }> {
		return this.makeAuthenticatedRequest(
			`/undelete_group/${groupId}`,
			"POST",
			accessToken,
			accessTokenSecret
		);
	}

	/**
	 * Add a user to a group
	 */
	async addUserToGroup(
		accessToken: string,
		accessTokenSecret: string,
		userData: AddUserToGroupRequest
	): Promise<{ success: boolean }> {
		const data: AddUserToGroupRequest = { groupId: userData.groupId, userEmail: userData.userEmail };
		if (userData.firstName) data.firstName = userData.firstName;
		if (userData.lastName) data.lastName = userData.lastName;

		return this.makeAuthenticatedRequest(
			`/add_user_to_group`,
			"POST",
			accessToken,
			accessTokenSecret,
			data
		);
	}

	/**
	 * Remove a user from a group
	 */
	async removeUserFromGroup(
		accessToken: string,
		accessTokenSecret: string,
		groupId: number,
		userId: number
	): Promise<{ success: boolean }> {
		return this.makeAuthenticatedRequest(
			`/remove_user_from_group`,
			"POST",
			accessToken,
			accessTokenSecret,
			{ group_id: groupId, user_id: userId }
		);
	}

	/**
	 * Get all friends for the current user
	 */
	async getFriends(
		accessToken: string,
		accessTokenSecret: string
	): Promise<{ friends: SplitwiseFriend[] }> {
		return this.makeAuthenticatedRequest(
			"/get_friends",
			"GET",
			accessToken,
			accessTokenSecret
		);
	}

	/**
	 * Get a specific friend by ID
	 */
	async getFriend(
		accessToken: string,
		accessTokenSecret: string,
		friendId: number
	): Promise<{ friend: SplitwiseFriend }> {
		return this.makeAuthenticatedRequest(
			`/get_friend/${friendId}`,
			"GET",
			accessToken,
			accessTokenSecret
		);
	}

	/**
	 * Get a specific expense by ID
	 */
	async getExpense(
		accessToken: string,
		accessTokenSecret: string,
		expenseId: number
	): Promise<{ expense: SplitwiseExpense }> {
		return this.makeAuthenticatedRequest(
			`/get_expense/${expenseId}`,
			"GET",
			accessToken,
			accessTokenSecret
		);
	}

	/**
	 * Get expenses with optional filters
	 */
	async getExpenses(
		accessToken: string,
		accessTokenSecret: string,
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
	): Promise<{ expenses: SplitwiseExpense[] }> {
		return this.makeAuthenticatedRequest(
			"/get_expenses",
			"GET",
			accessToken,
			accessTokenSecret,
			params
		);
	}

	/**
	 * Create a new expense
	 */
	async createExpense(
		accessToken: string,
		accessTokenSecret: string,
		expenseData: CreateExpenseRequest
	): Promise<{ expense: SplitwiseExpense }> {
		return this.makeAuthenticatedRequest(
			"/create_expense",
			"POST",
			accessToken,
			accessTokenSecret,
			expenseData
		);
	}

	/**
	 * Update an existing expense
	 */
	async updateExpense(
		accessToken: string,
		accessTokenSecret: string,
		expenseId: number,
		expenseData: UpdateExpenseRequest
	): Promise<{ expense: SplitwiseExpense }> {
		return this.makeAuthenticatedRequest(
			`/update_expense/${expenseId}`,
			"POST",
			accessToken,
			accessTokenSecret,
			expenseData
		);
	}

	/**
	 * Delete an expense
	 */
	async deleteExpense(
		accessToken: string,
		accessTokenSecret: string,
		expenseId: number
	): Promise<{ success: boolean }> {
		return this.makeAuthenticatedRequest(
			`/delete_expense/${expenseId}`,
			"POST",
			accessToken,
			accessTokenSecret
		);
	}

	/**
	 * Undelete an expense
	 */
	async unDeleteExpense(
		accessToken: string,
		accessTokenSecret: string,
		expenseId: number
	): Promise<{ success: boolean }> {
		return this.makeAuthenticatedRequest(
			`/undelete_expense/${expenseId}`,
			"POST",
			accessToken,
			accessTokenSecret
		);
	}

	/**
	 * Get notifications for the current user
	 */
	async getNotifications(
		accessToken: string,
		accessTokenSecret: string,
		params?: {
			limit?: number;
			offset?: number;
		}
	): Promise<{ notifications: SplitwiseNotification[] }> {
		return this.makeAuthenticatedRequest(
			"/get_notifications",
			"GET",
			accessToken,
			accessTokenSecret,
			params
		);
	}
}
