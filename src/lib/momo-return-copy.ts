/**
 * Nội dung thân thiện sau khi MoMo redirect về FE (query có thể có resultCode, transId, …).
 * Không hiển thị thuật ngữ kỹ thuật cho khách.
 */
export type MomoReturnVariant = "success" | "pending" | "neutral";

export function getMomoReturnPageCopy(searchParams: URLSearchParams): {
  heading: string;
  paragraphs: string[];
  variant: MomoReturnVariant;
  referenceLine: string | null;
} {
  const resultCode = (searchParams.get("resultCode") ?? searchParams.get("resultcode") ?? "").trim();
  const transId = (searchParams.get("transId") ?? searchParams.get("transid") ?? "").trim();

  const referenceLine =
    transId.length > 0 && transId.length <= 80 && /^[\w.-]+$/.test(transId)
      ? `Mã giao dịch tham chiếu: ${transId}`
      : null;

  if (!resultCode) {
    return {
      heading: "Bạn đã quay lại từ MoMo",
      paragraphs: [
        "Nếu bạn vừa thanh toán xong, đơn hàng sẽ được cập nhật trong giây lát.",
        "Nếu bạn chưa thanh toán hoặc đã thoát giữa chừng, bạn có thể vào giỏ hàng và thử lại.",
      ],
      variant: "neutral",
      referenceLine,
    };
  }

  /* MoMo redirect: 0 / 1000 thường báo giao dịch thành công (tùy phiên bản cổng). */
  if (resultCode === "0" || resultCode === "1000") {
    return {
      heading: "Thanh toán thành công",
      paragraphs: [
        "Cảm ơn bạn đã thanh toán qua MoMo.",
        "Chúng tôi đã ghi nhận thanh toán. Bạn có thể tiếp tục mua sắm hoặc về trang chủ.",
      ],
      variant: "success",
      referenceLine,
    };
  }

  return {
    heading: "Chúng tôi đang xác nhận thanh toán",
    paragraphs: [
      "Thanh toán có thể chưa hoàn tất hoặc đã bị hủy trên ứng dụng MoMo.",
      "Nếu tiền trong ví đã trừ nhưng bạn chưa thấy đơn hàng đúng, vui lòng gọi hotline 1900 0359 — chúng tôi sẽ kiểm tra giúp bạn.",
    ],
    variant: "pending",
    referenceLine,
  };
}
