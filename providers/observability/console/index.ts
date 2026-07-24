import type {
  ErrorReport,
  ErrorReporter,
} from "@/providers/observability/port";

export const consoleErrorReporter: ErrorReporter = {
  name: "console",
  async report(event: ErrorReport) {
    console.error(
      JSON.stringify({
        type: "operational_failure",
        ...event,
      }),
    );
  },
};
