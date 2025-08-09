# Splitwise MCP Server

A Model Context Protocol (MCP) server that provides access to Splitwise API functionality through authenticated MCP tools.

## Features

-   **OAuth Authentication**: Secure OAuth 1.0a authentication with Splitwise
-   **Session Management**: Secure session-based authentication for MCP tools
-   **Comprehensive API Coverage**: Full access to Splitwise's user, group, friend, expense, and notification APIs
-   **MCP Integration**: Seamless integration with MCP-compatible clients

## Authentication Flow

The MCP server uses a secure OAuth 1.0a flow with session management:

1. **Start Authentication**: Use `splitwise_authenticate` to begin the OAuth flow
2. **Authorize**: Visit the provided authorization URL in your browser
3. **Complete Authentication**: Use `splitwise_get_access_token` with your OAuth verifier
4. **Get Session ID**: The server returns a session ID for future API calls
5. **Use Tools**: All other tools require the session ID for authentication

## Available MCP Tools

### Authentication Tools

-   `splitwise_authenticate` - Start OAuth authentication flow
-   `splitwise_complete_auth` - Complete authentication with OAuth verifier
-   `splitwise_get_access_token` - Exchange OAuth tokens for access tokens
-   `splitwise_check_auth` - Verify authentication status

### User Management

-   `splitwise_get_current_user` - Get current user information
-   `splitwise_update_user` - Update user profile

### Group Management

-   `splitwise_get_groups` - List all user groups
-   `splitwise_get_group` - Get specific group details
-   `splitwise_create_group` - Create a new group
-   `splitwise_delete_group` - Delete a group
-   `splitwise_undelete_group` - Restore a deleted group
-   `splitwise_add_user_to_group` - Add user to group
-   `splitwise_remove_user_from_group` - Remove user from group

### Friend Management

-   `splitwise_get_friends` - List all friends
-   `splitwise_get_friend` - Get specific friend details

### Expense Management

-   `splitwise_get_expenses` - List expenses with filtering options
-   `splitwise_get_expense` - Get specific expense details
-   `splitwise_create_expense` - Create a new expense
-   `splitwise_update_expense` - Update an existing expense
-   `splitwise_delete_expense` - Delete an expense
-   `splitwise_undelete_expense` - Restore a deleted expense

### Notifications

-   `splitwise_get_notifications` - Get user notifications

## Usage Example

1. **Authenticate**:

    ```
    Use splitwise_authenticate to start the OAuth flow
    ```

2. **Complete Authentication**:

    ```
    Use splitwise_get_access_token with your OAuth verifier
    Store the returned session ID
    ```

3. **Use API Tools**:
    ```
    Use any Splitwise tool with your session ID
    Example: splitwise_get_groups with session_id parameter
    ```

## Environment Variables

Set these environment variables in your Cloudflare Workers configuration:

-   `SPLITWISE_CONSUMER_KEY` - Your Splitwise app consumer key
-   `SPLITWISE_CONSUMER_SECRET` - Your Splitwise app consumer secret
-   `SPLITWISE_CALLBACK_URL` - Your OAuth callback URL

## Security Features

-   **Session-based Authentication**: Tokens are stored securely in server memory
-   **OAuth 1.0a**: Industry-standard OAuth protocol
-   **No Token Exposure**: Access tokens are never returned to clients after initial authentication
-   **Session Validation**: All API calls validate session authenticity

## Development

This project is built with:

-   TypeScript
-   Cloudflare Workers
-   MCP SDK
-   Hono for HTTP routing
-   OAuth provider for authentication

## Deployment

Deploy to Cloudflare Workers using Wrangler:

```bash
npm run deploy
```

## License

MIT License
