export interface SiteConfig {
  name: string;
  description: string;
  url: string;
  locale: string;
  creator: {
    name: string;
    supportEmail: string;
  };
}

export * from "./initialization";
export * from "./serverless-readiness";
export * from "./settings";
