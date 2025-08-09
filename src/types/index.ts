export interface Env {
	SPLITWISE_CONSUMER_KEY?: string;
	SPLITWISE_CONSUMER_SECRET?: string;
	SPLITWISE_CALLBACK_URL?: string;
	BACKEND_URL?: string;
}

export interface IUsers {
	id: string;
	access_token?: string;
	accessTokenSecret?: string;
	requestToken?: string;
	requestTokenSecret?: string;
}
