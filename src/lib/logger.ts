type LogLevel = "info" | "warn" | "error" | "debug"

interface LogContext {
  action?: string
  workspaceId?: string
  userId?: string
  entityType?: string
  entityId?: string
  [key: string]: unknown
}

function formatLog(level: LogLevel, message: string, context?: LogContext, error?: unknown) {
  const entry: Record<string, unknown> = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  }
  if (error instanceof Error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    }
  } else if (error !== undefined) {
    entry.error = String(error)
  }
  return JSON.stringify(entry)
}

export const logger = {
  info: (message: string, context?: LogContext) => console.log(formatLog("info", message, context)),
  warn: (message: string, context?: LogContext) => console.warn(formatLog("warn", message, context)),
  error: (message: string, context?: LogContext, error?: unknown) => console.error(formatLog("error", message, context, error)),
  debug: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV === "development") console.debug(formatLog("debug", message, context))
  },
}
