import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // admin: the English-only event admin lives outside the RO/EN routing.
  matcher: "/((?!api|admin|_next|_vercel|.*\\..*).*)"
};
