"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { OVERVIEW_COOKIE, expectedOverviewCookieValue } from "@/lib/overviewAuth";

export async function unlockOverviewAction(_prevState: string | undefined, formData: FormData) {
  const expectedPassword = process.env.PUBLIC_OVERVIEW_PASSWORD;
  if (!expectedPassword) return "Public overview access is not configured on this server.";

  const password = formData.get("password");
  if (typeof password !== "string" || password !== expectedPassword) {
    return "Incorrect password.";
  }

  const store = await cookies();
  store.set(OVERVIEW_COOKIE, expectedOverviewCookieValue(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/overview",
  });

  revalidatePath("/overview");
}
