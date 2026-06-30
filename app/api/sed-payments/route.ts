import { NextRequest, NextResponse } from "next/server";
import { hasDashboardRole, unauthorizedDashboardResponse } from "../auth-utils";

type RawSedPaymentRecord = {
  added_on?: string;
  admission_no?: string;
  amount?: number | string;
  gateway?: string;
  id?: number | string;
  individual_product_name?: string;
  payment_status?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  status?: number | string;
  student?: number | string;
  transaction_id?: string;
};

function extractSedPayments(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const records = (payload as { data?: unknown }).data;

  if (!Array.isArray(records)) {
    return [];
  }

  return records
    .map((record) => record as RawSedPaymentRecord)
    .filter((record) => record.payment_status === "TXN_SUCCESS")
    .map((record) => ({
      addedOn: record.added_on || "",
      admissionNo: record.admission_no || "",
      amount: record.amount || "",
      gateway: record.gateway || "",
      id: String(record.id || ""),
      productName: record.individual_product_name || "",
      razorpayOrderId: record.razorpay_order_id || "",
      razorpayPaymentId: record.razorpay_payment_id || "",
      status: String(record.status || ""),
      student: String(record.student || ""),
      transactionId: record.transaction_id || ""
    }));
}

export async function GET(request: NextRequest) {
  if (!hasDashboardRole(request, ["admin"])) {
    return unauthorizedDashboardResponse();
  }

  const sedPaymentsUrl =
    process.env.SED_PAYMENTS_API_URL ||
    "https://api.srichaitanyaschool.net/v3/grievance-api/sed-payments";

  try {
    const response = await fetch(sedPaymentsUrl, {
      cache: "no-store",
      headers: {
        Accept: "application/json"
      },
      method: "GET"
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        {
          message:
            payload && typeof payload.message === "string"
              ? payload.message
              : "Unable to fetch SED payments.",
          success: false
        },
        { status: response.status }
      );
    }

    const apiStatus =
      payload && typeof payload === "object" && "status" in payload
        ? Boolean((payload as { status: unknown }).status)
        : true;
    const data = apiStatus ? extractSedPayments(payload) : [];

    return NextResponse.json(
      {
        count: data.length,
        data,
        message:
          payload && typeof payload.message === "string"
            ? payload.message
            : "SED payments loaded.",
        success: apiStatus
      },
      { status: apiStatus ? 200 : 404 }
    );
  } catch {
    return NextResponse.json(
      { message: "Unable to connect to SED payments API.", success: false },
      { status: 502 }
    );
  }
}
