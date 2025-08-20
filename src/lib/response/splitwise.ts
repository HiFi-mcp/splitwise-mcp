export interface SplitwiseTokens {
	access_token: string;
	token_type: string;
}

export interface SplitwiseUser {
	id: number;
	first_name: string;
	last_name: string;
	email: string;
	registration_status: string;
	picture: {
		small: string;
		medium: string;
		large: string;
	};
}

export interface SplitwiseGroup {
	id: number;
	name: string;
	group_type: string;
	updated_at: string;
	whiteboard: string;
	group_type_id: number;
	simplify_by_default: boolean;
	members: SplitwiseGroupMember[];
	original_debts: SplitwiseDebt[];
	simplified_debts: SplitwiseDebt[];
	avatar: {
		small: string;
		medium: string;
		large: string;
		original: string;
	};
	custom_avatar: boolean;
	cover_photo: {
		xxlarge: string;
		xlarge: string;
	};
	invite_link: string;
}

export interface SplitwiseGroupMember {
	id: number;
	first_name: string;
	last_name: string;
	email: string;
	registration_status: string;
	picture: {
		small: string;
		medium: string;
		large: string;
	};
	balance: SplitwiseBalance[];
}

export interface SplitwiseBalance {
	currency_code: string;
	amount: string;
}

export interface SplitwiseDebt {
	from: number;
	to: number;
	amount: string;
	currency_code: string;
}

export interface SplitwiseFriend {
	id: number;
	first_name: string;
	last_name: string;
	email: string;
	registration_status: string;
	picture: {
		small: string;
		medium: string;
		large: string;
	};
	groups: SplitwiseGroup[];
	updated_at: string;
	balance: SplitwiseBalance[];
}

export interface SplitwiseExpense {
	id: number;
	group_id: number;
	description: string;
	repeats: boolean;
	repeat_interval: string;
	email_reminder: boolean;
	email_reminder_in_advance: number;
	next_repeat: string;
	details: string;
	comments_count: number;
	payment: boolean;
	cost: string;
	currency_code: string;
	repayments: SplitwiseRepayment[];
	date: string;
	created_at: string;
	updated_at: string;
	deleted_at: string;
	category: SplitwiseCategory;
	receipt: SplitwiseReceipt;
	users: SplitwiseExpenseUser[];
}

export interface SplitwiseExpenseUser {
	user: SplitwiseUser;
	user_id: number;
	paid_share: string;
	owed_share: string;
	net_balance: string;
}

export interface SplitwiseRepayment {
	from: number;
	to: number;
	amount: string;
	currency_code: string;
}

export interface SplitwiseCategory {
	id: number;
	name: string;
	icon: string;
}

export interface SplitwiseReceipt {
	id: number;
	large: string;
	original: string;
}

export interface SplitwiseNotification {
	id: number;
	type: string;
	title: string;
	body: string;
	created_at: string;
	read_at: string;
	related_object_type: string;
	related_object_id: number;
}

export interface CreateGroupRequest {
	name: string;
	group_type?: string;
	simplify_by_default?: boolean;
	whiteboard?: string;
}

export interface UpdateUserRequest {
	first_name?: string;
	last_name?: string;
	email?: string;
	password?: string;
	locale?: string;
	date_format?: string;
	default_currency?: string;
	timezone?: string;
}

export interface CreateExpenseRequest {
	cost: string;
	description: string;
	date?: string;
	currency_code?: string;
	group_id?: number;
	split_equally?: boolean;
	users?: Array<{
		user_id: number;
		paid_share?: string;
		owed_share?: string;
	}>;
	payment?: boolean;
	details?: string;
	category_id?: number;
	receipt?: string;
	repeat_interval?: string;
	email_reminder?: boolean;
	email_reminder_in_advance?: number;
}

export interface UpdateExpenseRequest {
	cost?: string;
	description?: string;
	date?: string;
	currency_code?: string;
	group_id?: number;
	split_equally?: boolean;
	users?: Array<{
		user_id: number;
		paid_share?: string;
		owed_share?: string;
	}>;
	payment?: boolean;
	details?: string;
	category_id?: number;
	receipt?: string;
	repeat_interval?: string;
	email_reminder?: boolean;
	email_reminder_in_advance?: number;
}
