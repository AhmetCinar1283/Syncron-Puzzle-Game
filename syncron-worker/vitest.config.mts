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
					// LEADERBOARD_ENABLED: üretimde kapalı (bkz. src/types.ts); testler okuma
					// yüzeyini doğrulayabilsin diye açık. Kapalı durum ayrıca test edilir.
					bindings: { SECURITY_IP_SALT: "vitest-fixed-salt", LEADERBOARD_ENABLED: "true" },
				},
			},
		},
	},
});
