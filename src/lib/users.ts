import { IUsers } from "../types";

export let users: Map<string, IUsers> = new Map();

export let requestTokensState: Map<string, { id: string;}> = new Map();
