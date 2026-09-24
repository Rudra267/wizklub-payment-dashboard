import { NextRequest, NextResponse } from "next/server";
import { hasDashboardRole, unauthorizedDashboardResponse } from "../auth-utils";

type RawWizklubBookReportRecord = {
  added_on?: string | null;
  admission_no?: string | null;
  branch_name?: string | null;
  id?: number | string | null;
  individual_product_name?: string | null;
  payment_status?: string | null;
  razorpay_payment_id?: string | null;
  request_url?: string | null;
  rownumid?: number | string | null;
  wk_amount?: number | string | null;
  wk_item_id?: number | string | null;
};

type WizklubBookReportRecord = {
  addedOn: string;
  admissionNo: string;
  amount: number;
  branchName: string;
  id: string;
  paymentLink: "Link - 1" | "Link - 2";
  paymentStatus: string;
  productName: string;
  razorpayPaymentId: string;
  requestUrl: string;
  wkItemId: string;
};

const DEFAULT_WIZKLUB_BOOKS_REPORT_URL =
  "https://api.srichaitanyaschool.net/v3/grievance-api/wizklub-books-report-details";

function toAmount(value: number | string | null | undefined) {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));

  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeRequestUrl(value: string | null | undefined) {
  return String(value || "/online-fee-payment").trim() || "/online-fee-payment";
}

function getPaymentLink(requestUrl: string | null | undefined): "Link - 1" | "Link - 2" {
  return normalizeRequestUrl(requestUrl) === "/online-fee-payments" ? "Link - 2" : "Link - 1";
}

function normalizeRecord(record: RawWizklubBookReportRecord): WizklubBookReportRecord {
  const requestUrl = normalizeRequestUrl(record.request_url);

  return {
    addedOn: String(record.added_on || ""),
    admissionNo: String(record.admission_no || ""),
    amount: toAmount(record.wk_amount),
    branchName: String(record.branch_name || ""),
    id: String(record.id || ""),
    paymentLink: getPaymentLink(requestUrl),
    paymentStatus: String(record.payment_status || ""),
    productName: String(record.individual_product_name || ""),
    razorpayPaymentId: String(record.razorpay_payment_id || ""),
    requestUrl,
    wkItemId: String(record.wk_item_id || "")
  };
}

function isSuccessStatus(status: string) {
  return status.trim().toUpperCase() === "TXN_SUCCESS";
}

function getDateKey(value: string) {
  const match = value.match(/^(\d{1,2})-([A-Z]{3})-(\d{2})/i);

  if (!match) {
    return value.split(/\s+/)[0] || "";
  }

  const [, day, monthText, yearText] = match;
  const months: Record<string, string> = {
    APR: "04",
    AUG: "08",
    DEC: "12",
    FEB: "02",
    JAN: "01",
    JUL: "07",
    JUN: "06",
    MAR: "03",
    MAY: "05",
    NOV: "11",
    OCT: "10",
    SEP: "09"
  };
  const month = months[monthText.toUpperCase()];

  return month ? `20${yearText}-${month}-${day.padStart(2, "0")}` : value;
}

function formatDateLabel(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short"
  }).format(date);
}

function compactProductName(value: string) {
  return value.split(",")[0]?.trim() || "Wizklub Book Kit";
}

function buildSummary(records: WizklubBookReportRecord[]) {
  const successfulRecords = records.filter((record) => isSuccessStatus(record.paymentStatus));
  const successfulStudents = new Set(
    successfulRecords.map((record) => record.admissionNo).filter(Boolean)
  );
  const totalCollection = successfulRecords.reduce((sum, record) => sum + record.amount, 0);
  const link1Records = records.filter((record) => record.paymentLink === "Link - 1");
  const link2Records = records.filter((record) => record.paymentLink === "Link - 2");
  const link1Students = new Set(link1Records.map((record) => record.admissionNo).filter(Boolean));
  const link2Students = new Set(link2Records.map((record) => record.admissionNo).filter(Boolean));
  const dailyMap = new Map<string, { date: string; link1: number; link2: number }>();

  for (const record of successfulRecords) {
    const date = getDateKey(record.addedOn);

    if (!date) {
      continue;
    }

    const item = dailyMap.get(date) || { date, link1: 0, link2: 0 };

    if (record.paymentLink === "Link - 2") {
      item.link2 += 1;
    } else {
      item.link1 += 1;
    }

    dailyMap.set(date, item);
  }

  const dailyPayments = Array.from(dailyMap.values())
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-30)
    .map((item) => ({
      ...item,
      label: formatDateLabel(item.date)
    }));

  return {
    averageOrderValue: successfulRecords.length
      ? Math.round((totalCollection / successfulRecords.length) * 100) / 100
      : 0,
    dailyPayments,
    link1: {
      collection: link1Records
        .filter((record) => isSuccessStatus(record.paymentStatus))
        .reduce((sum, record) => sum + record.amount, 0),
      students: link1Students.size,
      transactions: link1Records.length
    },
    link2: {
      collection: link2Records
        .filter((record) => isSuccessStatus(record.paymentStatus))
        .reduce((sum, record) => sum + record.amount, 0),
      students: link2Students.size,
      transactions: link2Records.length
    },
    totalCollection,
    totalPaymentLinks: 2,
    totalStudentsPaid: successfulStudents.size,
    totalTransactions: records.length
  };
}

export async function GET(request: NextRequest) {
  if (!hasDashboardRole(request, ["admin", "wizklub"])) {
    return unauthorizedDashboardResponse();
  }

  const reportUrl =
    process.env.WIZKLUB_BOOKS_REPORT_API_URL || DEFAULT_WIZKLUB_BOOKS_REPORT_URL;
  const maxPages = Number(process.env.WIZKLUB_BOOKS_REPORT_MAX_PAGES || "100");
  const records: WizklubBookReportRecord[] = [];
  const visitedLastIds = new Set<string>();
  let lastId = request.nextUrl.searchParams.get("last_id") || "0";
  let apiCount = 0;

  try {
    for (let page = 0; page < maxPages; page += 1) {
      if (visitedLastIds.has(lastId)) {
        break;
      }

      visitedLastIds.add(lastId);

      const url = new URL(reportUrl);
      url.searchParams.set("last_id", lastId);

      const response = await fetch(url, {
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
                : "Unable to fetch Wizklub report.",
            success: false
          },
          { status: response.status }
        );
      }

      if (!payload || typeof payload !== "object") {
        break;
      }

      const typedPayload = payload as {
        count?: number | string;
        data?: RawWizklubBookReportRecord[];
        message?: string;
        next_last_id?: number | string | null;
        status?: boolean;
      };
      const pageRecords = Array.isArray(typedPayload.data) ? typedPayload.data : [];

      apiCount = Number(typedPayload.count || apiCount) || apiCount;
      records.push(...pageRecords.map(normalizeRecord));

      const nextLastId = String(typedPayload.next_last_id || "").trim();

      if (!typedPayload.status || !pageRecords.length || !nextLastId || nextLastId === lastId) {
        break;
      }

      lastId = nextLastId;
    }

    const summary = buildSummary(records);

    return NextResponse.json({
      apiCount,
      count: records.length,
      data: records,
      message: "Wizklub report loaded.",
      summary,
      success: true
    });
  } catch {
    return NextResponse.json(
      { message: "Unable to connect to Wizklub report API.", success: false },
      { status: 502 }
    );
  }
}
