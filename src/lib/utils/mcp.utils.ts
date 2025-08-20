export function requirePermission(handler: (request: any, ctx: any) => any) {
	return async (request: any, ctx: any) => {
		// Check if user has the required permission
		const userPermissions = ctx.props.user;
		if (!userPermissions) {
			return {
				content: [{ type: "text", text: `Reauthenticate` }],
				status: 403,
			};
		}

		// If permission check passes, execute the handler
		return handler(request, ctx);
	};
}
