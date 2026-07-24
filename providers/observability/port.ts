import type {
  OperationFailureCategory,
  OperationFailureSeverity,
} from "@/modules/operations";

export interface ErrorReport {
  fingerprint: string;
  category: OperationFailureCategory;
  severity: OperationFailureSeverity;
  code: string;
  message: string;
  provider: string | null;
  sourceType: string | null;
  sourceId: string | null;
  occurredAt: string;
  occurrenceCount: number;
}

export interface ErrorReporter {
  readonly name: string;
  report(event: ErrorReport): Promise<void>;
}
