// Simple logging utility
// In production, can be replaced with Winston, Pino, or Vercel Logs

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: unknown;
  error?: Error;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, data?: unknown, error?: Error): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(data && { data }),
      ...(error && { error: { message: error.message, stack: error.stack } }),
    };
  }

  private log(level: LogLevel, message: string, data?: unknown, error?: Error): void {
    const entry = this.formatMessage(level, message, data, error);
    
    // In development, log to console with colors
    if (process.env.NODE_ENV === 'development') {
      const colors = {
        info: '\x1b[36m', // Cyan
        warn: '\x1b[33m', // Yellow
        error: '\x1b[31m', // Red
        debug: '\x1b[90m', // Gray
      };
      const reset = '\x1b[0m';
      
      console.log(`${colors[level]}[${level.toUpperCase()}]${reset} ${entry.timestamp} - ${message}`);
      if (data) {
        console.log('Data:', data);
      }
      if (error) {
        console.error('Error:', error);
      }
    } else {
      // In production, log as JSON (can be sent to logging service)
      console.log(JSON.stringify(entry));
    }
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: Error, data?: unknown): void {
    this.log('error', message, data, error);
  }

  debug(message: string, data?: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, data);
    }
  }
}

export const logger = new Logger();

