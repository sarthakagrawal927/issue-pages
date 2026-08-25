import type { AppBindings } from "../src/types";

declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env extends AppBindings {
      TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
    }
  }
}
