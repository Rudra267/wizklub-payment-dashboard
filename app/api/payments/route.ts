import { NextRequest, NextResponse } from "next/server";
import { hasDashboardRole, unauthorizedDashboardResponse } from "../auth-utils";

type PaymentRecord = {
  addedOn: string;
  transactionId: string;
  amount: number | string;
  paymentStatus: string;
  productName: string;
};

type RawPaymentRecord = Partial<PaymentRecord> & {
  added_on?: string;
  addedDate?: string;
  date?: string;
  individual_product_name?: string;
  order_id?: string;
  paidAmount?: number | string;
  paid_amount?: number | string;
  paymentAmount?: number | string;
  payment_amount?: number | string;
  transaction_id?: string;
  transactionNo?: string;
  txn_id?: string;
  txnId?: string;
  payment_status?: string;
  razorpay_payment_status?: string;
  status?: string;
  status_name?: string;
  totalAmount?: number | string;
  total_amount?: number | string;
  product_name?: string;
  product_title?: string;
  product?: string;
};

function normalizeRecord(record: RawPaymentRecord): PaymentRecord {
  return {
    addedOn: record.addedOn || record.added_on || record.addedDate || record.date || "",
    amount:
      record.amount ??
      record.paidAmount ??
      record.paid_amount ??
      record.paymentAmount ??
      record.payment_amount ??
      record.totalAmount ??
      record.total_amount ??
      "",
    paymentStatus:
      record.paymentStatus ||
      record.payment_status ||
      record.razorpay_payment_status ||
      record.status_name ||
      record.status ||
      "",
    productName:
      record.productName ||
      record.individual_product_name ||
      record.product_name ||
      record.product_title ||
      record.product ||
      "",
    transactionId:
      record.transactionId ||
      record.transaction_id ||
      record.txnId ||
      record.txn_id ||
      record.transactionNo ||
      record.order_id ||
      ""
  };
}

function extractPayments(payload: unknown): PaymentRecord[] {
  if (Array.isArray(payload)) {
    return payload.map((record) => normalizeRecord(record as RawPaymentRecord));
  }

  if (payload && typeof payload === "object") {
    const objectPayload = payload as {
      data?: unknown;
      payments?: unknown;
      records?: unknown;
      result?: unknown;
    };
    const records =
      objectPayload.data ||
      objectPayload.payments ||
      objectPayload.records ||
      objectPayload.result;

    if (Array.isArray(records)) {
      return records.map((record) => normalizeRecord(record as RawPaymentRecord));
    }
  }

  return [];
}

export async function GET(request: NextRequest) {
  if (!hasDashboardRole(request, ["admin", "wizklub"])) {
    return unauthorizedDashboardResponse();
  }

  const admissionNo = request.nextUrl.searchParams.get("admissionNo")?.trim();

  if (!admissionNo) {
    return NextResponse.json(
      { message: "Admission number is required.", success: false },
      { status: 400 }
    );
  }

  const lookupUrl =
    process.env.PAYMENT_LOOKUP_API_URL ||
    "https://api.srichaitanyaschool.net/v3/grievance-api/get-book-payments";

  try {
    const url = new URL(lookupUrl);
    url.searchParams.set("admission_no", admissionNo);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      },
      method: "GET"
    });
    const payload = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          message:
            (payload && typeof payload === "object" && "message" in payload
              ? String(payload.message)
              : null) || "Payment lookup failed.",
          success: false
        },
        { status: response.status }
      );
    }

    const apiStatus =
      payload && typeof payload === "object" && "status" in payload
        ? Boolean((payload as { status: unknown }).status)
        : true;
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : apiStatus
          ? "Payment data loaded."
          : "Payment lookup failed.";

    return NextResponse.json(
      {
        data: apiStatus ? extractPayments(payload) : [],
        message,
        success: apiStatus
      },
      { status: apiStatus ? 200 : 404 }
    );
  } catch {
    return NextResponse.json(
      { message: "Unable to connect to payment lookup API.", success: false },
      { status: 502 }
    );
  }
}
