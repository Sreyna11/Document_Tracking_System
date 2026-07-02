import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("Cannot preview this file.", { status: 400 });
  }

  try {
    const authHeader = request.headers.get("authorization");
    const headers = { Accept: "*/*" };
    if (authHeader) headers.Authorization = authHeader;

    const response = await fetch(targetUrl, { headers });

    if (!response.ok) {
      return new NextResponse("Cannot preview this file. Please use the Preview button or upload a valid PDF.", {
        status: response.status,
      });
    }

    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/octet-stream",
        "Content-Disposition": response.headers.get("content-disposition") || "inline",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new NextResponse("Cannot preview this file. Please use the Preview button or upload a valid PDF.", {
      status: 500,
    });
  }
}
