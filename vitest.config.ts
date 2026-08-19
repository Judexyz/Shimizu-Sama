import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      DISCORD_TOKEN: 'fake_token_for_tests',
      DISCORD_CLIENT_ID: 'fake_id_for_tests',
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/test',
    },
  },
});
