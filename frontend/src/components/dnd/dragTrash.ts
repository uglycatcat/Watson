export const WATSON_CARD_MIME = "application/x-watson-card";

/** Survives across CardGrid instances; getData() is empty during dragover in most browsers. */
let activeCardDragId: string | null = null;

export function setDragCardId(dt: DataTransfer, cardId: string): void {
  dt.setData(WATSON_CARD_MIME, cardId);
  dt.effectAllowed = "move";
  activeCardDragId = cardId;
}

export function clearDragCardId(): void {
  activeCardDragId = null;
}

export function getDragCardId(dt: DataTransfer): string | null {
  const fromDt = dt.getData(WATSON_CARD_MIME).trim();
  if (fromDt) return fromDt;
  return activeCardDragId;
}

export function isCardDrag(dt: DataTransfer): boolean {
  return Array.from(dt.types).includes(WATSON_CARD_MIME);
}
