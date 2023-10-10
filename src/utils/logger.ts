import debug from 'debug';

// TODO remove comment
//const DEBUG_NAME = 'api-graphql-lambda';

export type LogLevel = 'info' | 'warning' | 'error';

export interface LogEntry extends Record<string, unknown> {
  level: LogLevel;
  message: string;
}

type LogMore = Record<string, unknown>;

export interface Logger {
  log: (entry: LogEntry) => void;
  info: (message: string, more?: LogMore) => void;
  warning: (message: string, more?: LogMore) => void;
  error: (message: string, errror: Error, more?: Record<string, unknown>) => void;
}

export function createLogger(namespace: string): Logger {
  const debugLog = debug(namespace);

  function log(entry: LogEntry) {
    debugLog(entry);
  }

  return {
    log,
    info(message, more) {
      log({
        level: 'info',
        message,
        ...more,
      });
    },
    warning(message, more) {
      log({
        level: 'warning',
        message,
        ...more,
      });
    },
    error(message, error, more) {
      log({
        level: 'error',
        message,
        error,
        ...more,
      });
    },
  };
}

export function emptyLogger(): Logger {
  return {
    log: () => {},
    info: () => {},
    warning: () => {},
    error: () => {},
  };
}
