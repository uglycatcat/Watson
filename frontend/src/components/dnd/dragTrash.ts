export const WATSON_CARD_MIME = "application/x-watson-card";

export function setDragCardId(dt: DataTransfer, cardId: string): void {
  dt.setData(WATSON_CARD_MIME, cardId);
  dt.effectAllowed = "move";
}

export function getDragCardId(dt: DataTransfer): string | null {
  const id = dt.getData(WATSON_CARD_MIME);
  return id.trim() || null;
}

export function isCardDrag(dt: DataTransfer): boolean {
  return Array.from(dt.types).includes(WATSON_CARD_MIME);
}
