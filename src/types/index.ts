export interface Env {
	SPLITWISE_CONSUMER_KEY?: string;
	SPLITWISE_CONSUMER_SECRET?: string;
	SPLITWISE_CALLBACK_URL?: string;
	BACKEND_URL?: string;
	REDIS_URL?: string;
	REDIS_TOKEN?: string;
	PHONE_NUMBER?: string;
}
export interface IUsers {
	id: string;
	access_token?: string;
	accessTokenSecret?: string;
	requestToken?: string;
	requestTokenSecret?: string;
}

export interface AddUserToGroupRequest {
	groupId: number;
	userEmail: string;
	firstName?: string;
	lastName?: string;
}

export interface IRequestTokenState {
	id: string;
}
