"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Browser auth client. Same-origin by default — never point this at a
 * different host; the browser must only ever talk to our own API routes.
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
