import { exchangeCodeForToken } from "@/app/lib/auth/oauth";
import { validateOAuthState } from "@/app/lib/auth/tokens";
import { encrypt } from "@/app/lib/auth/crypto";
import { setChunkedCookieOnResponse } from "@/app/lib/auth/cookie-utils";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const provider = url.pathname.split("/").pop() as "google" | "microsoft";
  const searchParams = url.searchParams;

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = url.protocol + "//" + url.host;

  // Debug logging for callback URL construction
  console.log(`[OAuth Callback] provider: ${provider}`);
  console.log(`[OAuth Callback] request.url:`, request.url);
  console.log(`[OAuth Callback] baseUrl:`, baseUrl);

  // Compute redirectUri as used in token exchange
  let redirectUri = null;
  try {
    const { getOAuthConfig } = await import("@/app/lib/auth/oauth");
    const config = getOAuthConfig(provider);
    redirectUri = new URL(config.redirectUri, baseUrl).toString();
    console.log(`[OAuth Callback] redirectUri:`, redirectUri);
  } catch (e) {
    console.error(`[OAuth Callback] Failed to compute redirectUri:`, e);
  }

  if (error) {
    return NextResponse.redirect(`${baseUrl}/?error=${error}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/?error=missing_params`);
  }

  // Validate state
  const isValidState = await validateOAuthState(state, provider);
  if (!isValidState) {
    return NextResponse.redirect(`${baseUrl}/?error=invalid_state`);
  }

  try {
    const token = await exchangeCodeForToken(provider, code, baseUrl);
    console.log("[OAuth Callback] Received token for", provider, token);
    
    // Prepare cookie data
    const cookieName = `${provider}_token`;
    const encrypted = encrypt(JSON.stringify(token));
    
    // Cookie options
    const isProduction = process.env.NODE_ENV === "production";
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    };
    
    console.log(`[OAuth Callback] Setting cookie ${cookieName} with options:`, cookieOptions);
    console.log(`[OAuth Callback] Cookie secure flag:`, cookieOptions.secure);
    console.log(`[OAuth Callback] NODE_ENV:`, process.env.NODE_ENV);
    console.log(`[OAuth Callback] Encrypted token size: ${encrypted.length} bytes`);
    
    // Create redirect response
    const response = NextResponse.redirect(`${baseUrl}/`);
    
    // Use chunked cookie setter to handle large tokens
    setChunkedCookieOnResponse(response, cookieName, encrypted, cookieOptions);
    
    console.log("[OAuth Callback] Cookie(s) set for", provider);
    return response;
  } catch (error) {
    console.error("Token exchange failed:", error);
    return NextResponse.redirect(`${baseUrl}/?error=token_exchange_failed`);
  }
}