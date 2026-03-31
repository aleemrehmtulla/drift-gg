type EnvSchema = Record<string, { required: boolean; default?: string }>;

type EnvResult<T extends EnvSchema> = {
  [K in keyof T]: string;
};

export function validateEnv<T extends EnvSchema>(
  schema: T,
  env: Record<string, string | undefined>
): EnvResult<T> {
  const result: Record<string, string> = {};
  const missing: string[] = [];

  for (const [key, config] of Object.entries(schema)) {
    const value = env[key] ?? config.default;
    if (config.required && !value) {
      missing.push(key);
    } else if (value) {
      result[key] = value;
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join("\n")}\n\nCopy .env.example to .env and fill in the values.`
    );
  }

  return result as EnvResult<T>;
}
