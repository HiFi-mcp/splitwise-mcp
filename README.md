# Splitwise MCP Server 🪙🤝

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)]()
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-F38020?style=flat&logo=cloudflare&logoColor=white)](https://splitwise-mcp.hifi.click)

A lightweight Model Context Protocol (MCP) server that provides Splitwise integrations and tools for managing users, groups, friends, expenses and notifications. This project is built for Cloudflare Workers using Durable Objects and exposes OAuth endpoints to authorize Splitwise access.

## 🚀 Deployed Server

**Live URL**: [https://splitwise-mcp.hifi.click](https://splitwise-mcp.hifi.click)

- **MCP Endpoint**: `https://splitwise-mcp.hifi.click/sse`
- **OAuth Authorization**: `https://splitwise-mcp.hifi.click/authorize`

> 💡 **Ready to use**: The server is deployed and ready for integration with Claude Desktop, Cursor, or any MCP-compatible client.

## Table of Contents

- [🚀 Deployed Server](#-deployed-server)
- [About](#about)
- [Features](#features-)
- [Quick Start](#quick-start-)
- [Environment & Configuration](#environment--configuration-)
- [Local Development](#local-development)
- [Endpoints & OAuth Flow](#endpoints--oauth-flow-)
- [Available MCP Tools](#available-mcp-tools-)
- [MCP Inspector — Testing & Development](#mcp-inspector--testing--development-)
- [Usage Examples](#usage-examples-)
- [Security](#security-)
- [Troubleshooting](#troubleshooting-)
- [Interactive Examples](#interactive-examples-)
- [Deployed MCP Server — Preferred for Integrations](#deployed-mcp-server--preferred-for-integrations-)
- [Contributing](#contributing-)
- [License & Contact](#license--contact-)

## About

Splitwise MCP is an MCP server implementation designed to act as a bridge between an MCP client (such as an agent) and Splitwise APIs. It exposes a set of MCP tools to perform actions like creating expenses, managing groups, and retrieving notifications. This repository uses Cloudflare Workers (Wrangler), Durable Objects and a small OAuth provider for Splitwise.

## Features ✨

- Durable Object based MCP agent (MyMCP) for stateful server behavior
- OAuth endpoints for Splitwise integration
- A rich set of MCP tools for user, group, friend, expense and notification management
- TypeScript, Biome for formatting/linting, and Wrangler for local dev & deploy

> 🚨 **Deployed-first recommendation**: This project is intended to be used from a public, deployed MCP server for real integrations (Claude, Cursor, agents). Use local (wrangler dev) only for development and testing. The README below focuses on the deployed-server workflow.

## Quick Start 🚀

### Prerequisites

- Node.js (16+ recommended)
- pnpm (because this repo contains a pnpm-lock.yaml) or npm/yarn
- Wrangler (Cloudflare CLI)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd splitwise-mcp-server

# Install dependencies
pnpm install
```

### Useful Scripts

From package.json:

- `pnpm dev` — run wrangler dev locally
- `pnpm start` — alias to wrangler dev
- `pnpm deploy` — run wrangler deploy to publish to Cloudflare

### Run Locally (Development)

```bash
pnpm dev
# or
pnpm start
```

### Deploy to Cloudflare

```bash
pnpm deploy
```

## Environment & Configuration 🔐

The server expects several environment variables (set these as Wrangler secrets or in your Cloudflare environment):

- `SPLITWISE_CONSUMER_KEY` — Splitwise API consumer key
- `SPLITWISE_CONSUMER_SECRET` — Splitwise API consumer secret
- `SPLITWISE_CALLBACK_URL` — OAuth callback URL for Splitwise
- `BACKEND_URL` — optional backend URL used by the server
- `PHONE_NUMBER` — phone number used by the validate tool (formatted optionally with a +)

### Setting Secrets with Wrangler

```bash
wrangler secret put SPLITWISE_CONSUMER_KEY
wrangler secret put SPLITWISE_CONSUMER_SECRET
wrangler secret put SPLITWISE_CALLBACK_URL
```

### Durable Object Binding

The Durable Object class is `MyMCP`, and in `wrangler.jsonc` a binding called `MCP_OBJECT` is defined. Wrangler will use this when you run local development and when deploying.

## Local Development

Run the development server:

```bash
pnpm dev
```

The server will be available at `http://127.0.0.1:8787` (or the URL shown by Wrangler).

## Endpoints & OAuth Flow 🔁

This project mounts an OAuth provider and MCP API handler with the following routes (as configured in `src/index.ts`):

- `POST /sse` — MCP API handler (server mounted here via `MyMCP.mount("/sse")`) — primary API endpoint for MCP traffic
- `GET /authorize` — Start OAuth authorization with Splitwise
- `POST /register` — Client registration endpoint
- `POST /token` — Token endpoint for exchanging authorization grants

> **Note**: OAuth flows are interactive and usually start by visiting the `/authorize` URL in a browser.

## Available MCP Tools 🧰

The MCP server registers many tools for interacting with Splitwise. Key ones include:

### Server Tools

- `about` — Returns package/about information
- `validate` — Basic server validation (returns phone number formatting)

### User Tools

- `splitwise_get_current_user`
- `splitwise_update_user`

### Group Tools

- `splitwise_get_groups`
- `splitwise_get_group`
- `splitwise_create_group`
- `splitwise_delete_group`
- `splitwise_undelete_group`
- `splitwise_add_user_to_group`
- `splitwise_remove_user_from_group`

### Friend Tools

- `splitwise_get_friends`
- `splitwise_get_friend`

### Expense Tools

- `splitwise_get_expense`
- `splitwise_get_expenses`
- `splitwise_create_expense`
- `splitwise_update_expense`
- `splitwise_delete_expense`
- `splitwise_undelete_expense`

### Notification Tools

- `splitwise_get_notifications`
- `splitwise_check_auth`

Each tool includes input validation via zod (see `src/index.ts` for parameter shapes).

## MCP Inspector — Testing & Development 🧩

The easiest way to test and interact with your deployed MCP server is using the official MCP Inspector tool. This provides a web-based interface to explore and test all available MCP tools.

### Quick Start with MCP Inspector

1. **Ensure your server is deployed and accessible**

   ```bash
   pnpm deploy
   # Note your deployed URL: https://your-deployed-url.workers.dev
   ```

2. **Launch MCP Inspector**

   ```bash
   # Using pnpx (recommended)
   pnpx @modelcontextprotocol/inspector@latest

   # Or using npx
   npx @modelcontextprotocol/inspector@latest

   # Or using bunx
   bunx @modelcontextprotocol/inspector@latest
   ```

3. **Connect to your MCP server**

   - The inspector will open in your browser
   - Enter your server URL: `https://your-deployed-url.workers.dev/sse`
   - The inspector will automatically discover all available tools

4. **Test OAuth flow**
   - First visit `https://your-deployed-url.workers.dev/authorize` to complete Splitwise OAuth
   - Then return to the inspector to test authenticated tools

### Available Tools in Inspector

Once connected, you'll see all available tools including:

**Server Info**

- `about` — Get server information and version
- `validate` — Test server connectivity

**User Management**

- `splitwise_get_current_user` — Get authenticated user details
- `splitwise_update_user` — Update user information

**Group Management**

- `splitwise_get_groups` — List all groups
- `splitwise_create_group` — Create new group
- `splitwise_add_user_to_group` — Add members to group

**Expense Tracking**

- `splitwise_create_expense` — Create new expense
- `splitwise_get_expenses` — List expenses with filters
- `splitwise_update_expense` — Modify existing expense

**Authentication**

- `splitwise_check_auth` — Verify authentication status

### Inspector Benefits

✅ **Visual interface** — No need to craft JSON requests manually  
✅ **Schema validation** — Built-in parameter validation and hints  
✅ **Real-time testing** — Immediate feedback on tool responses  
✅ **Tool discovery** — Automatically lists all available tools  
✅ **Error debugging** — Clear error messages and stack traces

### Example Workflow

1. Start inspector: `pnpx @modelcontextprotocol/inspector@latest`
2. Connect to: `https://your-deployed-url.workers.dev/sse`
3. Test connection with `about` tool
4. Complete OAuth at `/authorize` endpoint
5. Test authenticated tools like `splitwise_get_current_user`
6. Create expenses, manage groups, etc.

### For Production Integrations

After testing with the inspector, use your deployed server with:

**Claude Desktop**

```json
{
	"mcpServers": {
		"splitwise": {
			"command": "node",
			"args": [
				"path/to/mcp-client.js",
				"https://your-deployed-url.workers.dev/sse"
			]
		}
	}
}
```

**Cursor or other MCP clients**

- Configure MCP server URL: `https://your-deployed-url.workers.dev/sse`
- The client will automatically discover and use available tools

**Custom Applications**

```javascript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

const client = new Client({
	name: "your-app",
	version: "1.0.0",
});

// Connect to your deployed server
await client.connect("https://your-deployed-url.workers.dev/sse");
```

> 💡 **Pro tip**: Always test your tools with the MCP Inspector first before integrating with other clients. It's the fastest way to debug issues and understand tool behavior.

## Usage Examples 📝

### Creating an Expense

```json
{
	"tool": "splitwise_create_expense",
	"input": {
		"cost": "20.00",
		"description": "Dinner at restaurant",
		"users": [
			{ "user_id": 123, "paid_share": "10.00", "owed_share": "10.00" },
			{ "user_id": 456, "paid_share": "10.00", "owed_share": "10.00" }
		]
	}
}
```

### Getting Current User Info

```json
{
	"tool": "splitwise_get_current_user",
	"input": {}
}
```

### Creating a Group

```json
{
	"tool": "splitwise_create_group",
	"input": {
		"name": "Weekend Trip",
		"type": "trip"
	}
}
```

### Getting Expenses with Filters

```json
{
	"tool": "splitwise_get_expenses",
	"input": {
		"group_id": 123,
		"limit": 10,
		"dated_after": "2024-01-01"
	}
}
```

## Security 🔒

- All Splitwise API calls use OAuth 2.0
- Secrets are stored as Wrangler/Cloudflare environment variables
- Redis connections use authenticated tokens
- No sensitive data is logged in production

## Troubleshooting 🔧

### OAuth Redirect Issues

- Ensure `SPLITWISE_CALLBACK_URL` matches exactly what's configured in your Splitwise app
- Verify the callback URL is publicly accessible

### Redis Connection Errors

- Verify `REDIS_URL` and `REDIS_TOKEN` are correct
- Check Redis instance is accessible from Cloudflare Workers

### MCP Tool Authentication

- Most tools require a valid authenticated user session
- Use the `splitwise_check_auth` tool to verify authentication status
- Complete OAuth flow at `/authorize` endpoint if not authenticated

### Rate Limits

- The server respects Splitwise API rate limits
- If you encounter rate limiting, the server will return appropriate error messages
- Consider implementing client-side retry logic with exponential backoff

## Interactive Examples 🧪

1. **Start local dev server and open the authorize URL in a browser to run the OAuth flow:**

   ```bash
   pnpm dev
   # then open http://127.0.0.1:8787/authorize (or the URL shown by Wrangler)
   ```

2. **Use the about tool via your MCP client to check the server is alive** (MCP client or agent required). The server will respond with a JSON about payload. If you need to test tools manually, consult the MCP client you use (this repo provides the server side). Tools require a valid authenticated user prop for many actions.

## Deployed MCP Server — Preferred for Integrations ✅

You have deployed the MCP server — great. Use the deployed instance as the primary integration target for hosted LLM platforms (Claude, Cursor), external agents, and any production workflows.

### Deployed Server Advantages

- Public, stable URL that works with OAuth redirects and platform integrations
- Durable Object and Redis behave like production (no local environment gaps)
- Easier to share with teammates or third-party LLM platforms without exposing your machine

Typical deployed URL: `https://<your-deployed-subdomain>.workers.dev` (or your custom domain). The MCP API is mounted at `/sse`. OAuth endpoints remain at `/authorize`, `/token`, and `/register`.

### Quick Check (Deployed About Tool)

```bash
curl -X POST "https://your-deployed-url.workers.dev/sse" \
  -H "Content-Type: application/json" \
  -d '{"tool":"about","input":{}}'
```

If you integrate with hosted LLM platforms, point their tool/plugin/interceptor configuration to the deployed `/sse` endpoint or use a small proxy adapter to adapt request envelopes. If that returns an error, consult your MCP client for the exact request envelope. The goal is to reach the deployed `/sse` endpoint with the tool invocation that your client expects.

## Contributing 🤝

Contributions are welcome. Please follow these small guidelines:

- Fork the repo and open a PR
- Run formatting and linting before committing: `pnpm format` and `pnpm lint:fix`
- Make sure TypeScript type checks pass: `pnpm type-check`

### Suggested Low-Risk Improvements

- Add unit tests for the SplitwiseAuthService wrappers
- Add CI to run `pnpm type-check`, `pnpm format --check` and `pnpm lint`
