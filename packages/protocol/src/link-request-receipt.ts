/**
 * Pure link request-receipt status codes (RNS Link.RequestReceipt).
 */

export const LinkRequestReceiptStatus = {
  FAILED: 0x00,
  SENT: 0x01,
  DELIVERED: 0x02,
  RECEIVING: 0x03,
  READY: 0x04
} as const;

export type LinkRequestReceiptStatusValue =
  (typeof LinkRequestReceiptStatus)[keyof typeof LinkRequestReceiptStatus];
