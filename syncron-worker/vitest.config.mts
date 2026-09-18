/**
 * DOSYA AMACI: Worker testlerinin (vitest-pool-workers) yapılandırması.
 */

import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				wrangler: { configPath: "./wrangler.jsonc" },
				miniflare: {
					// Üretimde `wrangler secret put SECURITY_IP_SALT` ile verilir; testte
					// sabit bir değer, IP karmasının deterministik doğrulanmasını sağlar.
					bindings: { SECURITY_IP_SALT: "vitest-fixed-salt" },
				},
			},
		},
	},
});
