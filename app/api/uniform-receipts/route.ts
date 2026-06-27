import { NextRequest, NextResponse } from "next/server";
import { hasDashboardRole, unauthorizedDashboardResponse } from "../auth-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UniformPaymentsPayload = {
  count?: unknown;
  data?: unknown;
  message?: unknown;
  status?: unknown;
};

type ReceiptPathPayload = {
  receipt_path?: unknown;
};

type ZipEntry = {
  data: Buffer;
  name: string;
};

type ReceiptFailure = {
  reason: string;
  transactionId: string;
};

const DEFAULT_UNIFORM_PAYMENT_IDS_API =
  "https://api.srichaitanyaschool.net/v3/grievance-api/uniform-payments-bydates";
const DEFAULT_UNIFORM_RECEIPT_API =
  "http://192.168.0.6/varna_api/uniform_online_receipt_pdf.php";
const DEFAULT_UNIFORM_RECEIPT_LOOKUP_API =
  "https://srichaitanyaschool.net/uniform-payments/check-uniform-sales-payment-razorpay";
const RECEIPT_TOKEN = "chaitanya";
const DEFAULT_RECEIPT_FETCH_TIMEOUT_MS = 15_000;
const DEFAULT_RECEIPT_DOWNLOAD_CONCURRENCY = 12;

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

function writeUInt16(value: number) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value, 0);
  return buffer;
}

function writeUInt32(value: number) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0, 0);
  return buffer;
}

function getDosDateParts(date = new Date()) {
  const time =
    (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = Math.max(date.getFullYear() - 1980, 0);

  return {
    date: (year << 9) | (month << 5) | day,
    time
  };
}

function getCrc32(data: Buffer) {
  let crc = 0xffffffff;

  for (const byte of data) {
    crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function sanitizeFilename(value: string) {
  return value.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").slice(0, 150);
}

function makeUniqueName(name: string, usedNames: Set<string>) {
  const normalized = sanitizeFilename(name) || "receipt.pdf";

  if (!usedNames.has(normalized)) {
    usedNames.add(normalized);
    return normalized;
  }

  const dotIndex = normalized.lastIndexOf(".");
  const base = dotIndex > 0 ? normalized.slice(0, dotIndex) : normalized;
  const extension = dotIndex > 0 ? normalized.slice(dotIndex) : "";
  let counter = 2;

  while (usedNames.has(`${base}-${counter}${extension}`)) {
    counter += 1;
  }

  const uniqueName = `${base}-${counter}${extension}`;
  usedNames.add(uniqueName);
  return uniqueName;
}

function createZip(entries: ZipEntry[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  const { date, time } = getDosDateParts();
  let offset = 0;

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name);
    const crc = getCrc32(entry.data);
    const localHeader = Buffer.concat([
      writeUInt32(0x04034b50),
      writeUInt16(20),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(time),
      writeUInt16(date),
      writeUInt32(crc),
      writeUInt32(entry.data.length),
      writeUInt32(entry.data.length),
      writeUInt16(nameBuffer.length),
      writeUInt16(0),
      nameBuffer
    ]);

    localParts.push(localHeader, entry.data);

    centralParts.push(
      Buffer.concat([
        writeUInt32(0x02014b50),
        writeUInt16(20),
        writeUInt16(20),
        writeUInt16(0),
        writeUInt16(0),
        writeUInt16(time),
        writeUInt16(date),
        writeUInt32(crc),
        writeUInt32(entry.data.length),
        writeUInt32(entry.data.length),
        writeUInt16(nameBuffer.length),
        writeUInt16(0),
        writeUInt16(0),
        writeUInt16(0),
        writeUInt16(0),
        writeUInt32(0),
        writeUInt32(offset),
        nameBuffer
      ])
    );

    offset += localHeader.length + entry.data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = Buffer.concat([
    writeUInt32(0x06054b50),
    writeUInt16(0),
    writeUInt16(0),
    writeUInt16(entries.length),
    writeUInt16(entries.length),
    writeUInt32(centralDirectory.length),
    writeUInt32(offset),
    writeUInt16(0)
  ]);

  return Buffer.concat([...localParts, centralDirectory, endRecord]);
}

function extractTransactionIds(payload: UniformPaymentsPayload) {
  if (!Array.isArray(payload.data)) {
    return [];
  }

  return Array.from(
    new Set(
      payload.data
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    )
  );
}

function normalizeTransactionId(value: string) {
  return value.trim().replace(/^ONLINE_/i, "");
}

function normalizeTransactionIds(value: unknown) {
  const rawIds = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\s,;]+/)
      : [];

  return Array.from(
    new Set(
      rawIds
        .map((item) => (typeof item === "string" ? normalizeTransactionId(item) : ""))
        .filter(Boolean)
    )
  );
}

async function readJson(response: Response) {
  return (await response.json().catch(() => null)) as unknown;
}

function readPositiveInteger(value: string | undefined, fallback: number, max: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(Math.floor(parsed), max);
}

async function fetchWithTimeout(url: URL | string, init: RequestInit = {}) {
  const timeoutMs = readPositiveInteger(
    process.env.UNIFORM_RECEIPT_FETCH_TIMEOUT_MS,
    DEFAULT_RECEIPT_FETCH_TIMEOUT_MS,
    60_000
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: init.signal || controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function mapWithConcurrency<T, U>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<U>
) {
  const results: U[] = [];
  let nextIndex = 0;

  async function worker() {
    for (;;) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= items.length) {
        return;
      }

      results[index] = await mapper(items[index]!);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );

  return results;
}

async function getReceiptPath(transactionId: string) {
  const receiptApiUrl =
    process.env.UNIFORM_RECEIPT_API_URL || DEFAULT_UNIFORM_RECEIPT_API;
  const receiptUrl = new URL(receiptApiUrl);
  receiptUrl.searchParams.set("token", process.env.UNIFORM_RECEIPT_TOKEN || RECEIPT_TOKEN);
  receiptUrl.searchParams.set("online_transaction_no", transactionId);

  const response = await fetchWithTimeout(receiptUrl, {
    headers: {
      Accept: "application/json"
    },
    method: "GET"
  });
  const payload = (await readJson(response)) as ReceiptPathPayload | null;

  if (!response.ok || typeof payload?.receipt_path !== "string") {
    return "";
  }

  return payload.receipt_path.trim();
}

async function triggerUniformReceiptLookup(transactionId: string) {
  const lookupApiUrl =
    process.env.UNIFORM_RECEIPT_LOOKUP_API_URL || DEFAULT_UNIFORM_RECEIPT_LOOKUP_API;
  const lookupUrl = new URL(lookupApiUrl);
  lookupUrl.searchParams.set("transaction_id", transactionId);

  const response = await fetchWithTimeout(lookupUrl, {
    headers: {
      Accept: "application/json"
    },
    method: "GET"
  });
  const text = await response.text().catch(() => "");
  const referenceMatch = text.match(/^\s*(\d+)\s*success/i);

  return {
    receiptReference: referenceMatch?.[1] || "",
    success: response.ok
  };
}

async function downloadPdf(receiptPath: string) {
  const response = await fetchWithTimeout(receiptPath, {
    headers: {
      Accept: "application/pdf,*/*"
    },
    method: "GET"
  });

  if (!response.ok) {
    return null;
  }

  return Buffer.from(await response.arrayBuffer());
}

async function createUniformReceiptZip(transactionIds: string[], label: string) {
  const entries: ZipEntry[] = [];
  const usedNames = new Set<string>();
  const failures: ReceiptFailure[] = [];

  const concurrency = readPositiveInteger(
    process.env.UNIFORM_RECEIPT_DOWNLOAD_CONCURRENCY,
    DEFAULT_RECEIPT_DOWNLOAD_CONCURRENCY,
    25
  );

  await mapWithConcurrency(transactionIds, concurrency, async (transactionId) => {
    try {
      let receiptPath = await getReceiptPath(transactionId);

      if (!receiptPath) {
        const lookupResult = await triggerUniformReceiptLookup(transactionId).catch(
          () => ({ receiptReference: "", success: false })
        );
        receiptPath = await getReceiptPath(transactionId);

        if (!receiptPath && lookupResult.receiptReference) {
          receiptPath = await getReceiptPath(lookupResult.receiptReference);
        }
      }

      if (!receiptPath) {
        failures.push({ reason: "receipt path not found", transactionId });
        return;
      }

      const pdf = await downloadPdf(receiptPath);

      if (!pdf) {
        failures.push({ reason: "PDF download failed", transactionId });
        return;
      }

      const pathName = new URL(receiptPath).pathname.split("/").pop();
      const fileName = makeUniqueName(pathName || `${transactionId}.pdf`, usedNames);
      entries.push({ data: pdf, name: fileName });
    } catch {
      failures.push({ reason: "failed", transactionId });
    }
  });

  if (failures.length) {
    entries.push({
      data: Buffer.from(
        [
          `Uniform receipt download summary for ${label}`,
          `Total transaction IDs: ${transactionIds.length}`,
          `PDFs included: ${entries.length}`,
          "",
          "Skipped receipts:",
          ...failures.map((failure) => `${failure.transactionId}: ${failure.reason}`)
        ].join("\n")
      ),
      name: makeUniqueName("download-summary.txt", usedNames)
    });
  }

  if (!entries.some((entry) => entry.name.toLowerCase().endsWith(".pdf"))) {
    return {
      failures,
      zip: null
    };
  }

  return {
    failures,
    zip: createZip(entries)
  };
}

function createZipResponse(zip: Buffer, fileName: string, failures: ReceiptFailure[]) {
  return new NextResponse(zip, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(zip.length),
      "Content-Type": "application/zip",
      "X-Uniform-Receipt-Failures": Buffer.from(JSON.stringify(failures)).toString(
        "base64"
      )
    }
  });
}

export async function GET(request: NextRequest) {
  if (!hasDashboardRole(request, ["admin", "uniform"])) {
    return unauthorizedDashboardResponse();
  }

  const date = request.nextUrl.searchParams.get("date")?.trim() || "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { message: "Please select a valid receipt date.", success: false },
      { status: 400 }
    );
  }

  const idsApiUrl =
    process.env.UNIFORM_PAYMENT_IDS_API_URL || DEFAULT_UNIFORM_PAYMENT_IDS_API;
  const lookupUrl = new URL(idsApiUrl);
  lookupUrl.searchParams.set("date", date);

  try {
    const idsResponse = await fetch(lookupUrl, {
      headers: {
        Accept: "application/json"
      },
      method: "GET"
    });
    const idsPayload = (await readJson(idsResponse)) as UniformPaymentsPayload | null;

    if (!idsResponse.ok || !idsPayload || idsPayload.status === false) {
      return NextResponse.json(
        {
          message:
            typeof idsPayload?.message === "string"
              ? idsPayload.message
              : "Unable to fetch uniform payment transaction IDs.",
          success: false
        },
        { status: idsResponse.ok ? 404 : idsResponse.status }
      );
    }

    const transactionIds = extractTransactionIds(idsPayload);

    if (!transactionIds.length) {
      return NextResponse.json(
        { message: "No uniform transactions found for this date.", success: false },
        { status: 404 }
      );
    }

    const { failures, zip } = await createUniformReceiptZip(transactionIds, date);

    if (!zip) {
      return NextResponse.json(
        {
          failures,
          message: "No receipt PDFs could be downloaded for this date.",
          success: false
        },
        { status: 502 }
      );
    }

    return createZipResponse(zip, `uniform-receipts-${date}.zip`, failures);
  } catch {
    return NextResponse.json(
      { message: "Unable to download uniform receipts.", success: false },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!hasDashboardRole(request, ["admin", "uniform"])) {
    return unauthorizedDashboardResponse();
  }

  try {
    const payload = (await request.json().catch(() => null)) as {
      transactionIds?: unknown;
    } | null;
    const transactionIds = normalizeTransactionIds(payload?.transactionIds);

    if (!transactionIds.length) {
      return NextResponse.json(
        { message: "Please enter at least one transaction ID.", success: false },
        { status: 400 }
      );
    }

    if (transactionIds.length > 500) {
      return NextResponse.json(
        { message: "Please download up to 500 transaction IDs at a time.", success: false },
        { status: 400 }
      );
    }

    const { failures, zip } = await createUniformReceiptZip(
      transactionIds,
      "selected transaction IDs"
    );

    if (!zip) {
      return NextResponse.json(
        {
          failures,
          message: "No receipt PDFs could be downloaded for these transaction IDs.",
          success: false
        },
        { status: 502 }
      );
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

    return createZipResponse(
      zip,
      `uniform-receipts-transactions-${timestamp}.zip`,
      failures
    );
  } catch {
    return NextResponse.json(
      { message: "Unable to download uniform receipts.", success: false },
      { status: 502 }
    );
  }
}
