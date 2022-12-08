import { CanActivate, Context, Injectable, Request } from "oak_nest";
import globals from "../globals.ts";

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: Context): boolean {
    return this.validateRequest(context.request);
  }

  validateRequest(req: Request) {
    return req.headers.get("x-spacex-token") === globals.guard_token;
  }
}
