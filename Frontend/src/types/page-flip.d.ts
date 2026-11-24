declare module "page-flip" {
  export type PageFlipState = "user_fold" | "fold_corner" | "flipping" | "read"

  export interface PageFlipEvent<T = unknown> {
    data: T
    object: PageFlip
  }

  export class PageFlip {
    constructor(element: HTMLElement, settings: Record<string, unknown>)
    loadFromHTML(items: NodeListOf<HTMLElement> | HTMLElement[]): void
    updateFromHtml(items: NodeListOf<HTMLElement> | HTMLElement[]): void
    update(): void
    destroy(): void
    clear(): void
    on(event: "flip" | "changeState" | "init" | "update" | "changeOrientation", cb: (e: PageFlipEvent) => void): void
    off(event: string): void
    flipNext(corner?: "top" | "bottom"): void
    flipPrev(corner?: "top" | "bottom"): void
    turnToNextPage(): void
    turnToPrevPage(): void
    turnToPage(page: number): void
    getCurrentPageIndex(): number
    getPageCount(): number
    getState(): PageFlipState
    getUI(): { destroy(): void; clear(): void; updateItems(items: HTMLElement[]): void; update(): void }
  }
}