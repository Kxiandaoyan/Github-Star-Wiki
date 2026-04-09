export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  PARSE_ERROR = 'PARSE_ERROR',
  REPO_NOT_FOUND = 'REPO_NOT_FOUND',
  INVALID_API_KEY = 'INVALID_API_KEY',
  LLM_ERROR = 'LLM_ERROR',
  GIT_ERROR = 'GIT_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export interface ErrorStrategy {
  shouldRetry: boolean;
  delay?: number;
  maxRetries?: number;
  switchApiKey?: boolean;
  skipProject?: boolean;
  priorityAdjust?: number;
}

export class ErrorClassifier {
  static classify(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    // Check for HTTP 5xx server errors before network errors,
    // because server responses like "Internal Network Failure" contain
    // the word "network" but are actually server-side errors.
    if (
      message.includes('http 500')
      || message.includes('http 502')
      || message.includes('http 503')
      || message.includes('http 504')
    ) {
      return ErrorType.SERVER_ERROR;
    }

    if (
      message.includes('econnrefused')
      || message.includes('enotfound')
      || message.includes('etimedout')
      || message.includes('network')
      || message.includes('socket hang up')
      || message.includes('failed to fetch')
    ) {
      return ErrorType.NETWORK_ERROR;
    }

    if (
      message.includes('rate limit')
      || message.includes('429')
      || message.includes('too many requests')
      || message.includes('quota exceeded')
    ) {
      return ErrorType.RATE_LIMIT;
    }

    if (
      message.includes('invalid api key')
      || message.includes('unauthorized')
      || message.includes('authentication failed')
      || message.includes('http 401')
      || message.includes('http 403')
      || message.includes('invalid x-api-key')
    ) {
      return ErrorType.INVALID_API_KEY;
    }

    if (
      message.includes('repository not found')
      || message.includes('http 404')
      || message.includes('not found for ')
      || message.includes('failed to load repository metadata')
    ) {
      return ErrorType.REPO_NOT_FOUND;
    }

    if (
      message.includes('json')
      || message.includes('parse')
      || message.includes('syntax')
      || message.includes('unexpected token')
    ) {
      return ErrorType.PARSE_ERROR;
    }

    if (
      message.includes('llm')
      || message.includes('messages api')
      || message.includes('chat completions api')
      || message.includes('anthropic-compatible api')
    ) {
      return ErrorType.LLM_ERROR;
    }

    if (
      message.includes('git ')
      || message.includes('clone')
      || message.includes('checkout')
    ) {
      return ErrorType.GIT_ERROR;
    }

    return ErrorType.UNKNOWN;
  }

  static getStrategy(errorType: ErrorType): ErrorStrategy {
    const strategies: Record<ErrorType, ErrorStrategy> = {
      [ErrorType.NETWORK_ERROR]: {
        shouldRetry: true,
        delay: 5000,
        maxRetries: 5,
        priorityAdjust: 0,
      },
      [ErrorType.SERVER_ERROR]: {
        shouldRetry: true,
        delay: 15000,
        maxRetries: 5,
        switchApiKey: true,
        priorityAdjust: 5,
      },
      [ErrorType.RATE_LIMIT]: {
        shouldRetry: true,
        delay: 60000,
        maxRetries: 10,
        switchApiKey: true,
        priorityAdjust: 5,
      },
      [ErrorType.INVALID_API_KEY]: {
        shouldRetry: true,
        delay: 0,
        maxRetries: 3,
        switchApiKey: true,
        priorityAdjust: 0,
      },
      [ErrorType.REPO_NOT_FOUND]: {
        shouldRetry: false,
        skipProject: true,
      },
      [ErrorType.PARSE_ERROR]: {
        shouldRetry: true,
        delay: 10000,
        maxRetries: 3,
        priorityAdjust: 10,
      },
      [ErrorType.LLM_ERROR]: {
        shouldRetry: true,
        delay: 30000,
        maxRetries: 3,
        switchApiKey: true,
        priorityAdjust: 5,
      },
      [ErrorType.GIT_ERROR]: {
        shouldRetry: true,
        delay: 10000,
        maxRetries: 3,
        priorityAdjust: 5,
      },
      [ErrorType.UNKNOWN]: {
        shouldRetry: true,
        delay: 30000,
        maxRetries: 2,
        priorityAdjust: 20,
      },
    };

    return strategies[errorType];
  }
}
