import { Redis } from "@upstash/redis";
import { IRequestTokenState, IUsers } from "../types";

export class RedisGlobalStore {
	private redis: Redis;
	private readonly USERS_PREFIX = "users:";
	private readonly REQUEST_TOKENS_PREFIX = "request_tokens:";

	constructor({ url, token }: { url: string; token: string }) {
		this.redis = new Redis({
			url: url,
			token: token,
		});
	}

	// Users Map equivalent methods
	async setUser(key: string, user: IUsers): Promise<void> {
		try {
			const redisKey = `${this.USERS_PREFIX}${key}`;
			await this.redis.hset(
				redisKey,
				user as unknown as Record<string, unknown>
			);

			// Optional: Set expiration (e.g., 24 hours)
			// await this.redis.expire(redisKey, 24 * 60 * 60);
		} catch (error) {
			console.error("Error setting user:", error);
			throw error;
		}
	}

	async getUser(key: string): Promise<IUsers | undefined> {
		try {
			const redisKey = `${this.USERS_PREFIX}${key}`;
			const userData = await this.redis.hgetall(redisKey);

			if (!userData || Object.keys(userData).length === 0) {
				return undefined;
			}

			return {
				id: (userData.id as string) || "",
				access_token: userData.access_token as string | undefined,
				accessTokenSecret: userData.accessTokenSecret as string | undefined,
				requestToken: userData.requestToken as string | undefined,
				requestTokenSecret: userData.requestTokenSecret as string | undefined,
			} as IUsers;
		} catch (error) {
			console.error("Error getting user:", error);
			throw error;
		}
	}

	async hasUser(key: string): Promise<boolean> {
		try {
			const redisKey = `${this.USERS_PREFIX}${key}`;
			const exists = await this.redis.exists(redisKey);
			return exists === 1;
		} catch (error) {
			console.error("Error checking user existence:", error);
			throw error;
		}
	}

	async deleteUser(key: string): Promise<boolean> {
		try {
			const redisKey = `${this.USERS_PREFIX}${key}`;
			const result = await this.redis.del(redisKey);
			return result > 0;
		} catch (error) {
			console.error("Error deleting user:", error);
			throw error;
		}
	}

	async getAllUsers(): Promise<Map<string, IUsers>> {
		try {
			const pattern = `${this.USERS_PREFIX}*`;
			const keys = await this.redis.keys(pattern);
			const usersMap = new Map<string, IUsers>();

			for (const redisKey of keys) {
				const userData = await this.redis.hgetall(redisKey);
				if (userData && Object.keys(userData).length > 0) {
					const originalKey = redisKey.replace(this.USERS_PREFIX, "");
					usersMap.set(originalKey, {
						id: (userData.id as string) || "",
						access_token: userData.access_token as string | undefined,
						accessTokenSecret: userData.accessTokenSecret as string | undefined,
						requestToken: userData.requestToken as string | undefined,
						requestTokenSecret: userData.requestTokenSecret as
							| string
							| undefined,
					});
				}
			}

			return usersMap;
		} catch (error) {
			console.error("Error getting all users:", error);
			throw error;
		}
	}

	async getUsersSize(): Promise<number> {
		try {
			const pattern = `${this.USERS_PREFIX}*`;
			const keys = await this.redis.keys(pattern);
			return keys.length;
		} catch (error) {
			console.error("Error getting users size:", error);
			throw error;
		}
	}

	async clearUsers(): Promise<void> {
		try {
			const pattern = `${this.USERS_PREFIX}*`;
			const keys = await this.redis.keys(pattern);
			if (keys.length > 0) {
				await this.redis.del(...keys);
			}
		} catch (error) {
			console.error("Error clearing users:", error);
			throw error;
		}
	}

	// Request Tokens State Map equivalent methods
	async setRequestToken(
		key: string,
		tokenState: IRequestTokenState
	): Promise<void> {
		try {
			const redisKey = `${this.REQUEST_TOKENS_PREFIX}${key}`;
			await this.redis.hset(
				redisKey,
				tokenState as unknown as Record<string, unknown>
			);

			// Set expiration for request tokens (e.g., 15 minutes)
			await this.redis.expire(redisKey, 15 * 60);
		} catch (error) {
			console.error("Error setting request token:", error);
			throw error;
		}
	}

	async getRequestToken(key: string): Promise<IRequestTokenState | undefined> {
		try {
			const redisKey = `${this.REQUEST_TOKENS_PREFIX}${key}`;
			const tokenData = await this.redis.hgetall(redisKey);

			if (!tokenData || Object.keys(tokenData).length === 0) {
				return undefined;
			}

			return {
				id: tokenData.id as string,
			};
		} catch (error) {
			console.error("Error getting request token:", error);
			throw error;
		}
	}

	async hasRequestToken(key: string): Promise<boolean> {
		try {
			const redisKey = `${this.REQUEST_TOKENS_PREFIX}${key}`;
			const exists = await this.redis.exists(redisKey);
			return exists === 1;
		} catch (error) {
			console.error("Error checking request token existence:", error);
			throw error;
		}
	}

	async deleteRequestToken(key: string): Promise<boolean> {
		try {
			const redisKey = `${this.REQUEST_TOKENS_PREFIX}${key}`;
			const result = await this.redis.del(redisKey);
			return result > 0;
		} catch (error) {
			console.error("Error deleting request token:", error);
			throw error;
		}
	}

	async getAllRequestTokens(): Promise<Map<string, IRequestTokenState>> {
		try {
			const pattern = `${this.REQUEST_TOKENS_PREFIX}*`;
			const keys = await this.redis.keys(pattern);
			const tokensMap = new Map<string, IRequestTokenState>();

			for (const redisKey of keys) {
				const tokenData = await this.redis.hgetall(redisKey);
				if (tokenData && Object.keys(tokenData).length > 0) {
					const originalKey = redisKey.replace(this.REQUEST_TOKENS_PREFIX, "");
					tokensMap.set(originalKey, { id: tokenData.id as string });
				}
			}

			return tokensMap;
		} catch (error) {
			console.error("Error getting all request tokens:", error);
			throw error;
		}
	}

	async getRequestTokensSize(): Promise<number> {
		try {
			const pattern = `${this.REQUEST_TOKENS_PREFIX}*`;
			const keys = await this.redis.keys(pattern);
			return keys.length;
		} catch (error) {
			console.error("Error getting request tokens size:", error);
			throw error;
		}
	}

	async clearRequestTokens(): Promise<void> {
		try {
			const pattern = `${this.REQUEST_TOKENS_PREFIX}*`;
			const keys = await this.redis.keys(pattern);
			if (keys.length > 0) {
				await this.redis.del(...keys);
			}
		} catch (error) {
			console.error("Error clearing request tokens:", error);
			throw error;
		}
	}

	// Update specific user fields (useful for OAuth flow)
	async updateUser(key: string, updates: Partial<IUsers>): Promise<void> {
		try {
			const redisKey = `${this.USERS_PREFIX}${key}`;
			await this.redis.hset(
				redisKey,
				updates as unknown as Record<string, unknown>
			);
		} catch (error) {
			console.error("Error updating user:", error);
			throw error;
		}
	}

	// Batch operations for better performance
	async setMultipleUsers(users: Map<string, IUsers>): Promise<void> {
		try {
			const pipeline = this.redis.pipeline();

			users.forEach((user, key) => {
				const redisKey = `${this.USERS_PREFIX}${key}`;
				pipeline.hset(redisKey, user as unknown as Record<string, unknown>);
			});

			await pipeline.exec();
		} catch (error) {
			console.error("Error setting multiple users:", error);
			throw error;
		}
	}

	async setMultipleRequestTokens(
		tokens: Map<string, IRequestTokenState>
	): Promise<void> {
		try {
			const pipeline = this.redis.pipeline();

			tokens.forEach((token, key) => {
				const redisKey = `${this.REQUEST_TOKENS_PREFIX}${key}`;
				pipeline.hset(redisKey, token as unknown as Record<string, unknown>);
				pipeline.expire(redisKey, 15 * 60); // 15 minutes expiration
			});

			await pipeline.exec();
		} catch (error) {
			console.error("Error setting multiple request tokens:", error);
			throw error;
		}
	}

	// Close connection - Note: Upstash Redis doesn't require explicit connection closing
	async close(): Promise<void> {
		// No-op for Upstash Redis as it's serverless
	}

	// Get Redis instance for advanced operations
	getRedisInstance(): Redis {
		return this.redis;
	}
}
