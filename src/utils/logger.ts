import debug from 'debug';

type LogLevel = 'info' | 'warning' | 'error';

type LogData = Record<string, unknown>;

interface LogEntry extends Record<string, unknown> {
  level: LogLevel;
  message: string;
  data?: LogData;
}

export interface Logger {
  log: (entry: LogEntry) => void;
  info: (message: string, data?: LogData) => void;
  warning: (message: string, data?: LogData) => void;
  error: (message: string, error: Error, extraData?: LogData) => void;
}

export function createLogger(namespace: string): Logger {
  const logFunc = debug(namespace);

  function log(entry: LogEntry) {
    logFunc(`${entry.level.toUpperCase()}\t${entry.message}${entry.data ? ' %j' : ''}`, entry.data);
  }

  return {
    log,
    info(message, data) {
      log({
        level: 'info',
        message,
        data,
      });
    },
    warning(message, data) {
      log({
        level: 'warning',
        message,
        data,
      });
    },
    error(message, error, extraData) {
      log({
        level: 'error',
        message,
        data: {
          errorType: error.name,
          errorMessage: error.message,
          stack: error.stack?.toString().split('\n'),
          data: extraData,
        },
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
