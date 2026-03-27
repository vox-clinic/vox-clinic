export type {
  MigrationSource,
  MigrationPatient,
  MigrationAppointment,
  MigrationError,
  MigrationErrorSeverity,
  MigrationStats,
  MigrationStatus,
  MigrationPreview,
  MigrationResult,
  MigrationAdapterConfig,
  MigrationAdapterResult,
  MigrationAdapter,
  DeduplicationAction,
  DeduplicationResult,
  MigrationSessionData,
} from "./types"

export {
  startMigration,
  confirmMigration,
  cancelMigration,
  getMigrationHistory,
  autoMapColumns,
} from "./migration-service"
