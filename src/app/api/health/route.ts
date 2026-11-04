/** DB接続の確認専用。キー・URL・行データ・内部エラーはレスポンスへ含めない。 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  const headers = { "Cache-Control": "no-store" };

  if (!url || !key) {
    return Response.json(
      { status: "unavailable", database: "not_configured" },
      { status: 503, headers },
    );
  }

  try {
    const endpoint = new URL("/rest/v1/live_cameras", url);
    endpoint.searchParams.set("select", "id");
    endpoint.searchParams.set("limit", "1");
    const response = await fetch(endpoint, {
      headers: { apikey: key },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok || !Array.isArray(await response.json())) {
      throw new Error("Database health check failed");
    }

    return Response.json({ status: "ok", database: "connected" }, { headers });
  } catch {
    return Response.json(
      { status: "unavailable", database: "unreachable" },
      { status: 503, headers },
    );
  }
}
