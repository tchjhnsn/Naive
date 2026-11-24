// Only what design.mjs calls. playwright is optional and not a dependency.
declare module "playwright" {
  interface Page {
    goto(url: string, options: { waitUntil: "networkidle" }): Promise<unknown>;
    evaluate<T>(fn: () => T): Promise<T>;
    screenshot(options: { path: string; fullPage: boolean }): Promise<unknown>;
    close(): Promise<void>;
  }
  interface BrowserContext {
    newPage(): Promise<Page>;
  }
  interface Browser {
    newContext(options: { viewport: { width: number; height: number } }): Promise<BrowserContext>;
    close(): Promise<void>;
  }
  export const chromium: { launch(): Promise<Browser> };
}
