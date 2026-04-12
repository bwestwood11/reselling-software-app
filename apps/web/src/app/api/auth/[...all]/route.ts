import { toNextJsHandler } from "better-auth/next-js";

export async function GET(request: Request): Promise<Response> {
	const { auth } = await import("@repo/auth");
	const { GET: handler } = toNextJsHandler(auth);
	return handler(request);
}

export async function POST(request: Request): Promise<Response> {
	const { auth } = await import("@repo/auth");
	const { POST: handler } = toNextJsHandler(auth);
	return handler(request);
}
