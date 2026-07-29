export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  table: string;
  operation: string;
  payload?: any;
  response?: any;
  durationMs?: number;
  error?: any;
}

export class Logger {
  private static formatTime(): string {
    return new Date().toISOString();
  }

  static log(level: LogLevel, table: string, operation: string, payload?: any, response?: any, durationMs?: number, error?: any): void {
    const timestamp = this.formatTime();
    const prefix = `[FoodAdmin Log ${timestamp}] [${level}] [${table.toUpperCase()}] ${operation}`;
    
    switch (level) {
      case 'INFO':
        console.groupCollapsed(`ℹ️ ${prefix} (${durationMs || 0}ms)`);
        if (payload) console.log('📦 Payload:', payload);
        if (response) console.log('✅ Respuesta:', response);
        console.groupEnd();
        break;

      case 'WARN':
        console.group(`⚠️ ${prefix} (${durationMs || 0}ms)`);
        if (payload) console.log('📦 Payload:', payload);
        if (error) console.warn('⚠️ Alerta/Fallback:', error);
        console.groupEnd();
        break;

      case 'ERROR':
        console.group(`❌ ${prefix} (${durationMs || 0}ms)`);
        if (payload) console.error('📦 Payload enviado:', payload);
        if (error) {
          console.error('🔴 Mensaje:', error.message || error);
          console.error('🔴 Código:', error.code || 'N/A');
          console.error('🔴 Detalles:', error);
          if (error.stack) console.error('🥞 Stack trace:', error.stack);
        }
        console.groupEnd();
        break;

      case 'DEBUG':
        console.groupCollapsed(`🔍 ${prefix}`);
        if (payload) console.log('📦 Payload:', payload);
        if (response) console.log('🔍 Estado interno:', response);
        console.groupEnd();
        break;
    }
  }

  static info(table: string, operation: string, payload?: any, response?: any, durationMs?: number): void {
    this.log('INFO', table, operation, payload, response, durationMs);
  }

  static warn(table: string, operation: string, payload?: any, error?: any, durationMs?: number): void {
    this.log('WARN', table, operation, payload, undefined, durationMs, error);
  }

  static error(table: string, operation: string, payload?: any, error?: any, durationMs?: number): void {
    this.log('ERROR', table, operation, payload, undefined, durationMs, error);
  }

  static debug(table: string, operation: string, payload?: any, response?: any): void {
    this.log('DEBUG', table, operation, payload, response);
  }
}
