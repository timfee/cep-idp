import { setChunkedCookieOnResponse } from "@/app/lib/cookies/server";
import { encrypt } from "@/app/lib/auth/crypto";
import { exchangeCodeForToken } from "@/app/lib/auth/oauth";
import { validateOAuthState } from "@/app/lib/auth/tokens";
import { WORKFLOW_CONSTANTS, Provider } from "@/app/lib/workflow/constants";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const provider = url.pathname.split("/").pop() as Provider;
  const searchParams = url.searchParams;

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = url.protocol + "//" + url.host;

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
      maxAge: WORKFLOW_CONSTANTS.TOKEN_COOKIE_MAX_AGE,
    };

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
