import { redirect } from "next/navigation";
import { adminSetup, isLoggedIn, type AdminSetup } from "@/lib/admin/auth";

/** Admin sub-pages: send anyone not logged in (or a site not set up) to /admin. */
export async function requireLogin(): Promise<AdminSetup> {
  const setup = adminSetup();
  if (setup.problems.length > 0 || !(await isLoggedIn())) redirect("/admin");
  return setup;
}
