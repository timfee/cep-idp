export interface Logger {
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
}

export const serverLogger: Logger = {
  info: (message, data) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[INFO] ${message}`, data || '');
    }
  },
  warn: (message, data) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[WARN] ${message}`, data || '');
    }
  },
  error: (message, data) => {
    console.error(`[ERROR] ${message}`, data || '');
  }
};
