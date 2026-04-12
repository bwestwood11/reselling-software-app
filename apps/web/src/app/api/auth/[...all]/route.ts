const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? "http://localhost:3001").replace(/\/$/, "");

function buildAuthTarget(request: Request, all: string[]): string {
	const url = new URL(request.url);
	const path = all.join("/");
	return `${API_BASE}/api/auth/${path}${url.search}`;
}

async function proxyAuth(request: Request, all: string[]): Promise<Response> {
	const method = request.method.toUpperCase();
	const target = buildAuthTarget(request, all);
	const headers = new Headers(request.headers);

	// Let fetch set transport-level host details.
	headers.delete("host");

	const init: RequestInit = {
		method,
		headers,
		redirect: "manual",
	};

	if (method !== "GET" && method !== "HEAD") {
		init.body = await request.text();
	}

	const upstream = await fetch(target, init);
	return new Response(upstream.body, {
		status: upstream.status,
		headers: upstream.headers,
	});
}

export async function GET(
	request: Request,
	context: { params: Promise<{ all: string[] }> }
): Promise<Response> {
	const { all } = await context.params;
	return proxyAuth(request, all);
}

export async function POST(
	request: Request,
	context: { params: Promise<{ all: string[] }> }
): Promise<Response> {
	const { all } = await context.params;
	return proxyAuth(request, all);
}
