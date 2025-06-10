import { encrypt } from "@/app/lib/auth/crypto";
import { generateAuthUrl, generateState } from "@/app/lib/auth/oauth";
import { PROVIDERS, Provider } from "@/app/lib/workflow/constants";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const provider = url.pathname.split("/").pop() as Provider;

  if (provider !== PROVIDERS.GOOGLE && provider !== PROVIDERS.MICROSOFT) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const state = generateState();
  const baseUrl = url.protocol + "//" + url.host;
  const authUrl = generateAuthUrl(provider, state, baseUrl);

  // Create the redirect response
  const response = NextResponse.redirect(authUrl);

  // Manually set the OAuth state cookie on the response
  const data = { state, provider, timestamp: Date.now() };
  const encrypted = encrypt(JSON.stringify(data));

  // Cookie options
  const isProduction = process.env.NODE_ENV === "production";
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600, // 10 minutes
  };

  // Build cookie string
  let cookieString = `oauth_state=${encrypted}`;
  cookieString += `; Path=${cookieOptions.path}`;
  cookieString += `; Max-Age=${cookieOptions.maxAge}`;
  cookieString += `; SameSite=${cookieOptions.sameSite}`;
  if (cookieOptions.httpOnly) cookieString += `; HttpOnly`;
  if (cookieOptions.secure) cookieString += `; Secure`;

  // Set the cookie header
  response.headers.append("Set-Cookie", cookieString);

  return response;
}
