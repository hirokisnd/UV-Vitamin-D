export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  backoffFactor: number;
  jitterFactor?: number;
  timeoutMs?: number;
  maxDelayMs?: number;
}

export class RetryableError extends Error {
  constructor(message: string, public attempt: number, public originalError: unknown) {
    super(message);
    this.name = "RetryableError";
  }
}

export class NIESApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "NIESApiError";
  }
}

export const niesRetryConfig: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  backoffFactor: 2,
  jitterFactor: 0.2,
  timeoutMs: 10000,
  maxDelayMs: 4000,
};

export async function retryAsync<T>(
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      let result: T;
      if (config.timeoutMs) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Operation timeout")), config.timeoutMs);
        });
        result = await Promise.race([fn(), timeoutPromise]) as T;
      } else {
        result = await fn();
      }
      return result;
    } catch (error) {
      lastError = error as Error;

      // Determine if error is retryable
      const isRetryable =
        error instanceof TypeError ||
        (error instanceof Error && /fetch|timeout|network/i.test(error.message)) ||
        (error as any)?.statusCode >= 500;

      if (!isRetryable || attempt === config.maxAttempts) {
        if (isRetryable && attempt === config.maxAttempts) {
          throw new RetryableError(
            `Max attempts (${config.maxAttempts}) reached`,
            attempt,
            lastError
          );
        }
        if (error instanceof NIESApiError) {
          throw error;
        }
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      let delayMs = config.baseDelayMs * Math.pow(config.backoffFactor, attempt - 1);
      if (config.jitterFactor) {
        const jitter = delayMs * config.jitterFactor * (Math.random() * 2 - 1);
        delayMs = Math.max(0, delayMs + jitter);
      }
      if (config.maxDelayMs) {
        delayMs = Math.min(delayMs, config.maxDelayMs);
      }

      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw new Error("Unexpected exit from retry loop");
}
