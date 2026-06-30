"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ElementType, FormEvent, ReactNode } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  BarChart3,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  Copy,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  Filter,
  FileText,
  GraduationCap,
  IndianRupee,
  Info,
  Landmark,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  LogOut,
  MapPin,
  Menu,
  Package,
  RefreshCcw,
  ScanQrCode,
  Search,
  Settings,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  Truck,
  UserRound,
  UserRoundSearch,
  X
} from "lucide-react";
import {
  Area,
  AreaChart,
  Tooltip
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import logoImage from "./assets/logo.png";
import receiptDashboardImage from "./assets/recipt-dash.png";

type Payment = {
  addedOn: string;
  transactionId: string;
  amount: number | string;
  paymentStatus: string;
  productName: string;
};

type LookupState = "idle" | "loading" | "success" | "error";
type VerifyState = "idle" | "loading" | "success" | "error";
type VerifyStepState = "idle" | "loading" | "success" | "error";
type AuthState = "checking" | "loggedIn" | "loggedOut";
type ActiveView =
  | "Wizklub Payments"
  | "Receipt Updates"
  | "Recipts"
  | "Uniform Receipts"
  | "SED Payments"
  | "Table Lookup"
  | "Students"
  | "Book Lists"
  | "Uniform Lists";
type DashboardRole = "admin" | "uniform" | "wizklub";
type UniformReceiptFailure = {
  reason: string;
  transactionId: string;
};

type StatCard = {
  accent: string;
  color: string;
  icon: ElementType;
  label: string;
  subLabel: string;
  value: string;
  data: { value: number }[];
};

const navItems = [
  { icon: LayoutDashboard, label: "Wizklub Payments" },
  { icon: CreditCard, label: "Receipt Updates" },
  { icon: FileText, label: "Uniform Receipts" },
  { badge: "NEW", icon: Landmark, label: "SED Payments" },
  { icon: RefreshCcw, label: "Table Lookup" },
  { icon: BadgeCheck, label: "Refunds" },
  { icon: Landmark, label: "Settlements" },
  { icon: BarChart3, label: "Reports" },
  {
    children: [
      { icon: UserRound, label: "Profile", view: "Students" },
      { icon: Download, label: "Recipts", view: "Recipts" },
      { icon: BookOpen, label: "Book Lists", view: "Book Lists" },
      { icon: Shirt, label: "Uniform Lists", view: "Uniform Lists" }
    ],
    icon: GraduationCap,
    label: "Student Details"
  },
  { icon: Settings, label: "Settings" }
];

function canAccessView(role: DashboardRole | null, label: string) {
  if (role === "admin") {
    return (
      label === "Wizklub Payments" ||
      label === "Receipt Updates" ||
      label === "Recipts" ||
      label === "Uniform Receipts" ||
      label === "SED Payments" ||
      label === "Table Lookup" ||
      label === "Students" ||
      label === "Book Lists" ||
      label === "Uniform Lists"
    );
  }

  if (role === "wizklub") {
    return (
      label === "Wizklub Payments" ||
      label === "Students" ||
      label === "Recipts" ||
      label === "Book Lists"
    );
  }

  if (role === "uniform") {
    return label === "Uniform Receipts";
  }

  return false;
}

function getDefaultViewForRole(role: DashboardRole | null): ActiveView {
  return role === "uniform" ? "Uniform Receipts" : "Wizklub Payments";
}

const chartBase = [
  { value: 2 },
  { value: 3 },
  { value: 5 },
  { value: 8 },
  { value: 12 },
  { value: 16 },
  { value: 17 }
];

function formatAmount(amount: number | string) {
  if (typeof amount === "string" && !amount.trim()) {
    return "Not available";
  }

  const numericAmount =
    typeof amount === "number" ? amount : Number(String(amount).replace(/,/g, ""));

  if (Number.isNaN(numericAmount)) {
    return displayValue(amount);
  }

  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 2,
    style: "currency"
  }).format(numericAmount);
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("success") || normalized.includes("paid")) {
    return "success";
  }

  if (normalized.includes("fail") || normalized.includes("cancel")) {
    return "failed";
  }

  return "pending";
}

function isTxnSuccessStatus(status: string) {
  return status.trim().toUpperCase() === "TXN_SUCCESS";
}

function getPaymentDateKey(addedOn: string) {
  const value = addedOn.trim();

  if (!value) {
    return "";
  }

  const monthNames: Record<string, string> = {
    apr: "04",
    april: "04",
    aug: "08",
    august: "08",
    dec: "12",
    december: "12",
    feb: "02",
    february: "02",
    jan: "01",
    january: "01",
    jul: "07",
    july: "07",
    jun: "06",
    june: "06",
    mar: "03",
    march: "03",
    may: "05",
    nov: "11",
    november: "11",
    oct: "10",
    october: "10",
    sep: "09",
    sept: "09",
    september: "09"
  };

  const textMonthMatch = value.match(/\b(\d{1,2})[-/\s]([a-zA-Z]{3,9})[-/\s](\d{2,4})\b/);

  if (textMonthMatch) {
    const [, day, monthName, yearValue] = textMonthMatch;
    const month = monthNames[monthName.toLowerCase()];
    const year = yearValue.length === 2 ? `20${yearValue}` : yearValue;

    if (month) {
      return `${year}-${month}-${day.padStart(2, "0")}`;
    }
  }

  const yearFirstMatch = value.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);

  if (yearFirstMatch) {
    const [, year, month, day] = yearFirstMatch;

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const dayFirstMatch = value.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/);

  if (dayFirstMatch) {
    const [, day, month, yearValue] = dayFirstMatch;
    const year = yearValue.length === 2 ? `20${yearValue}` : yearValue;

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return value.split(/\s+/)[0]?.toLowerCase() || "";
}

function getPaymentGroupKey(payment: Payment) {
  const dateKey = getPaymentDateKey(payment.addedOn);
  const productKey = payment.productName.trim().replace(/\s+/g, " ").toLowerCase();

  if (!dateKey || !productKey) {
    return "";
  }

  return `${dateKey}|${productKey}`;
}

function normalizePaymentGroupStatuses(paymentRecords: Payment[]) {
  const successfulGroups = new Set(
    paymentRecords
      .filter((payment) => isTxnSuccessStatus(payment.paymentStatus))
      .map((payment) => getPaymentGroupKey(payment))
      .filter(Boolean)
  );

  return paymentRecords.map((payment) => {
    const groupKey = getPaymentGroupKey(payment);

    if (isTxnSuccessStatus(payment.paymentStatus)) {
      return {
        ...payment,
        paymentStatus: "TXN_SUCCESS"
      };
    }

    if (groupKey && successfulGroups.has(groupKey)) {
      return {
        ...payment,
        paymentStatus: "TXN_FAILED"
      };
    }

    return {
      ...payment,
      paymentStatus:
        statusClass(payment.paymentStatus) === "failed" ? "TXN_FAILED" : "TXN_PENDING"
    };
  });
}

function normalizeAdmissionNo(value: string) {
  const withoutSpaces = value.toUpperCase().replace(/\s/g, "");
  const withoutRepeatedPrefix = withoutSpaces.replace(/^(SCS)+/, "");

  return `SCS${withoutRepeatedPrefix}`;
}

const studentAdmissionStorageKey = "wizklub_student_admission_no";
const dashboardLoginStorageKey = "wizklub_dashboard_logged_in";
const expiredSessionMessage = "Your login session expired. Please login again.";

function readStoredAdmissionNo() {
  if (typeof window === "undefined") {
    return "SCS";
  }

  const storedAdmissionNo = window.localStorage.getItem(studentAdmissionStorageKey);

  return storedAdmissionNo ? normalizeAdmissionNo(storedAdmissionNo) : "SCS";
}

function writeStoredAdmissionNo(value: string) {
  const admissionNo = normalizeAdmissionNo(value);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(studentAdmissionStorageKey, admissionNo);
  }

  return admissionNo;
}

function hasStoredDashboardLogin() {
  return (
    typeof window !== "undefined" &&
    window.localStorage.getItem(dashboardLoginStorageKey) === "true"
  );
}

function writeStoredDashboardLogin() {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(dashboardLoginStorageKey, "true");
  }
}

function clearStoredDashboardLogin() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(dashboardLoginStorageKey);
  }
}

function getSingleTransactionId(value: string) {
  return value.match(/ORDS-KIT[a-zA-Z0-9]+/g) || [];
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function waitForMinimumDuration(startedAt: number, minimumMs: number) {
  const remaining = minimumMs - (Date.now() - startedAt);

  if (remaining > 0) {
    await wait(remaining);
  }
}

function toAmountNumber(amount: number | string) {
  const parsed =
    typeof amount === "number" ? amount : Number(String(amount).replace(/,/g, ""));

  return Number.isNaN(parsed) ? 0 : parsed;
}

function displayValue(value: number | string) {
  const text = String(value ?? "").trim();

  return text || "Not available";
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseTransactionIdsInput(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\s,;]+/)
        .map((item) => item.trim().replace(/^ONLINE_/i, ""))
        .filter(Boolean)
    )
  );
}

function normalizeTransactionSearchInput(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\s,;]+/)
        .map((item) => item.trim().replace(/^['"]+|['"]+$/g, ""))
        .filter(Boolean)
    )
  ).join(",");
}

function isPositiveCount(value: string) {
  const count = Number(value);

  return Number.isFinite(count) && count > 0;
}

function readUniformReceiptFailures(response: Response): UniformReceiptFailure[] {
  const encodedFailures = response.headers.get("x-uniform-receipt-failures");

  if (!encodedFailures) {
    return [];
  }

  try {
    const parsed = JSON.parse(window.atob(encodedFailures)) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        if (
          !item ||
          typeof item !== "object" ||
          typeof (item as UniformReceiptFailure).transactionId !== "string"
        ) {
          return null;
        }

        return {
          reason:
            typeof (item as UniformReceiptFailure).reason === "string"
              ? (item as UniformReceiptFailure).reason
              : "failed",
          transactionId: (item as UniformReceiptFailure).transactionId
        };
      })
      .filter((item): item is UniformReceiptFailure => Boolean(item));
  } catch {
    return [];
  }
}

async function downloadZipFromResponse(response: Response, fallbackFileName: string) {
  const blob = await response.blob();
  const contentDisposition = response.headers.get("content-disposition") || "";
  const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  const fileName = fileNameMatch?.[1] || fallbackFileName;
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

function MiniTooltip({
  active,
  payload
}: {
  active?: boolean;
  payload?: Array<{ value?: number | string }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border border-[#00E7B0]/20 bg-[#06162E] px-2 py-1 text-xs font-semibold text-white shadow-lg">
      {payload[0]?.value}
    </div>
  );
}

function AdmissionCapIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.75 8.4 12 4.25l9.25 4.15L12 12.55 2.75 8.4Z"
        fill="currentColor"
      />
      <path
        d="M6.15 10.2v4.4c0 1.45 2.62 3.05 5.85 3.05s5.85-1.6 5.85-3.05v-4.4L12 12.85 6.15 10.2Z"
        fill="currentColor"
        opacity=".72"
      />
      <path
        d="M19.45 9.35v5.1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
      <path
        d="M19.45 16.15a1.05 1.05 0 1 0 0-2.1 1.05 1.05 0 0 0 0 2.1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PaymentDocumentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6.5 3.75h7.2l3.8 3.85v12.65H6.5V3.75Z"
        fill="currentColor"
        opacity=".96"
      />
      <path d="M13.7 3.75V8h3.8" fill="#C8B6FF" opacity=".75" />
      <path
        d="M9.35 11.05h5.3M9.35 14h5.3M9.35 16.95h3.4"
        stroke="#FFFFFF"
        strokeLinecap="round"
        strokeWidth="1.35"
      />
    </svg>
  );
}

function AdmissionInputIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.25 11.1a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M4.75 18.45c.55-2.75 2.45-4.35 5.5-4.35 1.45 0 2.65.36 3.58 1.05"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
      <path
        d="M17.9 6.35v4.1M15.85 8.4h4.1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
      <path
        d="M16.2 17.1h4.2M18.3 15v4.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function VerificationShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 3.35 18.3 5.7v5.55c0 4.1-2.55 7.3-6.3 9.25-3.75-1.95-6.3-5.15-6.3-9.25V5.7L12 3.35Z"
        fill="currentColor"
      />
      <path
        d="m9.15 11.85 1.9 1.9 3.95-4.1"
        stroke="#FFFFFF"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function LogoMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-11 w-11 overflow-hidden rounded-[12px] border border-[#00E7B0]/10">
        <Image
          alt="Wizklub secure payments logo"
          className="scale-[1.55] object-cover"
          fill
          placeholder="blur"
          sizes="44px"
          src={logoImage}
        />
      </div>
      <div>
        <div className="text-[18px] font-bold leading-none text-white">PaySync</div>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#00E7B0]">
          System Dashboard
        </div>
      </div>
    </div>
  );
}

function Sidebar({
  activeView,
  onViewChange,
  role
}: {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  role: DashboardRole | null;
}) {
  const [isStudentsOpen, setIsStudentsOpen] = useState(
    activeView === "Students" ||
      activeView === "Book Lists" ||
      activeView === "Uniform Lists"
  );

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-[280px] overflow-hidden border-r border-white/10 bg-gradient-to-b from-[#02111D] via-[#021725] to-[#041E33] p-4 text-white shadow-[24px_0_70px_rgba(0,0,0,.34)] xl:flex xl:flex-col">
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="px-2 py-3">
          <LogoMark />
        </div>

        <nav className="mt-8 grid gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const children = "children" in item ? item.children ?? [] : [];
            const hasChildren = children.length > 0;
            const isEnabled = hasChildren
              ? children.some((child) => canAccessView(role, child.view))
              : canAccessView(role, item.label);
            const isActive = hasChildren
              ? children.some((child) => child.view === activeView)
              : item.label === activeView;

            return (
              <div className="grid gap-1" key={item.label}>
                <button
                  aria-disabled={!isEnabled}
                  aria-expanded={hasChildren ? isStudentsOpen : undefined}
                  className={cn(
                    "group flex h-[52px] items-center gap-4 rounded-[13px] px-4 text-[15px] font-medium transition duration-200",
                    isActive &&
                      "border border-[#00E7B0]/24 bg-[#00E7B0]/12 text-white shadow-[0_0_28px_rgba(0,231,176,.14),inset_0_1px_0_rgba(255,255,255,.05)] hover:scale-[1.015] hover:bg-[#00E7B0]/14",
                    isEnabled &&
                      !isActive &&
                      "text-[#AFC0D9] hover:scale-[1.015] hover:bg-white/[.04] hover:text-white",
                    !isEnabled &&
                      "cursor-not-allowed text-[#60708A] opacity-50"
                  )}
                  disabled={!isEnabled}
                  onClick={() => {
                    if (!isEnabled) {
                      return;
                    }

                    if (hasChildren) {
                      setIsStudentsOpen((value) => !value);
                      return;
                    }

                    onViewChange(item.label as ActiveView);
                  }}
                  tabIndex={isEnabled ? 0 : -1}
                  type="button"
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition",
                      isActive && "group-hover:scale-105"
                    )}
                  />
                  <span className="min-w-0 flex-1 text-left">{item.label}</span>
                  {"badge" in item ? (
                    <span className="rounded-[5px] bg-[#00E7B0] px-2 py-1 text-[10px] font-black leading-none text-[#02111D]">
                      {item.badge}
                    </span>
                  ) : null}
                  {hasChildren ? (
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition",
                        isStudentsOpen && "rotate-180"
                      )}
                    />
                  ) : null}
                </button>

                {hasChildren && isStudentsOpen ? (
                  <div className="ml-6 grid gap-1 border-l border-white/10 pl-3">
                    {children.map((child) => {
                      const ChildIcon = child.icon;
                      const isChildEnabled = canAccessView(role, child.view);
                      const isChildActive = child.view === activeView;

                      return (
                        <button
                          aria-disabled={!isChildEnabled}
                          className={cn(
                            "flex h-10 items-center gap-3 rounded-[9px] px-3 text-[13px] font-semibold transition",
                            isChildActive &&
                              "bg-[#00E7B0]/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.04)]",
                            isChildEnabled &&
                              !isChildActive &&
                              "text-[#AFC0D9] hover:bg-white/[.04] hover:text-white",
                            !isChildEnabled &&
                              "cursor-not-allowed text-[#60708A] opacity-50"
                          )}
                          disabled={!isChildEnabled}
                          key={child.label}
                          onClick={() => onViewChange(child.view as ActiveView)}
                          tabIndex={isChildEnabled ? 0 : -1}
                          type="button"
                        >
                          <ChildIcon className="h-4 w-4" />
                          {child.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="mt-auto rounded-[10px] border border-[#00E7B0]/14 bg-[rgba(6,18,38,.66)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.07),0_0_32px_rgba(0,231,176,.06)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[9px] bg-[#00E7B0]/10 text-[#00E7B0]">
              <LockKeyhole className="h-5 w-5" strokeWidth={2.6} />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-white">Secure Session</h3>
              <p className="mt-1 text-[12px] text-white/58">Payments console</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-[12px] font-medium text-white/76">
            <div className="flex items-center justify-between rounded-[7px] bg-white/[.04] px-3 py-2">
              <span>Encryption</span>
              <span className="text-[#00E7B0]">Active</span>
            </div>
            <div className="flex items-center justify-between rounded-[7px] bg-white/[.04] px-3 py-2">
              <span>Verification</span>
              <span className="text-[#00E7B0]">Ready</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function MobileHeader({ onMenuOpen }: { onMenuOpen: () => void }) {
  return (
    <>
      <div className="fixed left-4 right-4 top-3 z-40 flex items-center justify-between rounded-[20px] border border-[#00E7B0]/10 bg-[rgba(6,18,38,.94)] p-4 shadow-[0_20px_60px_rgba(0,0,0,.34)] backdrop-blur-xl xl:hidden">
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-11 overflow-hidden rounded-2xl border border-[#00E7B0]/20 shadow-[0_0_30px_rgba(0,231,176,.22)]">
            <Image
              alt="Wizklub secure payments logo"
              className="scale-[1.55] object-cover"
              fill
              placeholder="blur"
              sizes="44px"
              src={logoImage}
            />
          </div>
          <div>
            <div className="text-sm font-bold leading-none text-white">PaySync</div>
            <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.07em] text-[#00E7B0]">
              System Dashboard
            </div>
          </div>
        </div>
        <Button
          aria-label="Open menu"
          className="h-11 w-11"
          onClick={onMenuOpen}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
    </>
  );
}

function MobileSidebar({
  activeView,
  isOpen,
  onClose,
  onViewChange,
  role
}: {
  activeView: ActiveView;
  isOpen: boolean;
  onClose: () => void;
  onViewChange: (view: ActiveView) => void;
  role: DashboardRole | null;
}) {
  const [isStudentsOpen, setIsStudentsOpen] = useState(
    activeView === "Students" ||
      activeView === "Book Lists" ||
      activeView === "Uniform Lists"
  );

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-50 xl:hidden">
          <motion.button
            aria-label="Close menu"
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-[#020817]/72 backdrop-blur-sm"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={onClose}
            type="button"
          />
          <motion.aside
            animate={{ x: 0 }}
            className="absolute inset-y-0 left-0 flex w-[280px] max-w-[86vw] flex-col overflow-hidden border-r border-white/10 bg-gradient-to-b from-[#02111D] via-[#021725] to-[#041E33] p-4 text-white shadow-[24px_0_70px_rgba(0,0,0,.46)]"
            exit={{ x: "-100%" }}
            initial={{ x: "-100%" }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            <div className="relative z-10 flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between px-2 py-3">
                <LogoMark />
                <Button
                  aria-label="Close menu"
                  className="h-10 w-10"
                  onClick={onClose}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <nav className="mt-8 grid gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const children = "children" in item ? item.children ?? [] : [];
                  const hasChildren = children.length > 0;
                  const isEnabled = hasChildren
                    ? children.some((child) => canAccessView(role, child.view))
                    : canAccessView(role, item.label);
                  const isActive = hasChildren
                    ? children.some((child) => child.view === activeView)
                    : item.label === activeView;

                  return (
                    <div className="grid gap-1" key={item.label}>
                      <button
                        aria-disabled={!isEnabled}
                        aria-expanded={hasChildren ? isStudentsOpen : undefined}
                        className={cn(
                          "group flex h-[52px] items-center gap-4 rounded-[13px] px-4 text-[15px] font-medium transition duration-200",
                          isActive &&
                            "border border-[#00E7B0]/24 bg-[#00E7B0]/12 text-white shadow-[0_0_28px_rgba(0,231,176,.14),inset_0_1px_0_rgba(255,255,255,.05)]",
                          isEnabled &&
                            !isActive &&
                            "text-[#AFC0D9] hover:bg-white/[.04] hover:text-white",
                          !isEnabled && "cursor-not-allowed text-[#60708A] opacity-50"
                        )}
                        disabled={!isEnabled}
                        onClick={() => {
                          if (!isEnabled) {
                            return;
                          }

                          if (hasChildren) {
                            setIsStudentsOpen((value) => !value);
                            return;
                          }

                          onViewChange(item.label as ActiveView);
                          onClose();
                        }}
                        tabIndex={isEnabled ? 0 : -1}
                        type="button"
                      >
                        <Icon className="h-5 w-5" />
                        <span className="min-w-0 flex-1 text-left">{item.label}</span>
                        {"badge" in item ? (
                          <span className="rounded-[5px] bg-[#00E7B0] px-2 py-1 text-[10px] font-black leading-none text-[#02111D]">
                            {item.badge}
                          </span>
                        ) : null}
                        {hasChildren ? (
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition",
                              isStudentsOpen && "rotate-180"
                            )}
                          />
                        ) : null}
                      </button>

                      {hasChildren && isStudentsOpen ? (
                        <div className="ml-6 grid gap-1 border-l border-white/10 pl-3">
                          {children.map((child) => {
                            const ChildIcon = child.icon;
                            const isChildEnabled = canAccessView(role, child.view);
                            const isChildActive = child.view === activeView;

                            return (
                              <button
                                aria-disabled={!isChildEnabled}
                                className={cn(
                                  "flex h-10 items-center gap-3 rounded-[9px] px-3 text-[13px] font-semibold transition",
                                  isChildActive &&
                                    "bg-[#00E7B0]/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.04)]",
                                  isChildEnabled &&
                                    !isChildActive &&
                                    "text-[#AFC0D9] hover:bg-white/[.04] hover:text-white",
                                  !isChildEnabled &&
                                    "cursor-not-allowed text-[#60708A] opacity-50"
                                )}
                                disabled={!isChildEnabled}
                                key={child.label}
                                onClick={() => {
                                  onViewChange(child.view as ActiveView);
                                  onClose();
                                }}
                                tabIndex={isChildEnabled ? 0 : -1}
                                type="button"
                              >
                                <ChildIcon className="h-4 w-4" />
                                {child.label}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </nav>

              <div className="mt-auto rounded-[10px] border border-[#00E7B0]/14 bg-[rgba(6,18,38,.66)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.07),0_0_32px_rgba(0,231,176,.06)] backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-[9px] bg-[#00E7B0]/10 text-[#00E7B0]">
                    <LockKeyhole className="h-5 w-5" strokeWidth={2.6} />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-semibold text-white">
                      Secure Session
                    </h3>
                    <p className="mt-1 text-[12px] text-white/58">
                      Payments console
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

function StatCardView({ stat, index }: { index: number; stat: StatCard }) {
  const Icon = stat.icon;
  const cornerGradient =
    index === 0
      ? "radial-gradient(circle at 0% 0%, rgba(0,231,176,.28), transparent 42%)"
      : index === 1
        ? "radial-gradient(circle at 0% 0%, rgba(34,197,94,.25), transparent 42%)"
        : index === 2
          ? "radial-gradient(circle at 0% 0%, rgba(255,77,109,.28), transparent 42%)"
          : "radial-gradient(circle at 0% 0%, rgba(77,111,255,.28), transparent 42%)";
  const edgeGlow =
    index === 0
      ? "0 0 24px rgba(0,231,176,.18)"
      : index === 1
        ? "0 0 24px rgba(34,197,94,.16)"
        : index === 2
          ? "0 0 24px rgba(255,77,109,.18)"
          : "0 0 24px rgba(77,111,255,.18)";

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="group"
      initial={{ opacity: 0, y: 18 }}
      transition={{ delay: index * 0.06, duration: 0.42, ease: "easeOut" }}
      whileHover={{ y: -5 }}
    >
      <Card
        className="relative h-[118px] overflow-hidden rounded-[8px] border-[#2A3A52]/90 bg-[linear-gradient(145deg,rgba(8,20,39,.72),rgba(3,11,24,.56))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.045),0_18px_46px_rgba(0,0,0,.32)] backdrop-blur-xl transition duration-300 group-hover:border-[#3C506E] group-hover:bg-[linear-gradient(145deg,rgba(10,24,46,.78),rgba(4,14,30,.62))]"
        style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,.045), 0 18px 46px rgba(0,0,0,.32), ${edgeGlow}` }}
      >
        <div className="absolute inset-0" style={{ background: cornerGradient }} />
        <div className="absolute inset-0 bg-[#020817]/10" />
        <div className="relative z-10 flex items-start gap-4">
          <div
            className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full text-white shadow-[0_0_26px_rgba(0,231,176,.14)]"
            style={{ background: stat.accent }}
          >
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold leading-none text-white">{stat.label}</p>
            <p className="mt-3 text-[24px] font-bold leading-none text-white">
              {stat.value}
            </p>
            <p className="mt-3 text-[12px] font-normal text-[#8CA3C7]">
              {stat.subLabel}
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 right-0 h-[52px] w-[96px] opacity-80">
          <AreaChart data={stat.data} height={52} width={96}>
            <defs>
              <linearGradient id={`fill-${index}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor={stat.color} stopOpacity={0.24} />
                <stop offset="95%" stopColor={stat.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <Tooltip content={<MiniTooltip />} cursor={false} />
            <Area
              dataKey="value"
              fill={`url(#fill-${index})`}
              stroke={stat.color}
              strokeWidth={2}
              type="monotone"
            />
          </AreaChart>
        </div>
      </Card>
    </motion.div>
  );
}

function SectionHeading({
  description,
  icon,
  iconWrapperClassName,
  title
}: {
  description: string;
  icon: ReactNode;
  iconWrapperClassName?: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          "grid h-[54px] w-[54px] shrink-0 place-items-center rounded-[13px] bg-[#00E7B0]/10 text-[#00E7B0] shadow-[0_0_28px_rgba(0,231,176,.1)]",
          iconWrapperClassName
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="text-[20px] font-semibold leading-tight text-white">{title}</h2>
        <p className="mt-2 text-sm font-normal text-[#8CA3C7]">{description}</p>
      </div>
    </div>
  );
}

function PaymentEmptyState() {
  return (
    <div className="grid min-h-[330px] place-items-center px-6 py-8 text-center">
      <div>
        <div className="relative mx-auto grid h-[118px] w-[118px] place-items-center rounded-full bg-[#0B1728]/88 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]">
          <div className="grid h-[58px] w-[42px] place-items-center rounded-[6px] bg-[#2A3547]/90 text-[#9AA8BC] shadow-[0_14px_30px_rgba(0,0,0,.18)]">
            <div className="grid gap-2">
              <span className="h-[3px] w-6 rounded-full bg-[#A9B4C4]/80" />
              <span className="h-[3px] w-5 rounded-full bg-[#A9B4C4]/60" />
              <span className="h-[3px] w-6 rounded-full bg-[#A9B4C4]/45" />
            </div>
          </div>
          <div className="absolute bottom-7 right-5 rounded-full bg-[#0B1728] p-0.5">
            <Search className="h-10 w-10 text-[#5B62FF]" strokeWidth={2.5} />
          </div>
        </div>
        <h3 className="mt-7 text-[18px] font-semibold text-white">
          No payment data to display
        </h3>
        <p className="mt-3 text-sm font-normal text-[#8CA3C7]">
          Search using admission number to view payment details.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <span className="h-2 w-2 rounded-full bg-[#8B5CF6]" />
          <span className="h-2 w-2 rounded-full bg-[#60708A]" />
          <span className="h-2 w-2 rounded-full bg-[#60708A]" />
        </div>
      </div>
    </div>
  );
}

function PaymentSkeleton() {
  return (
    <div className="grid min-h-[330px] gap-4 p-6">
      {[0, 1, 2, 3].map((item) => (
        <div
          className="grid animate-pulse grid-cols-[1.2fr_1.6fr_.8fr_.8fr] gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
          key={item}
        >
          <span className="h-4 rounded-full bg-white/10" />
          <span className="h-4 rounded-full bg-white/10" />
          <span className="h-4 rounded-full bg-white/10" />
          <span className="h-4 rounded-full bg-white/10" />
        </div>
      ))}
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const displayedStatus = status.trim() || "TXN_PENDING";

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize",
        statusClass(displayedStatus) === "success" &&
          "bg-[#22C55E]/12 text-[#22C55E]",
        statusClass(displayedStatus) === "failed" &&
          "bg-[#FF4D6D]/12 text-[#FF4D6D]",
        statusClass(displayedStatus) === "pending" &&
          "bg-[#FFC857]/12 text-[#FFC857]"
      )}
    >
      {displayedStatus}
    </span>
  );
}

function TransactionCopyButton({
  copiedTransactionId,
  onCopy,
  transactionId
}: {
  copiedTransactionId: string;
  onCopy: (value: string) => void;
  transactionId: string;
}) {
  const displayedTransactionId = displayValue(transactionId);
  const canCopy = Boolean(transactionId.trim());

  return (
    <button
      className="group relative inline-flex min-w-0 max-w-full items-center gap-2 text-left font-semibold text-[#4D6FFF] disabled:cursor-default disabled:text-[#8CA3C7]"
      disabled={!canCopy}
      onClick={() => onCopy(transactionId)}
      type="button"
    >
      <span className="min-w-0 break-all">{displayedTransactionId}</span>
      {canCopy ? (
        <Copy className="h-4 w-4 shrink-0 opacity-70 transition group-hover:opacity-100" />
      ) : null}
      {canCopy ? (
        <span className="pointer-events-none absolute -top-10 left-0 z-20 hidden rounded-[7px] border border-[#4D6FFF]/20 bg-[#06162E] px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-[0_12px_28px_rgba(0,0,0,.32)] transition duration-150 group-hover:translate-y-[-2px] group-hover:opacity-100 sm:block">
          {copiedTransactionId === transactionId ? "Copied" : "Click to copy"}
        </span>
      ) : null}
      <span className="sr-only">
        {copiedTransactionId === transactionId ? "Copied" : "Copy transaction ID"}
      </span>
    </button>
  );
}

function PaymentDetailItem({
  children,
  label
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="min-w-0 rounded-[6px] border border-white/8 bg-[#07172D]/70 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8CA3C7]">
        {label}
      </p>
      <div className="mt-1 text-sm font-semibold leading-5 text-white">{children}</div>
    </div>
  );
}

function PaymentRecords({
  copiedTransactionId,
  onCopyTransactionId,
  payments
}: {
  copiedTransactionId: string;
  onCopyTransactionId: (value: string) => void;
  payments: Payment[];
}) {
  return (
    <div className="mt-6 px-4 pb-5 sm:px-7 sm:pb-6">
      <div className="grid gap-3 md:hidden">
        {payments.map((payment) => (
          <article
            className="rounded-[8px] border border-white/8 bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.035)]"
            key={`${payment.transactionId}-${payment.addedOn}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8CA3C7]">
                  Transaction ID
                </p>
                <div className="mt-1 text-sm">
                  <TransactionCopyButton
                    copiedTransactionId={copiedTransactionId}
                    onCopy={onCopyTransactionId}
                    transactionId={payment.transactionId}
                  />
                </div>
              </div>
              <PaymentStatusBadge status={payment.paymentStatus} />
            </div>

            <div className="mt-4 grid gap-3">
              <PaymentDetailItem label="Added On">
                {displayValue(payment.addedOn)}
              </PaymentDetailItem>
              <PaymentDetailItem label="Amount">
                {formatAmount(payment.amount)}
              </PaymentDetailItem>
              <PaymentDetailItem label="Product">
                <span className="break-words">{displayValue(payment.productName)}</span>
              </PaymentDetailItem>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-separate border-spacing-y-3">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#8CA3C7]">
              <th className="px-4 py-2">Added On</th>
              <th className="px-4 py-2">Transaction ID</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Product</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr
                className="rounded-2xl bg-white/5 text-sm text-white transition hover:bg-white/8"
                key={`${payment.transactionId}-${payment.addedOn}`}
              >
                <td className="rounded-l-2xl px-4 py-4">
                  {displayValue(payment.addedOn)}
                </td>
                <td className="px-4 py-4">
                  <TransactionCopyButton
                    copiedTransactionId={copiedTransactionId}
                    onCopy={onCopyTransactionId}
                    transactionId={payment.transactionId}
                  />
                </td>
                <td className="px-4 py-4 font-bold">{formatAmount(payment.amount)}</td>
                <td className="px-4 py-4">
                  <PaymentStatusBadge status={payment.paymentStatus} />
                </td>
                <td className="max-w-[220px] rounded-r-2xl px-4 py-4">
                  <span className="block break-words">
                    {displayValue(payment.productName)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const paymentLookupCards = [
  {
    border: "border-[#00E7B0]/45",
    button: "from-[#009F78] to-[#00856D] shadow-[0_0_34px_rgba(0,231,176,.16)]",
    description: "Fetch admission update payment details.",
    focus: "focus:border-[#00E7B0]/60 focus:shadow-[0_0_0_4px_rgba(0,231,176,.10)]",
    icon: GraduationCap,
    iconBg: "from-[#00C99A] to-[#008E78]",
    key: "admission",
    title: "Admission Update"
  },
  {
    border: "border-[#315EFF]/62",
    button: "from-[#314BFF] to-[#1E32D9] shadow-[0_0_34px_rgba(49,94,255,.18)]",
    description: "Fetch exam fee and other miscellaneous receipt details.",
    focus: "focus:border-[#315EFF]/65 focus:shadow-[0_0_0_4px_rgba(49,94,255,.12)]",
    icon: FileText,
    iconBg: "from-[#315EFF] to-[#1F39D6]",
    key: "exam",
    title: "Exam / Other Receipt"
  },
  {
    border: "border-[#8B3FD8]/62",
    button: "from-[#8C39D5] to-[#6928AC] shadow-[0_0_34px_rgba(139,92,246,.18)]",
    description: "Fetch uniform purchase receipt details.",
    focus: "focus:border-[#8B3FD8]/65 focus:shadow-[0_0_0_4px_rgba(139,92,246,.12)]",
    icon: Shirt,
    iconBg: "from-[#9C4CE0] to-[#6728A6]",
    key: "uniform",
    title: "Uniform Receipt"
  },
  {
    border: "border-[#D88912]/62",
    button: "from-[#D88912] to-[#BC6E08] shadow-[0_0_34px_rgba(216,137,18,.18)]",
    description: "Fetch tuition, bus, and pocket money payment details.",
    focus: "focus:border-[#D88912]/65 focus:shadow-[0_0_0_4px_rgba(216,137,18,.12)]",
    icon: IndianRupee,
    iconBg: "from-[#F5A623] to-[#D88912]",
    key: "tuition",
    title: "Tuition / Bus / Pocket Money"
  }
];

function PaymentLookupView() {
  type TuitionProvider = "razorpay" | "cashfree" | "grayquest";

  const [admissionTransactionId, setAdmissionTransactionId] = useState("");
  const [admissionLookupState, setAdmissionLookupState] =
    useState<LookupState>("idle");
  const [admissionLookupMessage, setAdmissionLookupMessage] = useState("");
  const [examTransactionId, setExamTransactionId] = useState("");
  const [examLookupState, setExamLookupState] = useState<LookupState>("idle");
  const [examLookupMessage, setExamLookupMessage] = useState("");
  const [uniformTransactionId, setUniformTransactionId] = useState("");
  const [uniformLookupState, setUniformLookupState] =
    useState<LookupState>("idle");
  const [uniformLookupMessage, setUniformLookupMessage] = useState("");
  const [tuitionProvider, setTuitionProvider] =
    useState<TuitionProvider>("razorpay");
  const [tuitionIds, setTuitionIds] = useState("");
  const [tuitionLookupState, setTuitionLookupState] =
    useState<LookupState>("idle");
  const [tuitionLookupMessage, setTuitionLookupMessage] = useState("");

  async function handleAdmissionLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const transactionId = admissionTransactionId.trim();

    if (!transactionId) {
      setAdmissionLookupState("error");
      setAdmissionLookupMessage("Please enter a transaction ID.");
      return;
    }

    setAdmissionLookupState("loading");
    setAdmissionLookupMessage("Checking admission payment. Please wait.");

    try {
      const response = await fetch("/api/payment-lookup/admission", {
        body: JSON.stringify({ transactionId }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const result = await response.json().catch(() => null);
      const message =
        result && typeof result.message === "string"
          ? result.message
          : response.ok
            ? "Admission payment fetched successfully."
            : "Admission payment lookup failed.";

      if (!response.ok || !result?.success) {
        throw new Error(message);
      }

      setAdmissionLookupState("success");
      setAdmissionLookupMessage(message);
    } catch (error) {
      setAdmissionLookupState("error");
      setAdmissionLookupMessage(
        error instanceof Error ? error.message : "Admission payment lookup failed."
      );
    }
  }

  async function handleExamLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const transactionId = examTransactionId.trim();

    if (!transactionId) {
      setExamLookupState("error");
      setExamLookupMessage("Please enter a transaction ID.");
      return;
    }

    setExamLookupState("loading");
    setExamLookupMessage("Checking exam / other receipt payment. Please wait.");

    try {
      const response = await fetch("/api/payment-lookup/exam", {
        body: JSON.stringify({ transactionId }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const result = await response.json().catch(() => null);
      const message =
        result && typeof result.message === "string"
          ? result.message
          : response.ok
            ? "Exam / other receipt fetched successfully."
            : "Exam / other receipt lookup failed.";

      if (!response.ok || !result?.success) {
        throw new Error(message);
      }

      setExamLookupState("success");
      setExamLookupMessage(message);
    } catch (error) {
      setExamLookupState("error");
      setExamLookupMessage(
        error instanceof Error ? error.message : "Exam / other receipt lookup failed."
      );
    }
  }

  async function handleUniformLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const transactionId = uniformTransactionId.trim();

    if (!transactionId) {
      setUniformLookupState("error");
      setUniformLookupMessage("Please enter a transaction ID.");
      return;
    }

    setUniformLookupState("loading");
    setUniformLookupMessage("Checking uniform receipt payment. Please wait.");

    try {
      const response = await fetch("/api/payment-lookup/uniform", {
        body: JSON.stringify({ transactionId }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const result = await response.json().catch(() => null);
      const message =
        result && typeof result.message === "string"
          ? result.message
          : response.ok
            ? "Uniform receipt fetched successfully."
            : "Uniform receipt lookup failed.";

      if (!response.ok || !result?.success) {
        throw new Error(message);
      }

      setUniformLookupState("success");
      setUniformLookupMessage(message);
    } catch (error) {
      setUniformLookupState("error");
      setUniformLookupMessage(
        error instanceof Error ? error.message : "Uniform receipt lookup failed."
      );
    }
  }

  async function handleTuitionLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ids = tuitionIds.trim();

    if (tuitionProvider === "grayquest") {
      setTuitionLookupState("error");
      setTuitionLookupMessage("Grayquest is not available right now.");
      return;
    }

    if (!ids) {
      setTuitionLookupState("error");
      setTuitionLookupMessage(
        tuitionProvider === "razorpay"
          ? "Please enter at least one Razorpay order ID."
          : "Please enter at least one Cashfree transaction ID."
      );
      return;
    }

    setTuitionLookupState("loading");
    setTuitionLookupMessage(
      tuitionProvider === "razorpay"
        ? "Updating Razorpay tuition payment status. Please wait."
        : "Updating Cashfree tuition payment status. Please wait."
    );

    try {
      const response = await fetch("/api/payment-lookup/tuition", {
        body: JSON.stringify({ ids, provider: tuitionProvider }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const result = await response.json().catch(() => null);
      const message =
        result && typeof result.message === "string"
          ? result.message
          : response.ok
            ? "Tuition payment status updated successfully."
            : "Tuition payment status update failed.";

      if (!response.ok || !result?.success) {
        throw new Error(message);
      }

      setTuitionLookupState("success");
      setTuitionLookupMessage(message);
    } catch (error) {
      setTuitionLookupState("error");
      setTuitionLookupMessage(
        error instanceof Error ? error.message : "Tuition payment status update failed."
      );
    }
  }

  return (
    <div className="mt-8 grid gap-7">
      <section className="grid gap-6 md:grid-cols-2 2xl:grid-cols-4">
        {paymentLookupCards.map((item, index) => {
          const Icon = item.icon;
          const isAdmissionCard = item.key === "admission";
          const isExamCard = item.key === "exam";
          const isUniformCard = item.key === "uniform";
          const isTuitionCard = item.key === "tuition";
          const canSubmitLookup =
            isAdmissionCard || isExamCard || isUniformCard || isTuitionCard;
          const currentLookupState = isAdmissionCard
            ? admissionLookupState
            : isExamCard
              ? examLookupState
              : isUniformCard
                ? uniformLookupState
                : isTuitionCard
                  ? tuitionLookupState
              : "idle";
          const currentLookupMessage = isAdmissionCard
            ? admissionLookupMessage
            : isExamCard
              ? examLookupMessage
              : isUniformCard
                ? uniformLookupMessage
                : isTuitionCard
                  ? tuitionLookupMessage
              : "";

          return (
            <motion.article
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "relative min-h-[286px] overflow-hidden rounded-[8px] border bg-[linear-gradient(145deg,rgba(8,20,39,.82),rgba(3,11,24,.64))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,.045),0_18px_46px_rgba(0,0,0,.28)]",
                isTuitionCard && "2xl:min-h-[344px]",
                item.border
              )}
              initial={{ opacity: 0, y: 18 }}
              key={item.title}
              transition={{ delay: index * 0.06, duration: 0.38, ease: "easeOut" }}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(0,231,176,.055),transparent_30%),radial-gradient(circle_at_90%_100%,rgba(77,111,255,.05),transparent_30%)]" />
              <div className="relative z-10 flex h-full flex-col">
                <div className="grid gap-4 sm:grid-cols-[48px_minmax(0,1fr)]">
                  <div
                    className={cn(
                      "grid h-[48px] w-[48px] place-items-center rounded-[8px] bg-gradient-to-br text-white shadow-[0_0_24px_rgba(0,0,0,.22)]",
                      item.iconBg
                    )}
                  >
                    <Icon className="h-6 w-6 fill-white/10" strokeWidth={2.35} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[18px] font-bold leading-7 text-white">
                      {item.title}
                    </h2>
                    <p className="mt-2 text-[14px] leading-6 text-[#D3DCF1]">
                      {item.description}
                    </p>
                  </div>
                </div>

                <form
                  className="mt-auto grid gap-4 pt-8"
                  onSubmit={
                    isAdmissionCard
                      ? handleAdmissionLookup
                      : isExamCard
                        ? handleExamLookup
                        : isUniformCard
                          ? handleUniformLookup
                          : isTuitionCard
                            ? handleTuitionLookup
                        : undefined
                  }
                >
                  {isTuitionCard ? (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        {(["razorpay", "cashfree", "grayquest"] as TuitionProvider[]).map(
                          (provider) => {
                            const isDisabled = provider === "grayquest";
                            const isSelected = tuitionProvider === provider;

                            return (
                              <button
                                className={cn(
                                  "h-9 rounded-[6px] border px-2 text-[11px] font-semibold capitalize transition",
                                  isSelected &&
                                    "border-[#D88912]/55 bg-[#D88912]/16 text-[#FFB72E]",
                                  !isSelected &&
                                    "border-white/10 bg-[#061226]/72 text-[#A7B5CB] hover:border-[#D88912]/35 hover:text-white",
                                  isDisabled &&
                                    "cursor-not-allowed border-white/8 bg-white/[.03] text-[#60708A] opacity-60 hover:border-white/8 hover:text-[#60708A]"
                                )}
                                disabled={isDisabled}
                                key={provider}
                                onClick={() => setTuitionProvider(provider)}
                                type="button"
                              >
                                {provider}
                              </button>
                            );
                          }
                        )}
                      </div>
                      <div className="relative">
                        <textarea
                          className={cn(
                            "min-h-[72px] w-full resize-none rounded-[6px] border border-[#33445F] bg-[#061226]/76 px-4 py-3 pr-12 text-[13px] leading-5 text-white outline-none transition placeholder:text-[#A7B5CB]",
                            item.focus
                          )}
                          onChange={(event) => setTuitionIds(event.target.value)}
                          placeholder={
                            tuitionProvider === "razorpay"
                              ? "Enter Razorpay order IDs"
                              : "Enter Cashfree transaction IDs"
                          }
                          value={tuitionIds}
                        />
                        <ScanQrCode className="pointer-events-none absolute right-3.5 top-3.5 h-5 w-5 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="relative">
                      <textarea
                        className={cn(
                          "min-h-[72px] w-full resize-none rounded-[6px] border border-[#33445F] bg-[#061226]/76 px-4 py-3 pr-12 text-[13px] leading-5 text-white outline-none transition placeholder:text-[#A7B5CB]",
                          item.focus
                        )}
                        onChange={(event) => {
                          if (isAdmissionCard) {
                            setAdmissionTransactionId(event.target.value);
                          } else if (isExamCard) {
                            setExamTransactionId(event.target.value);
                          } else if (isUniformCard) {
                            setUniformTransactionId(event.target.value);
                          }
                        }}
                        placeholder="Enter Transaction IDs"
                        value={
                          isAdmissionCard
                            ? admissionTransactionId
                            : isExamCard
                              ? examTransactionId
                              : isUniformCard
                                ? uniformTransactionId
                                : undefined
                        }
                      />
                      <ScanQrCode className="pointer-events-none absolute right-3.5 top-3.5 h-5 w-5 text-white" />
                    </div>
                  )}
                  <Button
                    className={cn(
                      "h-[48px] w-full rounded-[6px] bg-gradient-to-r px-4 text-[15px]",
                      item.button
                    )}
                    disabled={
                      (canSubmitLookup && currentLookupState === "loading") ||
                      (isTuitionCard && tuitionProvider === "grayquest")
                    }
                    type={canSubmitLookup ? "submit" : "button"}
                  >
                    {canSubmitLookup && currentLookupState === "loading" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    Hit / Fetch
                  </Button>
                </form>

                {canSubmitLookup && currentLookupMessage ? (
                  <div
                    className={cn(
                      "mt-4 rounded-[7px] border px-3 py-2 text-[12px] font-semibold leading-5",
                      currentLookupState === "success" &&
                        "border-[#00E7B0]/26 bg-[#00E7B0]/10 text-[#00E7B0]",
                      currentLookupState === "error" &&
                        "border-[#FF4D6D]/28 bg-[#FF4D6D]/10 text-[#FF4D6D]",
                      currentLookupState === "loading" &&
                        "border-[#4D6FFF]/28 bg-[#4D6FFF]/10 text-[#6F8BFF]"
                    )}
                  >
                    {currentLookupMessage}
                  </div>
                ) : null}
              </div>
            </motion.article>
          );
        })}
      </section>

    </div>
  );
}

type ReciptRow = {
  addedOn: string;
  amount: string;
  amountValue: number;
  branch: string;
  feeType: string;
  gateway: string;
  receiptButtons: {
    label: string;
    url: string;
  }[];
  status: string;
  transactionId: string;
};

function readNestedArray(source: unknown, keys: string[]): unknown[] {
  if (!source || typeof source !== "object") {
    return [];
  }

  const record = source as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value;
    }
  }

  for (const value of Object.values(record)) {
    if (value && typeof value === "object") {
      const nestedValue = readNestedArray(value, keys);

      if (nestedValue.length > 0) {
        return nestedValue;
      }
    }
  }

  return [];
}

function extractReceiptRecords(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const record = data as Record<string, unknown>;

  for (const key of [
    "data",
    "records",
    "payment_list",
    "paymentList",
    "payments",
    "transactions",
    "receipt_list",
    "receiptList",
    "list",
    "result"
  ]) {
    if (Array.isArray(record[key])) {
      return record[key] as unknown[];
    }
  }

  for (const value of Object.values(record)) {
    const nestedRecords = extractReceiptRecords(value);

    if (nestedRecords.length > 0) {
      return nestedRecords;
    }
  }

  if (
    readNestedValue(data, [
      "transaction_id",
      "transactionId",
      "order_id",
      "orderId",
      "razorpay_order_id",
      "cashfree_order_id"
    ])
  ) {
    return [data];
  }

  return [];
}

function normalizeReceiptStatus(status: string) {
  const normalized = status.trim();

  if (normalized === "1" || normalized.toLowerCase() === "success") {
    return "TXN_SUCCESS";
  }

  if (!normalized) {
    return "PENDING";
  }

  return normalized;
}

function parseReceiptAmount(value: string) {
  const numericValue = Number(value.replace(/[^\d.-]/g, ""));

  return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatReceiptAmount(value: number) {
  return value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  });
}

function buildReceiptButtons(record: unknown) {
  const receiptUrl = readNestedValue(record, ["receipt_url", "receiptUrl"]);
  const ilReceiptUrl = readNestedValue(record, ["il_receipt_url", "ilReceiptUrl"]);
  const wkReceiptUrl = readNestedValue(record, ["wk_receipt_url", "wkReceiptUrl"]);
  const sotReceiptUrl = readNestedValue(record, ["sot_receipt_url", "sotReceiptUrl"]);
  const sedReceiptUrl = readNestedValue(record, ["sed_receipt_url", "sedReceiptUrl"]);
  const receiptItems = readNestedArray(record, ["receipts"]);
  const buttons: ReciptRow["receiptButtons"] = [];
  const usedUrls = new Set<string>();

  function addButton(label: string, url: string) {
    const normalizedUrl = url.trim();

    if (!normalizedUrl || usedUrls.has(normalizedUrl)) {
      return;
    }

    usedUrls.add(normalizedUrl);
    buttons.push({ label, url: normalizedUrl });
  }

  if (receiptUrl) {
    addButton("Download", receiptUrl);
  }

  if (ilReceiptUrl) {
    addButton("IL Recipt", ilReceiptUrl);
  }

  if (wkReceiptUrl) {
    addButton("WK Recipt", wkReceiptUrl);
  }

  if (sotReceiptUrl) {
    addButton("SOT Recipt", sotReceiptUrl);
  }

  receiptItems.forEach((receiptItem) => {
    if (!receiptItem || typeof receiptItem !== "object" || Array.isArray(receiptItem)) {
      return;
    }

    const receiptType = readNestedValue(receiptItem, ["type"]).toLowerCase();
    const label = readNestedValue(receiptItem, ["label", "name"]) || "Receipt";
    const itemUrl =
      readNestedValue(receiptItem, ["url", "receipt_url", "receiptUrl"]) ||
      (receiptType === "sed" ? sedReceiptUrl : "");

    addButton(label, itemUrl);
  });

  if (sedReceiptUrl) {
    addButton("SED Receipt", sedReceiptUrl);
  }

  return buttons;
}

function normalizeReceiptRows(data: unknown): ReciptRow[] {
  return extractReceiptRecords(data).map((record) => {
    const amountText =
      readNestedValue(record, [
        "amount",
        "amount_initiate",
        "paid_amount",
        "fee_amount",
        "total_amount",
        "totalAmount"
      ]) || "0";
    const amountValue = parseReceiptAmount(amountText);

    return {
      addedOn:
        readNestedValue(record, [
          "added_on",
          "addedOn",
          "created_at",
          "createdAt",
          "payment_date",
          "paymentDate"
        ]) || "Not available",
      amount: formatReceiptAmount(amountValue),
      amountValue,
      branch:
        readNestedValue(record, ["branch", "branch_name", "branchName", "school"]) ||
        "Not available",
      feeType:
        readNestedValue(record, ["fee_type", "feeType", "fee_name", "feeName", "type"]) ||
        "Not available",
      gateway:
        readNestedValue(record, ["gateway", "payment_gateway", "paymentGateway"]) ||
        "Not available",
      receiptButtons: buildReceiptButtons(record),
      status: normalizeReceiptStatus(
        readNestedValue(record, ["status", "payment_status", "paymentStatus"])
      ),
      transactionId:
        readNestedValue(record, [
          "transaction_id",
          "transactionId",
          "transactionID",
          "order_id",
          "orderId",
          "razorpay_order_id",
          "cashfree_order_id"
        ]) || "Not available"
    };
  });
}

function ReciptsView({ role }: { role: DashboardRole | null }) {
  const [receiptAdmissionNo, setReceiptAdmissionNo] = useState("SCS");
  const [receiptRows, setReceiptRows] = useState<ReciptRow[]>([]);
  const [receiptLookupState, setReceiptLookupState] = useState<LookupState>("idle");
  const [receiptLookupMessage, setReceiptLookupMessage] = useState("");
  const [copiedReceiptTransactionId, setCopiedReceiptTransactionId] = useState("");
  const [feeTypeFilter, setFeeTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const successfulReceipts = receiptRows.filter((row) => row.status === "TXN_SUCCESS");
  const pendingReceipts = receiptRows.filter((row) => row.status !== "TXN_SUCCESS");
  const totalAmount = successfulReceipts.reduce((sum, row) => sum + row.amountValue, 0);
  const filteredRows = receiptRows.filter((row) => {
    const feeMatches = feeTypeFilter === "All" || row.feeType === feeTypeFilter;
    const statusMatches = statusFilter === "All" || row.status === statusFilter;

    return feeMatches && statusMatches;
  });
  const receiptRowsPerPage = 10;
  const [receiptPage, setReceiptPage] = useState(1);
  const receiptPageCount = Math.max(
    1,
    Math.ceil(filteredRows.length / receiptRowsPerPage)
  );
  const paginatedRows = filteredRows.slice(
    (receiptPage - 1) * receiptRowsPerPage,
    receiptPage * receiptRowsPerPage
  );
  const feeTypeOptions = Array.from(
    new Set(receiptRows.map((row) => row.feeType).filter(Boolean))
  );
  const statusOptions = Array.from(
    new Set(receiptRows.map((row) => row.status).filter(Boolean))
  );
  const shouldShowReceiptDetails =
    receiptLookupState === "success" && receiptRows.length > 0;
  const shouldShowReceiptStats = role !== "wizklub";

  useEffect(() => {
    setReceiptAdmissionNo(readStoredAdmissionNo());
  }, []);

  async function fetchReceiptRows(admissionNo: string) {
    const normalizedAdmissionNo = writeStoredAdmissionNo(admissionNo);

    if (normalizedAdmissionNo === "SCS") {
      setReceiptLookupState("error");
      setReceiptLookupMessage("Please enter an admission number.");
      return;
    }

    setReceiptAdmissionNo(normalizedAdmissionNo);
    setReceiptLookupState("loading");
    setReceiptLookupMessage("Loading receipt list. Please wait.");
    setReceiptRows([]);

    try {
      const response = await fetch("/api/student/receipt-list", {
        body: JSON.stringify({ admissionNo: normalizedAdmissionNo }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(
          result && typeof result.message === "string"
            ? result.message
            : "Unable to fetch receipt list."
        );
      }

      const rows = normalizeReceiptRows(result.data);

      setReceiptRows(rows);
      setFeeTypeFilter("All");
      setStatusFilter("All");
      setReceiptPage(1);
      setReceiptLookupState("success");
      setReceiptLookupMessage(
        rows.length
          ? `Found ${rows.length} receipt record${rows.length === 1 ? "" : "s"}.`
          : "No receipt records found for this admission number."
      );
    } catch (error) {
      setReceiptLookupState("error");
      setReceiptLookupMessage(
        error instanceof Error ? error.message : "Unable to fetch receipt list."
      );
    }
  }

  function handleReceiptSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void fetchReceiptRows(receiptAdmissionNo);
  }

  function handleReceiptClear() {
    setReceiptAdmissionNo(writeStoredAdmissionNo("SCS"));
    setReceiptRows([]);
    setReceiptLookupState("idle");
    setReceiptLookupMessage("");
    setCopiedReceiptTransactionId("");
    setFeeTypeFilter("All");
    setStatusFilter("All");
    setReceiptPage(1);
  }

  async function handleCopyReceiptTransactionId(value: string) {
    if (!value.trim()) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopiedReceiptTransactionId(value);
    window.setTimeout(() => setCopiedReceiptTransactionId(""), 1600);
  }

  return (
    <div className="mt-8 grid min-w-0 gap-5">
      <Card className="min-w-0 overflow-hidden rounded-[8px] border-[#315EFF]/38 bg-[linear-gradient(145deg,rgba(8,20,39,.78),rgba(3,11,24,.62))] p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <UserRoundSearch className="h-5 w-5 text-[#00E7B0]" />
          <h2 className="text-[16px] font-bold text-white">Search Student</h2>
        </div>
        <form
          className="mt-6 grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px]"
          onSubmit={handleReceiptSearch}
        >
          <label className="grid min-w-0 gap-2">
            <span className="text-[13px] text-[#C9D4E7]">Admission Number</span>
            <div className="relative">
              <Input
                className="h-12 rounded-[6px] border-[#34445E] bg-[#061226]/72 pl-12 text-[14px] placeholder:text-[#8CA3C7] focus:border-[#00E7B0]/60"
                onChange={(event) =>
                  setReceiptAdmissionNo(normalizeAdmissionNo(event.target.value))
                }
                placeholder="Enter admission number"
                value={receiptAdmissionNo}
              />
              <UserRoundSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#AFC0D9]" />
            </div>
          </label>
          <Button
            className="mt-auto h-12 w-full min-w-0 rounded-[6px]"
            disabled={receiptLookupState === "loading"}
            type="submit"
          >
            {receiptLookupState === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Search Student
          </Button>
          <Button
            className="mt-auto h-12 w-full min-w-0 rounded-[6px]"
            disabled={receiptLookupState === "loading"}
            onClick={handleReceiptClear}
            type="button"
            variant="ghost"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </Button>
        </form>
        {receiptLookupMessage ? (
          <div
            className={cn(
              "mt-4 rounded-[8px] border px-4 py-3 text-sm font-semibold",
              receiptLookupState === "success" &&
                "border-[#00E7B0]/25 bg-[#00E7B0]/10 text-[#00E7B0]",
              receiptLookupState === "error" &&
                "border-[#FF4D6D]/25 bg-[#FF4D6D]/10 text-[#FF4D6D]",
              receiptLookupState === "loading" &&
                "border-[#4D6FFF]/25 bg-[#4D6FFF]/10 text-[#6F8BFF]"
            )}
          >
            {receiptLookupMessage}
          </div>
        ) : null}
      </Card>

      {shouldShowReceiptDetails ? (
        <>
          {shouldShowReceiptStats ? (
            <section className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  icon: FileText,
                  label: "Total Transactions",
                  tone: "bg-[#315EFF]/14 text-[#6F8BFF]",
                  value: receiptRows.length
                },
                {
                  icon: Check,
                  label: "Successful",
                  tone: "bg-[#00E7B0]/12 text-[#00E7B0]",
                  value: successfulReceipts.length
                },
                {
                  icon: RefreshCcw,
                  label: "Pending / Failed",
                  tone: "bg-[#F59E0B]/15 text-[#FBBF24]",
                  value: pendingReceipts.length
                },
                {
                  icon: IndianRupee,
                  label: "Total Amount",
                  tone: "bg-[#7C3AED]/16 text-[#C4B5FD]",
                  value: formatAmount(totalAmount)
                }
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <Card className="min-w-0 rounded-[8px] border-[#315EFF]/20 p-4" key={item.label}>
                    <div className="flex items-center gap-4">
                      <div className={cn("grid h-11 w-11 place-items-center rounded-[8px]", item.tone)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-[#AFC0D9]">{item.label}</p>
                        <p className="break-words text-[21px] font-bold text-white">{item.value}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </section>
          ) : null}

          <Card className="min-w-0 overflow-hidden rounded-[8px] border-[#315EFF]/26 bg-[linear-gradient(145deg,rgba(8,20,39,.78),rgba(3,11,24,.62))] p-4">
            <h2 className="text-[14px] font-bold text-white">Filter Receipts</h2>
            <div className="mt-4 grid min-w-0 items-end gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_285px]">
              <label className="grid min-w-0 gap-2">
                <span className="text-[11px] text-[#AFC0D9]">Fee Type</span>
                <select
                  className="h-10 rounded-[6px] border border-[#34445E] bg-[#061226]/72 px-3 text-[12px] text-white outline-none"
                  onChange={(event) => setFeeTypeFilter(event.target.value)}
                  onInput={() => setReceiptPage(1)}
                  value={feeTypeFilter}
                >
                  <option>All</option>
                  {feeTypeOptions.map((feeType) => (
                    <option key={feeType}>{feeType}</option>
                  ))}
                </select>
              </label>
              <label className="grid min-w-0 gap-2">
                <span className="text-[11px] text-[#AFC0D9]">Payment Status</span>
                <select
                  className="h-10 rounded-[6px] border border-[#34445E] bg-[#061226]/72 px-3 text-[12px] text-white outline-none"
                  onChange={(event) => setStatusFilter(event.target.value)}
                  onInput={() => setReceiptPage(1)}
                  value={statusFilter}
                >
                  <option>All</option>
                  {statusOptions.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
              <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-[100px_160px] sm:justify-end">
                <Button
                  className="h-10 min-w-0 rounded-[6px] px-3 text-[12px]"
                  onClick={() => {
                    setFeeTypeFilter("All");
                    setStatusFilter("All");
                    setReceiptPage(1);
                  }}
                  type="button"
                  variant="ghost"
                >
                  Reset
                </Button>
                <Button
                  className="h-10 min-w-0 whitespace-nowrap rounded-[6px] px-4 text-[12px]"
                  type="button"
                >
                  <Filter className="h-4 w-4" />
                  Apply Filters
                </Button>
              </div>
            </div>
          </Card>

          <Card className="min-w-0 overflow-hidden rounded-[8px] border-[#315EFF]/26 bg-[linear-gradient(145deg,rgba(8,20,39,.78),rgba(3,11,24,.62))] p-3 sm:p-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[15px] font-bold text-white">Receipts ({filteredRows.length})</h2>
          <Button className="h-9 w-full min-w-0 rounded-[6px] px-3 text-[12px] sm:w-auto" type="button" variant="ghost">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
        <div className="mt-4 w-full max-w-full overflow-x-auto rounded-[7px] border border-white/8 bg-[#07172D]/58">
          <table className="w-full min-w-[1120px] border-collapse">
            <thead>
              <tr className="bg-white/[.055] text-left text-[11px] font-semibold text-[#C9D4E7]">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Transaction ID</th>
                <th className="px-4 py-3">Fee Type</th>
                <th className="px-4 py-3 text-right">Amount (Rs)</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Gateway</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Added On</th>
                <th className="px-4 py-3">Receipts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {paginatedRows.map((row, index) => (
                <tr className="text-[12px] text-[#D6E0F1]" key={row.transactionId}>
                  <td className="px-4 py-3">
                    {(receiptPage - 1) * receiptRowsPerPage + index + 1}
                  </td>
                  <td className="max-w-[250px] px-4 py-3 font-semibold text-white">
                    <TransactionCopyButton
                      copiedTransactionId={copiedReceiptTransactionId}
                      onCopy={handleCopyReceiptTransactionId}
                      transactionId={row.transactionId}
                    />
                  </td>
                  <td className="px-4 py-3">{row.feeType}</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">
                    {row.amount}
                  </td>
                  <td className="px-4 py-3">{row.branch}</td>
                  <td className="px-4 py-3">{row.gateway}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-[4px] px-2 py-1 text-[10px] font-bold",
                        row.status === "TXN_SUCCESS"
                          ? "bg-[#00E7B0]/12 text-[#00E7B0]"
                          : "bg-[#F59E0B]/16 text-[#FBBF24]"
                      )}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{row.addedOn}</td>
                  <td className="px-4 py-3">
                    {row.receiptButtons.length > 0 ? (
                      <div className="grid justify-start gap-2">
                        {row.receiptButtons.map((receiptButton, receiptIndex) => (
                          <a
                            className="inline-flex min-h-8 min-w-[94px] items-center justify-center rounded-full border border-[#B794FF]/75 bg-[#8B5CF6] px-4 py-1.5 text-center text-[10px] font-bold uppercase leading-4 text-white shadow-[0_0_18px_rgba(139,92,246,.24),inset_0_1px_0_rgba(255,255,255,.28)] transition hover:bg-[#9B6BFF] hover:shadow-[0_0_24px_rgba(139,92,246,.36)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8B5CF6]/28"
                            href={receiptButton.url}
                            key={`${row.transactionId}-${receiptButton.label}-${receiptIndex}`}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {receiptButton.label}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span className="font-semibold text-[#8CA3C7]">Not available</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex min-w-0 flex-col gap-3 text-[12px] text-[#AFC0D9] sm:flex-row sm:items-center sm:justify-between">
          <span>
            Showing{" "}
            <span className="font-semibold text-white">
              {filteredRows.length === 0
                ? 0
                : (receiptPage - 1) * receiptRowsPerPage + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-white">
              {Math.min(receiptPage * receiptRowsPerPage, filteredRows.length)}
            </span>{" "}
            of <span className="font-semibold text-white">{filteredRows.length}</span>{" "}
            records
          </span>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Button
              className="h-9 min-w-0 flex-1 rounded-[6px] px-3 text-[12px] sm:flex-none"
              disabled={receiptPage <= 1}
              onClick={() => setReceiptPage((page) => Math.max(1, page - 1))}
              type="button"
              variant="ghost"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="grid h-9 min-w-[76px] flex-1 place-items-center rounded-[6px] border border-[#315EFF]/24 bg-[#061226]/72 px-3 font-semibold text-white sm:min-w-[88px] sm:flex-none">
              {receiptPage} / {receiptPageCount}
            </span>
            <Button
              className="h-9 min-w-0 flex-1 rounded-[6px] px-3 text-[12px] sm:flex-none"
              disabled={receiptPage >= receiptPageCount}
              onClick={() =>
                setReceiptPage((page) => Math.min(receiptPageCount, page + 1))
              }
              type="button"
              variant="ghost"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}

const transactionTabs = [
  {
    description: "All payments",
    icon: CreditCard,
    label: "Payments Table",
    table: "payments",
    tone: "emerald"
  },
  {
    description: "Book payments",
    icon: FileText,
    label: "Book Payments Table",
    table: "book_payments",
    tone: "purple"
  },
  {
    description: "Exam payments",
    icon: GraduationCap,
    label: "Exam Payments Table",
    table: "exam_payments",
    tone: "amber"
  },
  {
    description: "Uniform payments",
    icon: Shirt,
    label: "Uniform Payments Table",
    table: "uniform_payments",
    tone: "sky"
  }
];

function transactionStatusClass(status: string) {
  if (status === "Success" || status === "TXN_SUCCESS") {
    return "border-[#00E7B0]/28 bg-[#00E7B0]/10 text-[#00E7B0]";
  }

  if (status === "Pending" || status === "TXN_PENDING" || status === "TAX_PENDING") {
    return "border-[#FBBF24]/32 bg-[#FBBF24]/11 text-[#FBBF24]";
  }

  return "border-[#FF4D6D]/32 bg-[#FF4D6D]/12 text-[#FF4D6D]";
}

function formatTransactionStatus(status: string) {
  const normalized = status.trim();

  if (normalized === "0") {
    return "TAX_PENDING";
  }

  if (normalized === "1") {
    return "TXN_SUCCESS";
  }

  return normalized || "Not available";
}

function transactionAvatarClass(index: number) {
  const tones = [
    "from-[#00B894] to-[#086D5E]",
    "from-[#1EB9B3] to-[#11606D]",
    "from-[#3CBF7A] to-[#14745B]",
    "from-[#3D9BCB] to-[#1E4E78]",
    "from-[#36C385] to-[#286C59]",
    "from-[#2AA876] to-[#12624F]",
    "from-[#24A279] to-[#0E5F4C]",
    "from-[#21B89B] to-[#1F6D70]",
    "from-[#9C5AC8] to-[#553276]",
    "from-[#8A67D5] to-[#4A3B86]"
  ];

  return tones[index % tones.length];
}

function readTransactionResponseValue(data: unknown, keys: string[]) {
  const responseText = readNestedValue(data, ["response"]);

  if (!responseText) {
    return "";
  }

  try {
    const parsed = JSON.parse(responseText);

    return readNestedValue(parsed, keys);
  } catch {
    return "";
  }
}

function normalizeTransactionRow(data: unknown) {
  const status =
    readNestedValue(data, ["payment_status", "paymentStatus", "status"]) ||
    "Not available";
  const orderId =
    readNestedValue(data, [
      "razorpay_order_id",
      "cashfree_order_id",
      "order_id",
      "orderId",
      "ORDERID"
    ]) ||
    readTransactionResponseValue(data, [
      "razorpay_order_id",
      "cashfree_order_id",
      "order_id",
      "orderId",
      "ORDERID"
    ]) ||
    "Not available";
  const paymentId =
    readNestedValue(data, [
      "razorpay_payment_id",
      "cashfree_payment_id",
      "payment_id",
      "paymentId",
      "TXNID",
      "tracking_id",
      "Unique_Ref_Number"
    ]) ||
    readTransactionResponseValue(data, [
      "razorpay_payment_id",
      "cashfree_payment_id",
      "payment_id",
      "paymentId",
      "TXNID",
      "tracking_id",
      "Unique_Ref_Number"
    ]) ||
    "Not available";

  return {
    addedOn:
      readNestedValue(data, ["added_on", "addedOn", "created_at", "createdAt"]) ||
      "Not available",
    amount:
      formatAmount(readNestedValue(data, ["amount_initiate", "amount", "fee_amount"]) || ""),
    feeType:
      readNestedValue(data, ["fee_type", "feeType", "fee_name", "feeName"]) ||
      "Not available",
    gateway: readNestedValue(data, ["gateway"]) || "Not available",
    initials: "TX",
    orderId,
    paymentId,
    receiptButtons: buildReceiptButtons(data),
    status: formatTransactionStatus(status),
    student: readNestedValue(data, ["student", "student_id", "studentId"]) || "Not available",
    studentId:
      readNestedValue(data, ["student", "student_id", "studentId", "admission_no"]) ||
      "Not available",
    transactionId:
      readNestedValue(data, ["transaction_id", "transactionId", "transactionID"]) ||
      "Not available",
    varnaReceiptId:
      readNestedValue(data, ["varna_receipt_id", "varnaReceiptId"]) || "Not available"
  };
}

function extractTransactionRecords(data: unknown) {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const record = data as Record<string, unknown>;

  for (const key of ["records", "transactions", "payments", "rows", "items", "result"]) {
    if (Array.isArray(record[key])) {
      return record[key] as unknown[];
    }
  }

  return [data];
}

function getTransactionRecordKeys(record: unknown) {
  return Array.from(
    new Set(
      [
        readNestedValue(record, ["transaction_id", "transactionId", "transactionID"]),
        readNestedValue(record, ["varna_receipt_id", "varnaReceiptId"]),
        readNestedValue(record, [
          "razorpay_order_id",
          "cashfree_order_id",
          "order_id",
          "orderId",
          "ORDERID"
        ]),
        readNestedValue(record, [
          "razorpay_payment_id",
          "cashfree_payment_id",
          "payment_id",
          "paymentId",
          "TXNID",
          "tracking_id",
          "Unique_Ref_Number"
        ]),
        readTransactionResponseValue(record, [
          "razorpay_order_id",
          "cashfree_order_id",
          "order_id",
          "orderId",
          "ORDERID"
        ]),
        readTransactionResponseValue(record, [
          "razorpay_payment_id",
          "cashfree_payment_id",
          "payment_id",
          "paymentId",
          "TXNID",
          "tracking_id",
          "Unique_Ref_Number"
        ])
      ]
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function createPaymentRecordLookup(records: unknown[]) {
  const lookup = new Map<string, unknown>();

  records.forEach((record) => {
    getTransactionRecordKeys(record).forEach((key) => {
      if (!lookup.has(key)) {
        lookup.set(key, record);
      }
    });
  });

  return lookup;
}

function copyPaymentField(
  target: Record<string, unknown>,
  source: unknown,
  sourceKeys: string[],
  targetKey: string
) {
  const sourceValue = readNestedValue(source, sourceKeys);
  const targetValue = readNestedValue(target, [targetKey]);

  if (sourceValue && (!targetValue || targetValue === "Not available")) {
    target[targetKey] = sourceValue;
  }
}

function mergeTransactionRecordWithPaymentRecord(record: unknown, paymentRecord: unknown) {
  if (
    !record ||
    typeof record !== "object" ||
    Array.isArray(record) ||
    !paymentRecord ||
    typeof paymentRecord !== "object" ||
    Array.isArray(paymentRecord)
  ) {
    return record;
  }

  const merged = {
    ...(paymentRecord as Record<string, unknown>),
    ...(record as Record<string, unknown>)
  };

  if (buildReceiptButtons(record).length === 0) {
    copyPaymentField(merged, paymentRecord, ["receipt_url", "receiptUrl"], "receipt_url");
    copyPaymentField(
      merged,
      paymentRecord,
      ["il_receipt_url", "ilReceiptUrl"],
      "il_receipt_url"
    );
    copyPaymentField(
      merged,
      paymentRecord,
      ["wk_receipt_url", "wkReceiptUrl"],
      "wk_receipt_url"
    );
    copyPaymentField(
      merged,
      paymentRecord,
      ["sot_receipt_url", "sotReceiptUrl"],
      "sot_receipt_url"
    );
  }

  copyPaymentField(merged, paymentRecord, ["fee_type", "feeType"], "fee_type");

  return merged;
}

function mergeTransactionRecordsWithPaymentReceipts(
  records: unknown[],
  paymentRecords: unknown[]
) {
  const paymentLookup = createPaymentRecordLookup(paymentRecords);

  return records.map((record) => {
    const matchedPaymentRecord = getTransactionRecordKeys(record)
      .map((key) => paymentLookup.get(key))
      .find(Boolean);

    return matchedPaymentRecord
      ? mergeTransactionRecordWithPaymentRecord(record, matchedPaymentRecord)
      : record;
  });
}

function readNestedValue(source: unknown, keys: string[]): string {
  if (!source || typeof source !== "object") {
    return "";
  }

  const record = source as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" || typeof value === "number") {
      return String(value).trim();
    }
  }

  for (const value of Object.values(record)) {
    if (value && typeof value === "object") {
      const nestedValue = readNestedValue(value, keys);

      if (nestedValue) {
        return nestedValue;
      }
    }
  }

  return "";
}

function TransactionsView() {
  const [selectedTransactionTable, setSelectedTransactionTable] = useState(
    transactionTabs[0]?.table || "payments"
  );
  const [transactionSearchId, setTransactionSearchId] = useState("");
  const [transactionLookupState, setTransactionLookupState] =
    useState<LookupState>("idle");
  const [transactionLookupMessage, setTransactionLookupMessage] = useState("");
  const [transactionDetail, setTransactionDetail] = useState<unknown>(null);
  const [copiedTransactionValue, setCopiedTransactionValue] = useState("");
  const [transactionPage, setTransactionPage] = useState(1);
  const transactionRows = extractTransactionRecords(transactionDetail).map((record) =>
    normalizeTransactionRow(record)
  );
  const transactionRowsPerPage = 10;
  const transactionPageCount = Math.max(
    1,
    Math.ceil(transactionRows.length / transactionRowsPerPage)
  );
  const paginatedTransactionRows = transactionRows.slice(
    (transactionPage - 1) * transactionRowsPerPage,
    transactionPage * transactionRowsPerPage
  );

  async function handleCopyTransactionValue(value: string) {
    if (!value || value === "Not available") {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopiedTransactionValue(value);
    window.setTimeout(() => setCopiedTransactionValue(""), 1400);
  }

  function TransactionCopyCell({ value }: { value: string }) {
    const canCopy = Boolean(value && value !== "Not available");

    return (
      <button
        className="group relative inline-flex max-w-[220px] items-center gap-2 text-left text-[#C9D4E7] transition enabled:hover:text-[#00E7B0] disabled:cursor-default"
        disabled={!canCopy}
        onClick={() => handleCopyTransactionValue(value)}
        type="button"
      >
        <span className="break-all">{value}</span>
        {canCopy ? <Copy className="h-3.5 w-3.5 shrink-0 opacity-65" /> : null}
        {canCopy ? (
          <span className="pointer-events-none absolute -top-9 left-0 z-20 hidden rounded-[6px] border border-[#00E7B0]/20 bg-[#061226] px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-[0_12px_28px_rgba(0,0,0,.32)] transition group-hover:opacity-100 sm:block">
            {copiedTransactionValue === value ? "Copied" : "Click to copy"}
          </span>
        ) : null}
      </button>
    );
  }

  async function fetchTransactionDetails(searchValue: string) {
    if (!searchValue) {
      setTransactionLookupState("error");
      setTransactionLookupMessage("Please enter at least one search value.");
      return false;
    }

    setTransactionLookupState("loading");
    setTransactionLookupMessage("Fetching transaction details. Please wait.");
    setTransactionDetail(null);
    setTransactionPage(1);

    if (searchValue.toUpperCase().startsWith("SCS") && !searchValue.includes(",")) {
      setTransactionSearchId(writeStoredAdmissionNo(searchValue));
    }

    try {
      const response = await fetch(
        `/api/transaction/details?table=${encodeURIComponent(
          selectedTransactionTable
        )}&search=${encodeURIComponent(searchValue)}`
      );
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(
          result && typeof result.message === "string"
            ? result.message
            : "Transaction not found."
        );
      }

      let foundRecords = extractTransactionRecords(result.data);

      if (selectedTransactionTable !== "payments") {
        const paymentsResponse = await fetch(
          `/api/transaction/details?table=payments&search=${encodeURIComponent(
            searchValue
          )}`
        );
        const paymentsResult = await paymentsResponse.json().catch(() => null);

        if (paymentsResponse.ok && paymentsResult?.success) {
          foundRecords = mergeTransactionRecordsWithPaymentReceipts(
            foundRecords,
            extractTransactionRecords(paymentsResult.data)
          );
        }
      }

      setTransactionDetail(foundRecords);
      setTransactionLookupState("success");
      setTransactionLookupMessage(
        foundRecords.length > 1
          ? `${foundRecords.length} transaction records found.`
          : result && typeof result.message === "string"
            ? result.message
            : "Transaction found."
      );
      return true;
    } catch (error) {
      setTransactionLookupState("error");
      setTransactionLookupMessage(
        error instanceof Error ? error.message : "Unable to fetch transaction details."
      );
      return false;
    }
  }

  async function handleTransactionLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const searchValue = normalizeTransactionSearchInput(transactionSearchId);

    await fetchTransactionDetails(searchValue);
  }

  return (
    <div className="mt-8 grid gap-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {transactionTabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = selectedTransactionTable === tab.table;
          const toneClass =
            tab.tone === "emerald"
              ? "border-[#00E7B0]/55 bg-[#00E7B0]/12 text-[#00E7B0]"
              : tab.tone === "purple"
                ? "border-[#8B5CF6]/40 bg-[#8B5CF6]/12 text-[#C4A6FF]"
                : tab.tone === "amber"
                  ? "border-[#F59E0B]/40 bg-[#F59E0B]/12 text-[#FBBF24]"
                  : "border-[#38BDF8]/35 bg-[#38BDF8]/12 text-[#7DD3FC]";

          return (
            <button
              className={cn(
                "group relative flex min-h-[76px] items-center gap-4 overflow-hidden rounded-[8px] border border-[#263852] bg-[linear-gradient(145deg,rgba(8,20,39,.78),rgba(3,11,24,.58))] p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.04)] transition hover:-translate-y-0.5 hover:border-[#00E7B0]/24",
                isActive && "border-[#00E7B0]/42"
              )}
              key={tab.label}
              onClick={() => {
                setSelectedTransactionTable(tab.table);
                setTransactionDetail(null);
                setTransactionLookupState("idle");
                setTransactionLookupMessage("");
                setTransactionPage(1);
              }}
              type="button"
            >
              {isActive ? (
                <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#00E7B0]" />
              ) : null}
              <span className={cn("grid h-11 w-11 place-items-center rounded-[8px] border", toneClass)}>
                <Icon className="h-6 w-6" />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-bold text-white">{tab.label}</span>
                <span className="mt-1 block text-[12px] text-[#8CA3C7]">
                  {tab.description}
                </span>
              </span>
            </button>
          );
        })}
      </section>

      <motion.section
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[8px] border border-[#263852] bg-[linear-gradient(145deg,rgba(8,20,39,.76),rgba(3,11,24,.62))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_18px_46px_rgba(0,0,0,.28)]"
        initial={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.38, ease: "easeOut" }}
      >
        <form
          className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_170px]"
          onSubmit={handleTransactionLookup}
        >
          <div className="relative">
            <Input
              className="h-11 rounded-[6px] border-[#2E405B] bg-[#061226]/72 pr-10 text-[13px] placeholder:text-[#8CA3C7]"
              onChange={(event) => setTransactionSearchId(event.target.value)}
              placeholder="Enter transaction IDs, varna IDs, payment IDs, or admission no."
              value={transactionSearchId}
            />
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8CA3C7]" />
          </div>
          <Button
            className="h-11 rounded-[6px] px-4 text-[13px]"
            disabled={transactionLookupState === "loading"}
            type="submit"
          >
            {transactionLookupState === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Search
          </Button>
        </form>

        {transactionLookupMessage ? (
          <div
            className={cn(
              "mt-3 w-fit rounded-[7px] border px-3 py-2 text-[12px] font-semibold",
              transactionLookupState === "success" &&
                "border-[#00E7B0]/25 bg-[#00E7B0]/10 text-[#00E7B0]",
              transactionLookupState === "error" &&
                "border-[#FF4D6D]/25 bg-[#FF4D6D]/10 text-[#FF4D6D]",
              transactionLookupState === "loading" &&
                "border-[#4D6FFF]/25 bg-[#4D6FFF]/10 text-[#6F8BFF]"
            )}
          >
            {transactionLookupMessage}
          </div>
        ) : null}

        <div className="mt-5 overflow-x-auto rounded-[7px] border border-white/8 bg-[#07172D]/58">
          <table className="w-full min-w-[1280px] border-collapse">
            <thead>
              <tr className="bg-white/[.045] text-left text-[12px] font-semibold text-[#C9D4E7]">
                <th className="px-4 py-4">Added On</th>
                <th className="px-4 py-4">Transaction ID</th>
                <th className="px-4 py-4">Varna Receipt ID</th>
                <th className="px-4 py-4">Amount</th>
                <th className="px-4 py-4">Fee Type</th>
                <th className="px-4 py-4">Payment Status</th>
                <th className="px-4 py-4">Gateway</th>
                <th className="px-4 py-4">Order ID</th>
                <th className="px-4 py-4">Payment ID</th>
                <th className="px-4 py-4">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {paginatedTransactionRows.length > 0 ? (
                paginatedTransactionRows.map((row, index) => (
                  <tr
                    className="text-[13px] text-[#B9C7DD] transition hover:bg-white/[.035]"
                    key={row.transactionId}
                  >
                    <td className="px-4 py-3">{row.addedOn}</td>
                    <td className="px-4 py-3">
                      <TransactionCopyCell value={row.transactionId} />
                    </td>
                    <td className="px-4 py-3">
                      <TransactionCopyCell value={row.varnaReceiptId} />
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#EAF1FF]">{row.amount}</td>
                    <td className="px-4 py-3">{row.feeType}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex min-w-[84px] items-center justify-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold",
                          transactionStatusClass(row.status)
                        )}
                      >
                        {row.status === "Success" || row.status === "TXN_SUCCESS" ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : row.status === "Pending" ||
                          row.status === "TXN_PENDING" ||
                          row.status === "TAX_PENDING" ? (
                          <span className="h-3 w-3 rounded-full border border-current" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{row.gateway}</td>
                    <td className="px-4 py-3">
                      <TransactionCopyCell value={row.orderId} />
                    </td>
                    <td className="px-4 py-3">
                      <TransactionCopyCell value={row.paymentId} />
                    </td>
                    <td className="px-4 py-3">
                      {row.receiptButtons.length > 0 ? (
                        <div className="grid justify-start gap-2">
                          {row.receiptButtons.map((receiptButton, receiptIndex) => (
                            <a
                              className="inline-flex min-h-8 items-center justify-center rounded-full border border-[#A78BFA] bg-[#8B5CF6] px-4 py-1.5 text-center text-[10px] font-bold uppercase leading-4 text-white shadow-[0_0_18px_rgba(139,92,246,.24)] transition hover:bg-[#9F7AEA]"
                              href={receiptButton.url}
                              key={`${row.transactionId}-${receiptButton.label}-${receiptIndex}`}
                              rel="noreferrer"
                              target="_blank"
                            >
                              {receiptButton.label}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="font-semibold text-[#AFC0D9]">
                          Not available
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-10 text-center text-[13px] text-[#8CA3C7]" colSpan={10}>
                    Select a table, enter search values, and click Search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {transactionRows.length > transactionRowsPerPage ? (
          <div className="mt-4 flex flex-col gap-3 text-[12px] text-[#8CA3C7] sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {(transactionPage - 1) * transactionRowsPerPage + 1}-
              {Math.min(transactionPage * transactionRowsPerPage, transactionRows.length)} of{" "}
              {transactionRows.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                className="grid h-8 w-8 place-items-center rounded-[6px] border border-white/10 bg-[#061226]/72 disabled:opacity-45"
                disabled={transactionPage === 1}
                onClick={() => setTransactionPage((page) => Math.max(1, page - 1))}
                type="button"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: transactionPageCount }, (_, index) => index + 1).map(
                (page) => (
                  <button
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-[6px] border border-white/10 bg-[#061226]/72",
                      page === transactionPage &&
                        "border-[#00E7B0]/30 bg-[#00E7B0] text-[#02111D]"
                    )}
                    key={page}
                    onClick={() => setTransactionPage(page)}
                    type="button"
                  >
                    {page}
                  </button>
                )
              )}
              <button
                className="grid h-8 w-8 place-items-center rounded-[6px] border border-white/10 bg-[#061226]/72 disabled:opacity-45"
                disabled={transactionPage === transactionPageCount}
                onClick={() =>
                  setTransactionPage((page) => Math.min(transactionPageCount, page + 1))
                }
                type="button"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </motion.section>
    </div>
  );
}

function StudentsView() {
  const [studentAdmissionNo, setStudentAdmissionNo] = useState("SCS");
  const [studentLookupState, setStudentLookupState] =
    useState<LookupState>("idle");
  const [studentLookupMessage, setStudentLookupMessage] = useState("");
  const [studentDetails, setStudentDetails] = useState<unknown>(null);
  const studentName =
    readNestedValue(studentDetails, [
      "student_name",
      "studentName",
      "name",
      "student_full_name",
      "full_name"
    ]) || "Student Name";
  const studentId =
    readNestedValue(studentDetails, [
      "student_id",
      "studentId",
      "id",
      "student_number",
      "student_no"
    ]) || readNestedValue(studentDetails, ["admission_no", "admissionNo"]) || "Not available";
  const academicYearId =
    readNestedValue(studentDetails, [
      "academic_year_id",
      "academicYearId",
      "academic_id"
    ]) || "Not available";
  const academicYear =
    readNestedValue(studentDetails, ["academic_year", "academicYear", "year"]) ||
    "Not available";
  const className =
    readNestedValue(studentDetails, [
      "class",
      "class_name",
      "className",
      "course_name",
      "grade"
    ]) || "Not available";
  const studentType =
    readNestedValue(studentDetails, [
      "student_type",
      "studentType",
      "residential_type",
      "residentialType"
    ]) || "Not available";
  const quickSummary = [
    { icon: Calendar, label: "Academic Year", value: academicYear },
    { icon: GraduationCap, label: "Class", value: className },
    { icon: UserRound, label: "Student Type", value: studentType }
  ];
  const profileItems = [
    {
      icon: UserRound,
      label: "Parent Name",
      value:
        readNestedValue(studentDetails, [
          "parent_name",
          "parentName",
          "father_name",
          "fatherName"
        ]) || "Not available"
    },
    {
      icon: Landmark,
      label: "Branch",
      value:
        readNestedValue(studentDetails, [
          "branch",
          "branch_name",
          "branchName",
          "campus_name",
          "campusName"
        ]) || "Not available"
    },
    { icon: GraduationCap, label: "Class", value: className },
    {
      icon: Compass,
      label: "Orientation",
      value:
        readNestedValue(studentDetails, [
          "orientation",
          "orientation_name",
          "orientationName"
        ]) || "Not available"
    },
    { icon: UserRoundSearch, label: "Student Type", value: studentType }
  ];

  useEffect(() => {
    setStudentAdmissionNo(readStoredAdmissionNo());
  }, []);

  async function handleStudentDetailsLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const admissionNo = writeStoredAdmissionNo(studentAdmissionNo);

    if (!admissionNo.trim()) {
      setStudentLookupState("error");
      setStudentLookupMessage("Please enter an admission number.");
      return;
    }

    setStudentAdmissionNo(admissionNo);
    setStudentLookupState("loading");
    setStudentLookupMessage("Fetching student details. Please wait.");
    setStudentDetails(null);

    try {
      const response = await fetch(
        `/api/student/details?admissionNo=${encodeURIComponent(admissionNo)}`
      );
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(
          result && typeof result.message === "string"
            ? result.message
            : "Unable to fetch student details."
        );
      }

      setStudentDetails(result.data);
      setStudentLookupState("success");
      setStudentLookupMessage("Student details fetched successfully.");
    } catch (error) {
      setStudentLookupState("error");
      setStudentLookupMessage(
        error instanceof Error ? error.message : "Unable to fetch student details."
      );
    }
  }

  function handleStudentDetailsClear() {
    setStudentAdmissionNo(writeStoredAdmissionNo("SCS"));
    setStudentLookupState("idle");
    setStudentLookupMessage("");
    setStudentDetails(null);
  }

  return (
    <div className="mt-8 grid gap-5">
      <Card className="w-full rounded-[8px] border-[#315EFF]/38 bg-[linear-gradient(145deg,rgba(8,20,39,.78),rgba(3,11,24,.62))] p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <UserRoundSearch className="h-5 w-5 text-[#00E7B0]" />
          <h2 className="text-[16px] font-bold text-white">Search Student</h2>
        </div>
        <form
          className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px]"
          onSubmit={handleStudentDetailsLookup}
        >
          <label className="grid gap-2">
            <span className="text-[13px] text-[#C9D4E7]">Admission Number</span>
            <div className="relative">
              <Input
                className="h-12 rounded-[6px] border-[#34445E] bg-[#061226]/72 pl-12 text-[14px] placeholder:text-[#8CA3C7] focus:border-[#00E7B0]/60"
                onChange={(event) =>
                  setStudentAdmissionNo(normalizeAdmissionNo(event.target.value))
                }
                placeholder="Enter admission number"
                value={studentAdmissionNo}
              />
              <UserRoundSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#AFC0D9]" />
            </div>
          </label>
          <Button
            className="mt-auto h-12 rounded-[6px]"
            disabled={studentLookupState === "loading"}
            type="submit"
          >
            {studentLookupState === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Search Student
          </Button>
          <Button
            className="mt-auto h-12 rounded-[6px]"
            disabled={studentLookupState === "loading"}
            onClick={handleStudentDetailsClear}
            type="button"
            variant="ghost"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </Button>
        </form>
        {studentLookupMessage ? (
          <div
            className={cn(
              "mt-4 rounded-[8px] border px-4 py-3 text-sm font-semibold",
              studentLookupState === "success" &&
                "border-[#00E7B0]/25 bg-[#00E7B0]/10 text-[#00E7B0]",
              studentLookupState === "error" &&
                "border-[#FF4D6D]/25 bg-[#FF4D6D]/10 text-[#FF4D6D]",
              studentLookupState === "loading" &&
                "border-[#4D6FFF]/25 bg-[#4D6FFF]/10 text-[#6F8BFF]"
            )}
          >
            {studentLookupMessage}
          </div>
        ) : null}
      </Card>

      {!studentDetails ? null : (
        <>

      <motion.section
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[8px] border border-[#315EFF]/40 bg-[linear-gradient(145deg,rgba(8,20,39,.82),rgba(3,11,24,.62))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.045),0_18px_46px_rgba(0,0,0,.28)] sm:p-7"
        initial={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.38, ease: "easeOut" }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_9%_20%,rgba(139,92,246,.14),transparent_25%),radial-gradient(circle_at_78%_20%,rgba(49,94,255,.08),transparent_34%)]" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="relative grid h-[112px] w-[112px] shrink-0 place-items-center rounded-full border-[3px] border-[#9333EA] bg-[#24114B] shadow-[0_0_34px_rgba(147,51,234,.24)]">
            <div className="grid place-items-center text-[#9333EA]">
              <div className="h-9 w-9 rounded-full bg-current" />
              <div className="mt-3 h-8 w-16 rounded-t-full bg-current" />
            </div>
            <div className="absolute bottom-1 right-2 grid h-8 w-8 place-items-center rounded-full bg-[#00E7B0] text-[#02111D] shadow-[0_0_22px_rgba(0,231,176,.34)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-[24px] font-semibold leading-tight text-white">
                {studentName}
              </h2>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#00E7B0]/22 bg-[#00E7B0]/10 px-3 py-1 text-[11px] font-bold text-[#00E7B0]">
                <span className="h-2 w-2 rounded-full bg-[#00E7B0]" />
                Active
              </span>
            </div>
            <p className="mt-2 text-[14px] text-[#AFC0D9]">
              Student ID: <span className="font-semibold text-[#6F8BFF]">{studentId}</span>
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {profileItems.map((item, index) => {
                const Icon = item.icon;

                return (
                  <div
                    className={cn(
                      "flex min-w-0 items-center gap-3",
                      index > 0 && "xl:border-l xl:border-white/10 xl:pl-5"
                    )}
                    key={item.label}
                  >
                    <Icon className="h-5 w-5 shrink-0 text-[#6F6DFF]" />
                    <div className="min-w-0">
                      <p className="text-[11px] text-[#8CA3C7]">{item.label}</p>
                      <p className="mt-1 truncate text-[13px] font-bold text-white">
                        {item.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="rounded-[8px] border-[#315EFF]/32 bg-[linear-gradient(145deg,rgba(8,20,39,.76),rgba(3,11,24,.62))] p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-[8px] bg-[#7C3AED]/18 text-[#A78BFA]">
              <BookOpen className="h-5 w-5" />
            </div>
            <h3 className="text-[16px] font-bold text-white">Academic Information</h3>
          </div>
          <div className="mt-5 overflow-hidden rounded-[8px] border border-white/8 bg-[#07172D]/70">
            {[
              ["Academic Year ID", academicYearId],
              ["Academic Year", academicYear]
            ].map(([label, value], index) => (
              <div
                className={cn(
                  "flex items-center justify-between px-4 py-4 text-[13px]",
                  index > 0 && "border-t border-white/8"
                )}
                key={label}
              >
                <span className="text-[#8CA3C7]">{label}</span>
                <span className="font-semibold text-white">{value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-[8px] border-[#315EFF]/32 bg-[linear-gradient(145deg,rgba(8,20,39,.76),rgba(3,11,24,.62))] p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-[8px] bg-[#315EFF]/18 text-[#7EA0FF]">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="text-[16px] font-bold text-white">Quick Summary</h3>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {quickSummary.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  className="rounded-[8px] border border-dashed border-[#315EFF]/32 bg-[#061226]/56 p-4"
                  key={item.label}
                >
                  <Icon className="h-5 w-5 text-[#6F6DFF]" />
                  <p className="mt-5 text-[11px] text-[#8CA3C7]">{item.label}</p>
                  <p className="mt-1 text-[14px] font-semibold text-white">
                    {item.value}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      </section>
        </>
      )}
    </div>
  );
}

type BookListRow = {
  amount: string;
  category: string;
  isWizklub: string;
  kitId: string;
  kitName: string;
  kitPrice: string;
  productCode: string;
  productHead: string;
  productId: string;
  productName: string;
  salePrice: string;
  spmid: string;
  taxRate: string;
};

type StudentBookSummary = {
  academicYear: string;
  admissionNo: string;
  branch: string;
  checkPurchaseSed: string;
  checkPurchaseWizklub: string;
  className: string;
  parentName: string;
  pickUpDetails: string;
  pickupNote: string;
  pickupType: string;
  state: string;
  studentName: string;
  studentType: string;
  syllabus: string;
};

function readRecordValue(source: Record<string, unknown>, key: string, fallback = "-") {
  const value = source[key];

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const text = String(value).trim();

    return text || fallback;
  }

  return fallback;
}

const enabledBookRows: BookListRow[] = [
  {
    amount: "125",
    category: "Book Kits",
    isWizklub: "-",
    kitId: "42694",
    kitName: "7th - TG CBSE C4 IPL /IPL Roots Syllabus KIT (DS) (26-27) (DGTL)",
    kitPrice: "17483",
    productCode: "Service_9985993",
    productHead: "TH",
    productId: "77267",
    productName: "26CH_AP/TS CBSE : Life Skills - 6th to 9th Class",
    salePrice: "-",
    spmid: "-",
    taxRate: "-"
  },
  {
    amount: "250",
    category: "Book Kits",
    isWizklub: "-",
    kitId: "42694",
    kitName: "7th - TG CBSE C4 IPL /IPL Roots Syllabus KIT (DS) (26-27) (DGTL)",
    kitPrice: "17483",
    productCode: "Service_9985993",
    productHead: "TH",
    productId: "77266",
    productName: "26AH_AP/TS CBSE : Lab Management (Math-Phy-Che-Bio) - 6th to 9th",
    salePrice: "-",
    spmid: "-",
    taxRate: "-"
  },
  {
    amount: "600",
    category: "Book Kits",
    isWizklub: "-",
    kitId: "42694",
    kitName: "7th - TG CBSE C4 IPL /IPL Roots Syllabus KIT (DS) (26-27) (DGTL)",
    kitPrice: "17483",
    productCode: "Service_9985993",
    productHead: "TH",
    productId: "74885",
    productName: "26CH : Olympiads - CBSE",
    salePrice: "-",
    spmid: "-",
    taxRate: "-"
  },
  {
    amount: "125",
    category: "Book Kits",
    isWizklub: "-",
    kitId: "42694",
    kitName: "7th - TG CBSE C4 IPL /IPL Roots Syllabus KIT (DS) (26-27) (DGTL)",
    kitPrice: "17483",
    productCode: "EXP1056319",
    productHead: "CH",
    productId: "76881",
    productName: "26CHC : Additional Material - 6th to 9th Class (AP & TG)",
    salePrice: "-",
    spmid: "-",
    taxRate: "-"
  },
  {
    amount: "240",
    category: "Book Kits",
    isWizklub: "-",
    kitId: "42694",
    kitName: "7th - TG CBSE C4 IPL /IPL Roots Syllabus KIT (DS) (26-27) (DGTL)",
    kitPrice: "17483",
    productCode: "BP26AHSC12313",
    productHead: "CH",
    productId: "76390",
    productName: "26AH7_TS State/CBSE : IPE Prime Book - 7th Class",
    salePrice: "-",
    spmid: "-",
    taxRate: "-"
  },
  {
    amount: "8943",
    category: "Book Kits",
    isWizklub: "-",
    kitId: "42694",
    kitName: "7th - TG CBSE C4 IPL /IPL Roots Syllabus KIT (DS) (26-27) (DGTL)",
    kitPrice: "17483",
    productCode: "KT26CBSC12795",
    productHead: "CH",
    productId: "77911",
    productName: "026027 : 7th Class - TG CBSE C4-IPL /IPL Roots Books KIT",
    salePrice: "-",
    spmid: "-",
    taxRate: "-"
  },
  {
    amount: "4000",
    category: "Book Kits",
    isWizklub: "-",
    kitId: "42694",
    kitName: "7th - TG CBSE C4 IPL /IPL Roots Syllabus KIT (DS) (26-27) (DGTL)",
    kitPrice: "17483",
    productCode: "SERVICE_999293",
    productHead: "CH",
    productId: "74890",
    productName: "26CH : Infinity Meta - High School - TG CBSE (6th to 10th Class)",
    salePrice: "-",
    spmid: "-",
    taxRate: "-"
  },
  {
    amount: "3200",
    category: "Book Kits",
    isWizklub: "-",
    kitId: "42694",
    kitName: "7th - TG CBSE C4 IPL /IPL Roots Syllabus KIT (DS) (26-27) (DGTL)",
    kitPrice: "17483",
    productCode: "Service_9985993",
    productHead: "TH",
    productId: "77274",
    productName: "26CH7_AP/TS CBSE : Activities - 7th Class (DGTL)",
    salePrice: "-",
    spmid: "-",
    taxRate: "-"
  },
  {
    amount: "-",
    category: "Individual Products",
    isWizklub: "No",
    kitId: "-",
    kitName: "-",
    kitPrice: "-",
    productCode: "-",
    productHead: "-",
    productId: "20350",
    productName: "23CH7_AP/TS:-Telugu Hand Writing Book - 7th Class",
    salePrice: "140.00",
    spmid: "11783",
    taxRate: "0.00"
  },
  {
    amount: "-",
    category: "Individual Products",
    isWizklub: "No",
    kitId: "-",
    kitName: "-",
    kitPrice: "-",
    productCode: "-",
    productHead: "-",
    productId: "23974",
    productName: "23CH7_AP/TS/CBSE:- Hindi Hand Writing Book - 7th Class",
    salePrice: "140.00",
    spmid: "13385",
    taxRate: "0.00"
  },
  {
    amount: "-",
    category: "Individual Products",
    isWizklub: "No",
    kitId: "-",
    kitName: "-",
    kitPrice: "-",
    productCode: "-",
    productHead: "-",
    productId: "75537",
    productName: "Exam Pad-Broad Ruled - (100 Pages) (Optional)",
    salePrice: "90.00",
    spmid: "16713",
    taxRate: "0.00"
  },
  {
    amount: "-",
    category: "Individual Products",
    isWizklub: "Yes",
    kitId: "-",
    kitName: "-",
    kitPrice: "-",
    productCode: "-",
    productHead: "-",
    productId: "76831",
    productName: "26CC : Value Added Services _Wizklub Futurz (3rd to 9th Class)",
    salePrice: "5850.00",
    spmid: "17042",
    taxRate: "18.00"
  },
  {
    amount: "-",
    category: "Individual Products",
    isWizklub: "No",
    kitId: "-",
    kitName: "-",
    kitPrice: "-",
    productCode: "-",
    productHead: "-",
    productId: "81644",
    productName: "26CC_AP/TG/KMM : SED VYBE 1 (1st to 10th Class)",
    salePrice: "1770.00",
    spmid: "18676",
    taxRate: "18.00"
  },
  {
    amount: "-",
    category: "Second Language Products",
    isWizklub: "No",
    kitId: "-",
    kitName: "-",
    kitPrice: "-",
    productCode: "-",
    productHead: "-",
    productId: "72949",
    productName: "25CH7_CBSE:- Hindi SL - 7th Class",
    salePrice: "220.00",
    spmid: "15596",
    taxRate: "0.00"
  },
  {
    amount: "-",
    category: "Second Language Products",
    isWizklub: "No",
    kitId: "-",
    kitName: "-",
    kitPrice: "-",
    productCode: "-",
    productHead: "-",
    productId: "76272",
    productName: "26CH7_CBSE:- Sanskrit SL - 7th Class",
    salePrice: "100.00",
    spmid: "16861",
    taxRate: "0.00"
  },
  {
    amount: "-",
    category: "Second Language Products",
    isWizklub: "No",
    kitId: "-",
    kitName: "-",
    kitPrice: "-",
    productCode: "-",
    productHead: "-",
    productId: "72977",
    productName: "25CH7_CBSE:- Telugu SL (TS) - 7th Class",
    salePrice: "165.00",
    spmid: "15625",
    taxRate: "0.00"
  },
  {
    amount: "-",
    category: "Third Language Products",
    isWizklub: "No",
    kitId: "-",
    kitName: "-",
    kitPrice: "-",
    productCode: "-",
    productHead: "-",
    productId: "72971",
    productName: "25CH7_CBSE:- Telugu TL - 7th Class",
    salePrice: "110.00",
    spmid: "15619",
    taxRate: "0.00"
  },
  {
    amount: "-",
    category: "Third Language Products",
    isWizklub: "No",
    kitId: "-",
    kitName: "-",
    kitPrice: "-",
    productCode: "-",
    productHead: "-",
    productId: "76275",
    productName: "26CH7_CBSE : Hindi TL (Bal Vatika) - 7th Class",
    salePrice: "100.00",
    spmid: "16875",
    taxRate: "0.00"
  },
  {
    amount: "-",
    category: "Third Language Products",
    isWizklub: "No",
    kitId: "-",
    kitName: "-",
    kitPrice: "-",
    productCode: "-",
    productHead: "-",
    productId: "76277",
    productName: "26CH7_CBSE : Sanskrit TL - 7th Class",
    salePrice: "75.00",
    spmid: "16862",
    taxRate: "0.00"
  }
];

const defaultStudentBookSummary: StudentBookSummary = {
  academicYear: "2026-2027",
  admissionNo: "SCS1766316",
  branch: "Jubileehills",
  checkPurchaseSed: "0",
  checkPurchaseWizklub: "0",
  className: "7th Class-C4IPLA",
  parentName: "Existing",
  pickUpDetails: "Yes",
  pickupNote: "(Charges will apply one time only in academic year)",
  pickupType: "Through Courier",
  state: "Telangana",
  studentName: "Havish Sambari",
  studentType: "Ts Central Ipl",
  syllabus: "3"
};

function mapBookListResponse(payload: unknown) {
  const record =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const rows: BookListRow[] = [];
  const kits = Array.isArray(record.kits) ? record.kits : [];
  const products = Array.isArray(record.products) ? record.products : [];
  const pickupTypes = Array.isArray(record.pickup_type) ? record.pickup_type : [];
  const states = Array.isArray(record.states) ? record.states : [];
  const selectedPickup =
    pickupTypes
      .map((item) => (item && typeof item === "object" ? (item as Record<string, unknown>) : null))
      .find((item) => item && readRecordValue(item, "code", "") && readRecordValue(item, "code", "") !== "0") ||
    null;
  const selectedState =
    states
      .map((item) => (item && typeof item === "object" ? (item as Record<string, unknown>) : null))
      .find((item) => item && readRecordValue(item, "id", "") && readRecordValue(item, "id", "") !== "0") ||
    null;

  kits.forEach((kitGroup) => {
    if (!kitGroup || typeof kitGroup !== "object") {
      return;
    }

    const groupRecord = kitGroup as Record<string, unknown>;
    const category = readRecordValue(groupRecord, "name", "Book Kits");
    const kitList = Array.isArray(groupRecord.list) ? groupRecord.list : [];

    kitList.forEach((kit) => {
      if (!kit || typeof kit !== "object") {
        return;
      }

      const kitRecord = kit as Record<string, unknown>;
      const kitItems = Array.isArray(kitRecord.kit_list_data)
        ? kitRecord.kit_list_data
        : [];

      kitItems.forEach((product) => {
        if (!product || typeof product !== "object") {
          return;
        }

        const productRecord = product as Record<string, unknown>;

        rows.push({
          amount: readRecordValue(productRecord, "amount"),
          category,
          isWizklub: "-",
          kitId: readRecordValue(kitRecord, "kit_id"),
          kitName: readRecordValue(kitRecord, "kit_name"),
          kitPrice: readRecordValue(kitRecord, "kit_price"),
          productCode: readRecordValue(productRecord, "product_code"),
          productHead: readRecordValue(productRecord, "product_head"),
          productId: readRecordValue(productRecord, "product_id"),
          productName: readRecordValue(productRecord, "product_name"),
          salePrice: "-",
          spmid: readRecordValue(productRecord, "spmid"),
          taxRate: "-"
        });
      });
    });
  });

  products.forEach((group) => {
    if (!group || typeof group !== "object") {
      return;
    }

    const groupRecord = group as Record<string, unknown>;
    const category = readRecordValue(groupRecord, "name", "Products");
    const productList = Array.isArray(groupRecord.list) ? groupRecord.list : [];

    productList.forEach((product) => {
      if (!product || typeof product !== "object") {
        return;
      }

      const productRecord = product as Record<string, unknown>;

      rows.push({
        amount: "-",
        category,
        isWizklub:
          readRecordValue(productRecord, "is_wizklub", "false").toLowerCase() === "true"
            ? "Yes"
            : "No",
        kitId: "-",
        kitName: "-",
        kitPrice: "-",
        productCode: "-",
        productHead: "-",
        productId: readRecordValue(productRecord, "product_id"),
        productName: readRecordValue(productRecord, "product_name"),
        salePrice: readRecordValue(productRecord, "sale_price"),
        spmid: readRecordValue(productRecord, "spmid"),
        taxRate: readRecordValue(productRecord, "tax_rate")
      });
    });
  });

  return {
    rows,
    summary: {
      academicYear: readRecordValue(record, "academic_year", defaultStudentBookSummary.academicYear),
      admissionNo: readRecordValue(record, "admission_no", defaultStudentBookSummary.admissionNo),
      branch: readRecordValue(record, "school", defaultStudentBookSummary.branch),
      checkPurchaseSed: readRecordValue(record, "check_purchase_SED", "0"),
      checkPurchaseWizklub: readRecordValue(record, "check_purchase_wizklub", "0"),
      className: readRecordValue(record, "academic_id", defaultStudentBookSummary.className),
      parentName: readRecordValue(record, "transfer_status", defaultStudentBookSummary.parentName),
      pickUpDetails: readRecordValue(record, "pick_up_details", defaultStudentBookSummary.pickUpDetails),
      pickupNote: defaultStudentBookSummary.pickupNote,
      pickupType: selectedPickup
        ? readRecordValue(selectedPickup, "name", defaultStudentBookSummary.pickupType).replace(/\(.+\)/, "").trim()
        : defaultStudentBookSummary.pickupType,
      state: selectedState
        ? readRecordValue(selectedState, "name", defaultStudentBookSummary.state)
        : defaultStudentBookSummary.state,
      studentName: defaultStudentBookSummary.studentName,
      studentType: readRecordValue(record, "orientation_name", defaultStudentBookSummary.studentType),
      syllabus: readRecordValue(record, "syllabus", defaultStudentBookSummary.syllabus)
    }
  };
}

function StudentBookListView() {
  const [bookAdmissionNo, setBookAdmissionNo] = useState("SCS");
  const [hasSearched, setHasSearched] = useState(false);
  const [bookLookupState, setBookLookupState] = useState<LookupState>("idle");
  const [bookLookupMessage, setBookLookupMessage] = useState("");
  const [bookRows, setBookRows] = useState<BookListRow[]>([]);
  const [studentSummary, setStudentSummary] =
    useState<StudentBookSummary>(defaultStudentBookSummary);
  const [openBookSections, setOpenBookSections] = useState<Record<string, boolean>>({
    "Book Kits": false,
    "Individual Products": false,
    "Second Language Products": false,
    "Third Language Products": false
  });
  const studentDetailItems = [
    { icon: UserRound, label: "Admission No.", value: studentSummary.admissionNo },
    { icon: Calendar, label: "Academic Year", value: studentSummary.academicYear },
    { icon: GraduationCap, label: "Class", value: studentSummary.className },
    { icon: Compass, label: "Orientation", value: studentSummary.studentType },
    { icon: Landmark, label: "School", value: studentSummary.branch },
    { icon: FileText, label: "Syllabus", value: studentSummary.syllabus },
    { icon: RefreshCcw, label: "Transfer Status", value: studentSummary.parentName },
    { icon: Package, label: "Pick Up Details", value: studentSummary.pickUpDetails }
  ];
  const visibleBooks = hasSearched ? bookRows : [];
  const bookKitRows = visibleBooks.filter((book) => book.category === "Book Kits");
  const hasPickupOption = studentSummary.pickUpDetails.toLowerCase() === "yes";
  const productGroups = [
    {
      allowQuantity: true,
      name: "Individual Products",
      rows: visibleBooks.filter((book) => book.category === "Individual Products")
    },
    {
      allowQuantity: false,
      name: "Second Language Products",
      rows: visibleBooks.filter((book) => book.category === "Second Language Products")
    },
    {
      allowQuantity: false,
      name: "Third Language Products",
      rows: visibleBooks.filter((book) => book.category === "Third Language Products")
    }
  ];
  const collapsedProductGroups = [
    "Memoir Products",
    "Spark Products",
    "Rankguru Products"
  ];
  const displayClass = studentSummary.className.split("-")[0] || studentSummary.className;

  function getBookType(book: BookListRow) {
    if (book.category === "Book Kits") {
      return "Book Kit";
    }

    if (book.isWizklub === "Yes") {
      return "Wizklub";
    }

    if (book.productName.toLowerCase().includes("sed")) {
      return "SED";
    }

    return "Book";
  }

  function getBookPrice(book: BookListRow) {
    const amount = book.amount !== "-" ? book.amount : book.salePrice;
    const numericAmount = Number(amount);

    if (Number.isNaN(numericAmount)) {
      return amount;
    }

    return numericAmount.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    });
  }

  useEffect(() => {
    setBookAdmissionNo(readStoredAdmissionNo());
  }, []);

  async function handleBookSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const admissionNo = writeStoredAdmissionNo(bookAdmissionNo);

    if (!admissionNo.trim()) {
      setBookLookupState("error");
      setBookLookupMessage("Please enter an admission number.");
      return;
    }

    setBookAdmissionNo(admissionNo);
    setBookLookupState("loading");
    setBookLookupMessage("Fetching book list. Please wait.");

    try {
      const response = await fetch("/api/student/book-list", {
        body: JSON.stringify({ admissionNo }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(
          result && typeof result.message === "string"
            ? result.message
            : "Unable to fetch book list."
        );
      }

      const mapped = mapBookListResponse(result.data);

      setBookRows(mapped.rows);
      setStudentSummary(mapped.summary);
      setHasSearched(true);
      setBookLookupState("success");
      setBookLookupMessage("Book list fetched successfully.");
    } catch (error) {
      setHasSearched(false);
      setBookRows([]);
      setBookLookupState("error");
      setBookLookupMessage(
        error instanceof Error ? error.message : "Unable to fetch book list."
      );
    }
  }

  function handleBookClear() {
    setBookAdmissionNo(writeStoredAdmissionNo("SCS"));
    setHasSearched(false);
    setBookLookupState("idle");
    setBookLookupMessage("");
    setBookRows([]);
  }

  function toggleBookSection(section: string) {
    setOpenBookSections((current) => ({
      ...current,
      [section]: !current[section]
    }));
  }

  function handleBookExport() {
    const header = [
      "#",
      "Category",
      "Product ID",
      "Product Name",
      "Product Code",
      "Product Head",
      "Amount",
      "Sale Price",
      "Tax Rate",
      "SPMID",
      "Is Wizklub",
      "Kit ID",
      "Kit Name",
      "Kit Price"
    ];
    const rows = visibleBooks.map((book, index) => [
      String(index + 1),
      book.category,
      book.productId,
      book.productName,
      book.productCode,
      book.productHead,
      book.amount,
      book.salePrice,
      book.taxRate,
      book.spmid,
      book.isWizklub,
      book.kitId,
      book.kitName,
      book.kitPrice
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${studentSummary.admissionNo}-enabled-books.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-8 grid gap-5">
      <Card className="w-full rounded-[8px] border-[#315EFF]/38 bg-[linear-gradient(145deg,rgba(8,20,39,.78),rgba(3,11,24,.62))] p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <UserRoundSearch className="h-5 w-5 text-[#00E7B0]" />
          <h2 className="text-[16px] font-bold text-white">Search Student</h2>
        </div>
        <form
          className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px]"
          onSubmit={handleBookSearch}
        >
          <label className="grid gap-2">
            <span className="text-[13px] text-[#C9D4E7]">Admission Number</span>
            <div className="relative">
              <Input
                className="h-12 rounded-[6px] border-[#34445E] bg-[#061226]/72 pl-12 text-[14px] placeholder:text-[#8CA3C7] focus:border-[#00E7B0]/60"
                onChange={(event) =>
                  setBookAdmissionNo(normalizeAdmissionNo(event.target.value))
                }
                placeholder="Enter admission number"
                value={bookAdmissionNo}
              />
              <UserRoundSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#AFC0D9]" />
            </div>
          </label>
          <Button
            className="mt-auto h-12 rounded-[6px]"
            disabled={bookLookupState === "loading"}
            type="submit"
          >
            {bookLookupState === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Search Student
          </Button>
          <Button
            className="mt-auto h-12 rounded-[6px]"
            disabled={bookLookupState === "loading"}
            onClick={handleBookClear}
            type="button"
            variant="ghost"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </Button>
        </form>
        {bookLookupMessage ? (
          <div
            className={cn(
              "mt-4 rounded-[8px] border px-4 py-3 text-sm font-semibold",
              bookLookupState === "success" &&
                "border-[#00E7B0]/25 bg-[#00E7B0]/10 text-[#00E7B0]",
              bookLookupState === "error" &&
                "border-[#FF4D6D]/25 bg-[#FF4D6D]/10 text-[#FF4D6D]",
              bookLookupState === "loading" &&
                "border-[#4D6FFF]/25 bg-[#4D6FFF]/10 text-[#6F8BFF]"
            )}
          >
            {bookLookupMessage}
          </div>
        ) : null}
      </Card>

      {hasSearched ? (
        <>
          <motion.section
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[8px] border border-[#315EFF]/40 bg-[linear-gradient(145deg,rgba(8,20,39,.82),rgba(3,11,24,.62))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.045),0_18px_46px_rgba(0,0,0,.28)] sm:p-7"
            initial={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.38, ease: "easeOut" }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_9%_20%,rgba(139,92,246,.14),transparent_25%),radial-gradient(circle_at_78%_20%,rgba(49,94,255,.08),transparent_34%)]" />
            <div className="relative z-10">
              <div className="flex items-center gap-4">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[#4D4ADE]/28 text-white shadow-[0_0_24px_rgba(77,74,222,.22)]">
                  <UserRound className="h-5 w-5" />
                </div>
                <h2 className="text-[20px] font-bold text-white">Student Details</h2>
              </div>

              <div className="my-6 h-px bg-white/10" />

              <div className="grid gap-6">
                <div className="grid gap-x-6 gap-y-7 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                  {studentDetailItems.map((item, index) => {
                    const Icon = item.icon;

                    return (
                      <div
                        className={cn(
                          "flex min-w-0 items-start gap-3",
                          index > 0 && "xl:border-l xl:border-white/10 xl:pl-6",
                          index === 5 && "xl:border-l-0 xl:pl-0"
                        )}
                        key={item.label}
                      >
                        <Icon className="mt-1 h-6 w-6 shrink-0 text-[#6F6DFF]" />
                        <div className="min-w-0">
                          <p className="text-[13px] text-[#AFC0D9]">{item.label}</p>
                          <p className="mt-2 break-words text-[15px] font-bold text-white">
                            {item.value}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.section>

          <section className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(260px,.8fr)_minmax(260px,.8fr)]">
            <Card className="rounded-[8px] border-[#315EFF]/38 bg-[linear-gradient(145deg,rgba(8,20,39,.78),rgba(3,11,24,.62))] p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="grid h-11 w-11 place-items-center rounded-[8px] bg-[#38BDF8]/14 text-[#7DD3FC]">
                  <Truck className="h-6 w-6" />
                </div>
                <h3 className="text-[18px] font-bold text-white">Pickup Details</h3>
              </div>
              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-[13px] text-[#AFC0D9]">Pickup Type</p>
                  {hasPickupOption ? (
                    <>
                      <p className="mt-2 text-[15px] font-bold text-white">
                        {studentSummary.pickupType}
                      </p>
                      <p className="mt-1 text-[12px] text-[#AFC0D9]">
                        {studentSummary.pickupNote}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-[14px] font-bold text-[#FF4D6D]">
                      There is no pickup option
                    </p>
                  )}
                </div>
                <div className="flex gap-3 sm:border-l sm:border-white/10 sm:pl-6">
                  <MapPin className="mt-1 h-5 w-5 shrink-0 text-[#6F6DFF]" />
                  <div>
                    <p className="text-[13px] text-[#AFC0D9]">State</p>
                    <p className="mt-2 text-[15px] font-bold text-white">
                      {studentSummary.state}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {[ 
              {
                accent: "bg-[#00E7B0]/14 text-[#00E7B0]",
                count: studentSummary.checkPurchaseWizklub,
                title: "Wizklub Purchase Status"
              },
              {
                accent: "bg-[#F59E0B]/16 text-[#F59E0B]",
                count: studentSummary.checkPurchaseSed,
                title: "SED Purchase Status"
              }
            ].map((status) => (
              <Card
                className="rounded-[8px] border-[#315EFF]/38 bg-[linear-gradient(145deg,rgba(8,20,39,.78),rgba(3,11,24,.62))] p-5 sm:p-6"
                key={status.title}
              >
                <div className="flex items-center gap-4">
                  <div className={cn("grid h-11 w-11 place-items-center rounded-[8px]", status.accent)}>
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                  <h3 className="text-[16px] font-bold text-white">{status.title}</h3>
                </div>
                <div className="mt-8 flex items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "grid h-10 w-10 place-items-center rounded-full text-white",
                        isPositiveCount(status.count)
                          ? "bg-[#00E7B0]/22"
                          : "bg-[#FF4D6D]/22"
                      )}
                    >
                      {isPositiveCount(status.count) ? (
                        <Check className="h-6 w-6" />
                      ) : (
                        <X className="h-6 w-6" />
                      )}
                    </div>
                    <span className="text-[16px] font-bold text-white">
                      {isPositiveCount(status.count) ? "Purchased" : "Not Purchased"}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </section>
        </>
      ) : null}

      <Card className="rounded-[8px] border-[#315EFF]/38 bg-[linear-gradient(145deg,rgba(8,20,39,.78),rgba(3,11,24,.62))] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-[#7C7CFF]" />
            <h2 className="text-[16px] font-bold text-white">Enabled Books</h2>
            <span className="rounded-full border border-white/10 bg-white/[.045] px-3 py-1 text-[11px] font-semibold text-[#C9D4E7]">
              {visibleBooks.length} Items
            </span>
          </div>
        </div>

        {visibleBooks.length > 0 ? (
          <div className="mt-5 grid items-start gap-4 xl:grid-cols-2">
            <section className="overflow-hidden rounded-[7px] border border-[#315EFF]/22 bg-[#07172D]/58">
              <button
                aria-expanded={openBookSections["Book Kits"]}
                className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-white/8 px-4 py-3 text-left transition hover:bg-white/[.025]"
                onClick={() => toggleBookSection("Book Kits")}
                type="button"
              >
                <span className="flex min-w-0 flex-wrap items-center gap-3">
                  <h3 className="text-[13px] font-bold text-white">Book Kits</h3>
                  <span className="max-w-full truncate text-[12px] font-semibold text-[#C9D4E7]">
                    7th - TG CBSE C4 IPL /IPL Roots Syllabus KIT (DS) (26-27) (DGTL)
                  </span>
                  <span className="rounded-full border border-[#00E7B0]/18 bg-[#00E7B0]/12 px-2.5 py-1 text-[10px] font-bold text-[#00E7B0]">
                    Book Kit
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-[13px] font-bold text-[#00E7B0]">
                    Rs.17,483.00
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-[#8CA3C7] transition",
                      openBookSections["Book Kits"] && "rotate-180"
                    )}
                  />
                </span>
              </button>
              {openBookSections["Book Kits"] ? (
                <div className="grid gap-2 border-t border-white/8 p-3">
                  {bookKitRows.map((book, index) => (
                    <div
                      className="grid gap-3 rounded-[6px] border border-white/8 bg-[#061226]/62 px-3 py-3 sm:grid-cols-[36px_minmax(0,1fr)_110px]"
                      key={`${book.productId}-${index}`}
                    >
                      <span className="grid h-7 w-7 place-items-center rounded-[5px] bg-white/[.045] text-[11px] font-bold text-[#C9D4E7]">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold leading-5 text-white">
                          {book.productName}
                        </p>
                        <p className="mt-1 text-[11px] text-[#AFC0D9]">
                          {getBookType(book)} | {displayClass} | English
                        </p>
                      </div>
                      <p className="text-left text-[12px] font-bold text-[#00E7B0] sm:text-right">
                        Rs.{getBookPrice(book)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            {productGroups.map((group) => (
              <section
                className="overflow-hidden rounded-[7px] border border-[#315EFF]/22 bg-[#07172D]/58"
                key={group.name}
              >
                <button
                  aria-expanded={openBookSections[group.name]}
                  className="flex w-full items-center justify-between gap-3 border-b border-white/8 px-4 py-3 text-left transition hover:bg-white/[.025]"
                  onClick={() => toggleBookSection(group.name)}
                  type="button"
                >
                  <span className="flex flex-wrap items-center gap-3">
                    <h3 className="text-[13px] font-bold text-white">{group.name}</h3>
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-[#8CA3C7] transition",
                      openBookSections[group.name] && "rotate-180"
                    )}
                  />
                </button>
                {openBookSections[group.name] ? (
                  <div className="grid gap-2 border-t border-white/8 p-3">
                    {group.rows.map((book, index) => (
                      <div
                        className="grid gap-3 rounded-[6px] border border-white/8 bg-[#061226]/62 px-3 py-3 sm:grid-cols-[36px_minmax(0,1fr)_96px_96px]"
                        key={`${group.name}-${book.productId}`}
                      >
                        <span className="grid h-7 w-7 place-items-center rounded-[5px] bg-white/[.045] text-[11px] font-bold text-[#C9D4E7]">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[12px] font-bold leading-5 text-white">
                            {book.productName}
                          </p>
                          <p className="mt-1 text-[11px] text-[#AFC0D9]">
                            {getBookType(book)} | {displayClass} | English
                          </p>
                        </div>
                        <p className="text-left text-[12px] font-bold text-[#00E7B0] sm:text-right">
                          Rs.{getBookPrice(book)}
                        </p>
                        <span className="inline-flex h-7 min-w-[64px] items-center justify-center rounded-[5px] border border-[#315EFF]/18 bg-[#315EFF]/10 px-2 text-[11px] font-bold text-[#C9D4E7]">
                          {book.spmid}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            ))}

            {collapsedProductGroups.map((group) => (
              <button
                className="flex h-10 items-center justify-between rounded-[7px] border border-[#315EFF]/22 bg-[#07172D]/58 px-4 text-left transition hover:border-[#315EFF]/40 hover:bg-[#0A1B35]/80"
                key={group}
                type="button"
              >
                <span className="flex items-center gap-3">
                  <span className="text-[13px] font-bold text-white">{group}</span>
                </span>
                <ChevronDown className="h-4 w-4 text-[#8CA3C7]" />
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-[7px] border border-white/8 bg-[#07172D]/58 px-4 py-12 text-center text-[13px] text-[#8CA3C7]">
            Search student by admission number to view enabled books.
          </div>
        )}
      </Card>
    </div>
  );
}

const uniformKitRows = [
  {
    code: "TBBELA",
    description: "Belt with school logo and premium finish.",
    imageUrl:
      "https://srichaitanyaapp.s3.ap-south-1.amazonaws.com/prod/uniform_images/TBBELA.jpg",
    name: "Techno Boys Belt - Admiral",
    price: "435.00",
    products: [
      {
        defaultQty: "1",
        name: "State- Techno Boys Logo Belt - Admiral Size L",
        spmid: "18485",
        size: "L",
        totalPrice: "145.00",
        unitPrice: "145.00"
      },
      {
        defaultQty: "1",
        name: "State- Techno Boys Logo Belt - Admiral Size S",
        spmid: "18487",
        size: "S",
        totalPrice: "145.00",
        unitPrice: "145.00"
      },
      {
        defaultQty: "1",
        name: "State- Techno Boys Logo Belt - Admiral Size M",
        spmid: "18486",
        size: "M",
        totalPrice: "145.00",
        unitPrice: "145.00"
      }
    ]
  },
  {
    code: "TMLSBLK",
    description: "Comfortable black school socks.",
    imageUrl:
      "https://srichaitanyaapp.s3.ap-south-1.amazonaws.com/prod/uniform_images/TMLSBLK.jpg",
    name: "Techno Mid Logo Sox - Black",
    price: "180.00",
    products: [
      {
        defaultQty: "3",
        name: "State- Techno Mid Logo Eco Sox - Black Size 3",
        spmid: "18558",
        size: "3",
        totalPrice: "180.00",
        unitPrice: "60.00"
      }
    ]
  },
  {
    code: "TBTARTIC",
    description: "Two pocket tee for regular uniform use.",
    imageUrl:
      "https://srichaitanyaapp.s3.ap-south-1.amazonaws.com/prod/uniform_images/TBTARTIC.jpg",
    name: "Techno PP Boys 2 Pocket Tee - Arctic",
    price: "6,240.00",
    products: [
      ["State- Techno Boys CC Tee - Arctic Pique Size P12", "P12", "18445"],
      ["State- Techno Boys CC Tee - Arctic Pique Size P8", "P8", "18451"],
      ["State- Techno Boys CC Tee - Arctic Pique Size P5", "P5", "18449"],
      ["State- Techno Boys CC Tee - Arctic Pique Size P14", "P14", "18446"],
      ["State- Techno Boys CC Tee - Arctic Pique Size P10", "P10", "18444"],
      ["State- Techno Boys CC Tee - Arctic Pique Size P6", "P6", "18450"],
      ["State- Techno Boys CC Tee - Arctic Pique Size P4", "P4", "18448"],
      ["State- Techno Boys CC Tee - Arctic Pique Size P16", "P16", "18447"]
    ].map(([name, size, spmid]) => ({
      defaultQty: "2",
      name,
      spmid,
      size,
      totalPrice: "780.00",
      unitPrice: "390.00"
    }))
  },
  {
    code: "TBDCSNF",
    description: "Navy fleece drawcord shorts for regular uniform use.",
    imageUrl:
      "https://srichaitanyaapp.s3.ap-south-1.amazonaws.com/prod/uniform_images/TBDCSNF.jpg",
    name: "Techno PP Boys Drawcord Shorts - Navy Flc",
    price: "6,340.00",
    products: [
      ["State- Techno Boys DC Shorts - Navy Flc Size 30", "30", "370.00", "18510"],
      ["State- Techno Boys DC Shorts - Navy Flc Size 26", "26", "350.00", "18508"],
      ["State- Techno Boys DC Shorts - Navy Flc Size 22", "22", "350.00", "18506"],
      ["State- Techno Boys DC Shorts - Navy Flc Size 18", "18", "330.00", "18504"],
      ["State- Techno Boys DC Shorts - Navy Flc Size 32", "32", "370.00", "18728"],
      ["State- Techno Boys DC Shorts - Navy Flc Size 28", "28", "370.00", "18509"],
      ["State- Techno Boys DC Shorts - Navy Flc Size 24", "24", "350.00", "18507"],
      ["State- Techno Boys DC Shorts - Navy Flc Size 20", "20", "330.00", "18505"],
      ["State- Techno Boys DC Shorts - Navy Flc Size 34", "34", "370.00", "18729"]
    ].map(([name, size, unitPrice, spmid]) => ({
      defaultQty: "2",
      name,
      spmid,
      size,
      totalPrice: (Number(unitPrice) * 2).toFixed(2),
      unitPrice
    }))
  },
  {
    code: "TJRSTC",
    description: "Cobalt junior sports track uniform.",
    imageUrl:
      "https://srichaitanyaapp.s3.ap-south-1.amazonaws.com/prod/uniform_images/TJRSTC.jpg",
    name: "Techno Sports Jr. Track - Cobalt",
    price: "3,810.00",
    products: [
      ["State- Techno Jr. Uni RW Cyan Piping Track - Cobalt Dia Size 20L", "20L", "400.00", "18546"],
      ["State- Techno Jr. Uni RW Cyan Piping Track - Cobalt Dia Size 18L", "18L", "400.00", "18544"],
      ["State- Techno Jr. Uni RW Cyan Piping Track - Cobalt Dia Size 34", "34", "450.00", "18555"],
      ["State- Techno Jr. Uni RW Cyan Piping Track - Cobalt Dia Size 28", "28", "450.00", "18551"],
      ["State- Techno Jr. Uni RW Cyan Piping Track - Cobalt Dia Size 22", "22", "430.00", "18547"],
      ["State- Techno Jr. Uni RW Cyan Piping Track - Cobalt Dia Size 20", "20", "400.00", "18545"],
      ["State- Techno Jr. Uni RW Cyan Piping Track - Cobalt Dia Size 18", "18", "400.00", "18543"],
      ["State- Techno Jr. Uni RW Cyan Piping Track - Cobalt Dia Size 31", "31", "450.00", "18553"],
      ["State- Techno Jr. Uni RW Cyan Piping Track - Cobalt Dia Size 25", "25", "430.00", "18549"]
    ].map(([name, size, unitPrice, spmid]) => ({
      defaultQty: "1",
      name,
      spmid,
      size,
      totalPrice: unitPrice,
      unitPrice
    }))
  },
  {
    code: "TSTEEA",
    description: "Arctic sports t-shirt with V collar.",
    imageUrl:
      "https://srichaitanyaapp.s3.ap-south-1.amazonaws.com/prod/uniform_images/TSTEEA.jpg",
    name: "Techno Sports T-Shirt - Arctic",
    price: "2,240.00",
    products: [
      ["State- Techno Uni V Collar Sports Tee - Arctic ME Size 6", "6", "300.00", "18614"],
      ["State- Techno Uni V Collar Sports Tee - Arctic ME Size 16", "16", "350.00", "18608"],
      ["State- Techno Uni V Collar Sports Tee - Arctic ME Size 12", "12", "330.00", "18606"],
      ["State- Techno Uni V Collar Sports Tee - Arctic ME Size 8", "8", "300.00", "18615"],
      ["State- Techno Uni V Collar Sports Tee - Arctic ME Size 5", "5", "300.00", "18613"],
      ["State- Techno Uni V Collar Sports Tee - Arctic ME Size 14", "14", "330.00", "18607"],
      ["State- Techno Uni V Collar Sports Tee - Arctic ME Size 10", "10", "330.00", "18605"]
    ].map(([name, size, unitPrice, spmid]) => ({
      defaultQty: "1",
      name,
      spmid,
      size,
      totalPrice: unitPrice,
      unitPrice
    }))
  }
];

type UniformProductRow = {
  defaultQty: string;
  name: string;
  size: string;
  spmid: string;
  totalPrice: string;
  unitPrice: string;
};

type UniformKitRow = {
  code: string;
  description: string;
  imageUrl: string;
  name: string;
  price: string;
  products: UniformProductRow[];
};

type UniformStudentSummary = {
  academicYear: string;
  admissionNo: string;
  className: string;
  gender: string;
  school: string;
  studentName: string;
};

const defaultUniformStudentSummary: UniformStudentSummary = {
  academicYear: "2026-2027",
  admissionNo: "SCS1340384",
  className: "1st Class - A",
  gender: "Male",
  school: "Ameerpet",
  studentName: "Student Name"
};

function formatUniformAmount(value: string) {
  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return value;
  }

  return numericValue.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  });
}

function mapUniformListResponse(payload: unknown) {
  const record =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const productGroups = Array.isArray(record.products_list)
    ? record.products_list
    : [];
  const kits: UniformKitRow[] = productGroups.map((group) => {
    const groupRecord =
      group && typeof group === "object" ? (group as Record<string, unknown>) : {};
    const products = Array.isArray(groupRecord.products) ? groupRecord.products : [];
    const mappedProducts = products.map((product) => {
      const productRecord =
        product && typeof product === "object"
          ? (product as Record<string, unknown>)
          : {};
      const defaultQty = readRecordValue(productRecord, "default_qty", "0");
      const unitPrice = readRecordValue(productRecord, "sale_price", "0.00");
      const totalPrice = (Number(defaultQty) * Number(unitPrice)).toFixed(2);

      return {
        defaultQty,
        name: readRecordValue(productRecord, "product_name"),
        size: readRecordValue(productRecord, "size"),
        spmid: readRecordValue(productRecord, "spmid"),
        totalPrice,
        unitPrice
      };
    });
    const price = mappedProducts
      .reduce((sum, product) => sum + Number(product.totalPrice || 0), 0)
      .toFixed(2);

    return {
      code: readRecordValue(groupRecord, "category_short_code"),
      description: "Uniform category products available for this student.",
      imageUrl: readRecordValue(groupRecord, "img_url", ""),
      name: readRecordValue(groupRecord, "category_name"),
      price,
      products: mappedProducts
    };
  });

  return {
    kits,
    summary: {
      academicYear: readRecordValue(record, "academic_year", defaultUniformStudentSummary.academicYear),
      admissionNo: readRecordValue(record, "admission_no", defaultUniformStudentSummary.admissionNo),
      className: readRecordValue(record, "academic_id", defaultUniformStudentSummary.className).replace("-", " - "),
      gender: readRecordValue(record, "gender", defaultUniformStudentSummary.gender),
      school: readRecordValue(record, "school", defaultUniformStudentSummary.school),
      studentName: defaultUniformStudentSummary.studentName
    }
  };
}

function UniformListsView() {
  const [uniformAdmissionNo, setUniformAdmissionNo] = useState("SCS");
  const [uniformLookupState, setUniformLookupState] = useState<LookupState>("idle");
  const [uniformLookupMessage, setUniformLookupMessage] = useState("");
  const [uniformRows, setUniformRows] = useState<UniformKitRow[]>([]);
  const [uniformSummary, setUniformSummary] =
    useState<UniformStudentSummary>(defaultUniformStudentSummary);
  const [openUniformKits, setOpenUniformKits] = useState<Record<string, boolean>>({
    "Techno Boys Belt - Admiral": true
  });
  const totalProducts = uniformRows.reduce(
    (count, kit) => count + kit.products.length,
    0
  );
  const totalQuantity = uniformRows.reduce(
    (count, kit) =>
      count +
      kit.products.reduce(
        (productCount, product) => productCount + Number(product.defaultQty || 0),
        0
      ),
    0
  );
  const studentDetails = [
    { icon: Landmark, label: "School", value: uniformSummary.school },
    { icon: FileText, label: "Class", value: uniformSummary.className },
    { icon: Calendar, label: "Academic Year", value: uniformSummary.academicYear },
    { icon: UserRound, label: "Gender", value: uniformSummary.gender }
  ];

  useEffect(() => {
    setUniformAdmissionNo(readStoredAdmissionNo());
  }, []);

  async function handleUniformSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const admissionNo = writeStoredAdmissionNo(uniformAdmissionNo);

    setUniformAdmissionNo(admissionNo);
    setUniformLookupState("loading");
    setUniformLookupMessage("Fetching uniform list. Please wait.");

    try {
      const response = await fetch("/api/student/uniform-list", {
        body: JSON.stringify({ admissionNo }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(
          result && typeof result.message === "string"
            ? result.message
            : "Unable to fetch uniform list."
        );
      }

      const mapped = mapUniformListResponse(result.data);

      setUniformRows(mapped.kits);
      setUniformSummary(mapped.summary);
      setOpenUniformKits({});
      setUniformLookupState("success");
      setUniformLookupMessage("Uniform list fetched successfully.");
    } catch (error) {
      setUniformLookupState("error");
      setUniformLookupMessage(
        error instanceof Error ? error.message : "Unable to fetch uniform list."
      );
    }
  }

  function handleUniformClear() {
    setUniformAdmissionNo(writeStoredAdmissionNo("SCS"));
    setUniformLookupState("idle");
    setUniformLookupMessage("");
    setUniformRows([]);
    setUniformSummary(defaultUniformStudentSummary);
    setOpenUniformKits({});
  }

  function toggleUniformKit(name: string) {
    setOpenUniformKits((current) => ({
      ...current,
      [name]: !current[name]
    }));
  }

  return (
    <div className="mt-8 grid gap-5">
      <Card className="w-full rounded-[8px] border-[#315EFF]/38 bg-[linear-gradient(145deg,rgba(8,20,39,.78),rgba(3,11,24,.62))] p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <UserRoundSearch className="h-5 w-5 text-[#00E7B0]" />
          <h2 className="text-[16px] font-bold text-white">Search Student</h2>
        </div>
        <form
          className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px]"
          onSubmit={handleUniformSearch}
        >
          <label className="grid gap-2">
            <span className="text-[13px] text-[#C9D4E7]">Admission Number</span>
            <div className="relative">
              <Input
                className="h-12 rounded-[6px] border-[#34445E] bg-[#061226]/72 pl-12 text-[14px] placeholder:text-[#8CA3C7] focus:border-[#00E7B0]/60"
                onChange={(event) =>
                  setUniformAdmissionNo(normalizeAdmissionNo(event.target.value))
                }
                placeholder="Enter admission number"
                value={uniformAdmissionNo}
              />
              <UserRoundSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#AFC0D9]" />
            </div>
          </label>
          <Button
            className="mt-auto h-12 rounded-[6px]"
            disabled={uniformLookupState === "loading"}
            type="submit"
          >
            {uniformLookupState === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Search Student
          </Button>
          <Button
            className="mt-auto h-12 rounded-[6px]"
            disabled={uniformLookupState === "loading"}
            onClick={handleUniformClear}
            type="button"
            variant="ghost"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear
          </Button>
        </form>
        {uniformLookupMessage ? (
          <div
            className={cn(
              "mt-4 rounded-[8px] border px-4 py-3 text-sm font-semibold",
              uniformLookupState === "success" &&
                "border-[#00E7B0]/25 bg-[#00E7B0]/10 text-[#00E7B0]",
              uniformLookupState === "error" &&
                "border-[#FF4D6D]/25 bg-[#FF4D6D]/10 text-[#FF4D6D]",
              uniformLookupState === "loading" &&
                "border-[#4D6FFF]/25 bg-[#4D6FFF]/10 text-[#6F8BFF]"
            )}
          >
            {uniformLookupMessage}
          </div>
        ) : null}
      </Card>

      {uniformRows.length > 0 ? (
      <section className="rounded-[8px] border border-[#315EFF]/30 bg-[linear-gradient(145deg,rgba(8,20,39,.82),rgba(3,11,24,.62))] p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_repeat(4,minmax(150px,.5fr))]">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-[#7C3AED] text-white">
              <UserRound className="h-7 w-7" />
            </div>
            <div>
              <p className="text-[12px] text-[#AFC0D9]">Student Details</p>
              <h2 className="text-[20px] font-bold text-white">Student Name</h2>
              <p className="text-[12px] text-[#C9D4E7]">
                Admission No:{" "}
                <span className="font-semibold">{uniformSummary.admissionNo}</span>
              </p>
            </div>
          </div>
          {studentDetails.map((item, index) => {
            const Icon = item.icon;

            return (
              <div
                className={cn(
                  "flex items-center gap-3",
                  index > 0 && "lg:border-l lg:border-white/10 lg:pl-5"
                )}
                key={item.label}
              >
                <div className="grid h-10 w-10 place-items-center rounded-[8px] bg-[#315EFF]/12 text-[#6F8BFF]">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[12px] text-[#AFC0D9]">{item.label}</p>
                  <p className="mt-1 text-[13px] font-bold text-white">{item.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      ) : null}

      {uniformRows.length > 0 ? (
      <Card className="rounded-[8px] border-[#315EFF]/38 bg-[linear-gradient(145deg,rgba(8,20,39,.78),rgba(3,11,24,.62))] p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <Shirt className="h-5 w-5 text-[#7C7CFF]" />
          <h2 className="text-[16px] font-bold text-white">Uniform Kits</h2>
          <span className="rounded-full border border-white/10 bg-white/[.045] px-3 py-1 text-[11px] font-semibold text-[#C9D4E7]">
            {uniformRows.length} Kits
          </span>
        </div>

        <section className="mt-5 grid gap-4 lg:grid-cols-3">
          {[
            {
              icon: Package,
              label: "Total Categories",
              subLabel: "Uniform categories available",
              value: uniformRows.length
            },
            {
              icon: ShoppingBag,
              label: "Total Products",
              subLabel: "Products in all kits",
              value: totalProducts
            },
            {
              icon: ShoppingBag,
              label: "Total Quantity",
              subLabel: "Default quantity",
              value: totalQuantity
            }
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                className="rounded-[8px] border border-[#315EFF]/20 bg-[#061226]/62 p-5"
                key={item.label}
              >
                <div className="flex items-center gap-4">
                  <div className="grid h-11 w-11 place-items-center rounded-[8px] bg-[#00E7B0]/12 text-[#00E7B0]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[12px] text-[#AFC0D9]">{item.label}</p>
                    <p className="text-[24px] font-bold text-white">{item.value}</p>
                    <p className="text-[12px] text-[#AFC0D9]">{item.subLabel}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <div className="mt-5 grid gap-3">
          {uniformRows.map((kit) => {
            const isOpen = Boolean(openUniformKits[kit.name]);

            return (
              <section
                className="overflow-hidden rounded-[8px] border border-[#315EFF]/22 bg-[#07172D]/58"
                key={kit.name}
              >
                <button
                  aria-expanded={isOpen}
                  className="grid w-full gap-4 p-4 text-left transition hover:bg-white/[.025] md:grid-cols-[120px_minmax(0,1fr)_auto]"
                  onClick={() => toggleUniformKit(kit.name)}
                  type="button"
                >
                  <div className="relative h-[96px] w-[128px] overflow-hidden rounded-[7px] border border-white/10 bg-white">
                    {kit.imageUrl ? (
                      <img
                        alt={kit.name}
                        className="h-full w-full object-contain p-1"
                        src={kit.imageUrl}
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-[#7C7CFF]">
                        <Shirt className="h-9 w-9" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-[16px] font-bold text-white">{kit.name}</h3>
                      <span className="rounded-full bg-[#7C3AED]/18 px-2.5 py-1 text-[10px] font-bold text-[#C4B5FD]">
                        {kit.code}
                      </span>
                    </div>
                    <p className="mt-2 text-[13px] text-[#AFC0D9]">{kit.description}</p>
                  </div>
                  <div className="flex items-center gap-8 md:justify-end">
                    <span className="text-[13px] font-semibold text-[#C9D4E7]">
                      {kit.products.length} Product{kit.products.length === 1 ? "" : "s"}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-[#8CA3C7] transition",
                        isOpen && "rotate-180"
                      )}
                    />
                  </div>
                </button>

                {isOpen ? (
                  <div className="overflow-x-auto border-t border-white/8 px-4 pb-4">
                    <table className="w-full min-w-[760px] border-collapse">
                      <thead>
                        <tr className="bg-white/[.055] text-left text-[12px] font-semibold text-[#C9D4E7]">
                          <th className="px-4 py-3">#</th>
                          <th className="px-4 py-3">Product Name</th>
                          <th className="px-4 py-3 text-center">Size</th>
                          <th className="px-4 py-3 text-center">Default Qty</th>
                          <th className="px-4 py-3 text-right">Unit Price (Rs.)</th>
                          <th className="px-4 py-3 text-right">Total Price (Rs.)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/8">
                        {kit.products.map((product, index) => (
                          <tr
                            className="text-[12px] text-[#D6E0F1]"
                            key={`${kit.name}-${product.name}-${index}`}
                          >
                            <td className="px-4 py-3">{index + 1}</td>
                            <td className="px-4 py-3 font-medium text-white">
                              {product.name}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex min-w-7 justify-center rounded-full bg-[#7C3AED]/18 px-2 py-1 text-[11px] font-bold text-[#C4B5FD]">
                                {product.size}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">{product.defaultQty}</td>
                            <td className="px-4 py-3 text-right font-semibold text-white">
                              {product.unitPrice}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-white">
                              {product.totalPrice}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </Card>
      ) : null}
    </div>
  );
}

const sedSummaryCards = [
  {
    accent: "linear-gradient(135deg,#00D7A8,#00836F)",
    border: "border-[#00E7B0]/44",
    icon: Check,
    label: "Success Payments",
    subLabel: "Total successful SED payments",
    value: "1,256"
  },
  {
    accent: "linear-gradient(135deg,#A855F7,#6D28D9)",
    border: "border-[#A855F7]/44",
    icon: IndianRupee,
    label: "Total Amount",
    subLabel: "Sum of all successful payments",
    value: "₹ 25,78,450.00"
  },
  {
    accent: "linear-gradient(135deg,#4D6FFF,#2538C9)",
    border: "border-[#4D6FFF]/50",
    icon: Calendar,
    label: "Latest Payment",
    subLabel: "Most recent successful payment",
    value: "30 Jun 2026"
  },
];

type SedPaymentRecord = {
  addedOn: string;
  admissionNo: string;
  amount: number | string;
  gateway: string;
  id: string;
  productName: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  status: string;
  student: string;
  transactionId: string;
};

function parseSedPaymentDate(value: string) {
  const match = value.match(
    /^(\d{1,2})-([A-Z]{3})-(\d{2,4})\s+(\d{1,2})\.(\d{2})\.(\d{2})\s+(AM|PM)$/i
  );

  if (!match) {
    return null;
  }

  const [, day, monthName, yearValue, hourValue, minute, second, period] = match;
  const monthIndex = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC"
  ].indexOf(monthName.toUpperCase());

  if (monthIndex < 0) {
    return null;
  }

  const year = Number(yearValue.length === 2 ? `20${yearValue}` : yearValue);
  const rawHour = Number(hourValue);
  const hour =
    period.toUpperCase() === "PM" && rawHour !== 12
      ? rawHour + 12
      : period.toUpperCase() === "AM" && rawHour === 12
        ? 0
        : rawHour;

  return new Date(
    year,
    monthIndex,
    Number(day),
    hour,
    Number(minute),
    Number(second)
  );
}

function formatSedPaymentDate(value: string) {
  const date = parseSedPaymentDate(value);

  if (!date) {
    return value || "Not available";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    hour: "2-digit",
    hour12: true,
    minute: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatSedPaymentAmount(value: number | string) {
  const amount = toAmountNumber(value);

  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(amount);
}

function getSedReceiptUrl(razorpayPaymentId: string) {
  const url = new URL(
    "https://srichaitanyaschool.net/book-kits-payments/download-receipt"
  );

  url.searchParams.set("online_transaction_no", razorpayPaymentId);
  url.searchParams.set("sed_item_id", "1");

  return url.toString();
}

function SedPaymentsView() {
  const [sedRecords, setSedRecords] = useState<SedPaymentRecord[]>([]);
  const [sedLookupState, setSedLookupState] = useState<LookupState>("idle");
  const [sedLookupMessage, setSedLookupMessage] = useState("");
  const [sedPage, setSedPage] = useState(1);
  const [sedSearchInput, setSedSearchInput] = useState("");
  const [sedSearchQuery, setSedSearchQuery] = useState("");
  const [copiedSedTransactionId, setCopiedSedTransactionId] = useState("");
  const [rehitState, setRehitState] = useState<LookupState>("idle");
  const [rehitMessage, setRehitMessage] = useState("");
  const [rehitProgress, setRehitProgress] = useState({
    current: 0,
    failed: 0,
    success: 0,
    total: 0
  });

  const fetchSedPayments = async () => {
    setSedLookupState("loading");
    setSedLookupMessage("Loading SED payments.");

    try {
      const response = await fetch("/api/sed-payments", { cache: "no-store" });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to fetch SED payments.");
      }

      setSedRecords(Array.isArray(result.data) ? result.data : []);
      setSedPage(1);
      setSedLookupState("success");
      setSedLookupMessage(result.message || "SED payments loaded.");
    } catch (error) {
      setSedRecords([]);
      setSedLookupState("error");
      setSedLookupMessage(
        error instanceof Error ? error.message : "Unable to fetch SED payments."
      );
    }
  };

  const handleRefreshSedPayments = async () => {
    setSedSearchInput("");
    setSedSearchQuery("");
    setSedPage(1);
    await fetchSedPayments();
  };

  useEffect(() => {
    fetchSedPayments();
  }, []);

  async function handleRehitPendingSedTransactions() {
    setRehitState("loading");
    setRehitMessage("Fetching pending SED transactions.");
    setRehitProgress({ current: 0, failed: 0, success: 0, total: 0 });

    try {
      const pendingResponse = await fetch("/api/sed-payments/pending", {
        cache: "no-store"
      });
      const pendingResult = await pendingResponse.json();

      if (!pendingResponse.ok || !pendingResult.success) {
        throw new Error(
          pendingResult.message || "Unable to fetch pending SED transactions."
        );
      }

      const pendingTransactions = Array.isArray(pendingResult.data)
        ? pendingResult.data.filter(
            (transactionId: unknown): transactionId is string =>
              typeof transactionId === "string"
          )
        : [];

      if (!pendingTransactions.length) {
        setRehitState("success");
        setRehitMessage("No pending SED transactions found.");
        return;
      }

      let successCount = 0;
      let failedCount = 0;

      setRehitProgress({
        current: 0,
        failed: 0,
        success: 0,
        total: pendingTransactions.length
      });

      for (const [index, transactionId] of pendingTransactions.entries()) {
        setRehitMessage(
          `Rehitting ${index + 1} of ${pendingTransactions.length}: ${transactionId}`
        );

        try {
          const verifyResponse = await fetch("/api/transaction/verify", {
            body: JSON.stringify({
              skipStatusCheck: true,
              transactionId
            }),
            headers: {
              "Content-Type": "application/json"
            },
            method: "POST"
          });
          const verifyResult = await verifyResponse.json().catch(() => null);

          if (!verifyResponse.ok || !verifyResult?.success) {
            failedCount += 1;
          } else {
            successCount += 1;
          }
        } catch {
          failedCount += 1;
        }

        setRehitProgress({
          current: index + 1,
          failed: failedCount,
          success: successCount,
          total: pendingTransactions.length
        });
      }

      setRehitState(failedCount ? "error" : "success");
      setRehitMessage(
        `Rehit completed. ${successCount} succeeded, ${failedCount} failed.`
      );
      await fetchSedPayments();
    } catch (error) {
      setRehitState("error");
      setRehitMessage(
        error instanceof Error ? error.message : "Unable to rehit pending transactions."
      );
    }
  }

  const sortedSedRecords = useMemo(
    () =>
      [...sedRecords].sort((left, right) => {
        const leftDate = parseSedPaymentDate(left.addedOn)?.getTime() || 0;
        const rightDate = parseSedPaymentDate(right.addedOn)?.getTime() || 0;

        return rightDate - leftDate;
      }),
    [sedRecords]
  );
  const filteredSedRecords = useMemo(() => {
    const query = sedSearchQuery.trim().toLowerCase();

    if (!query) {
      return sortedSedRecords;
    }

    return sortedSedRecords.filter((record) =>
      [
        record.transactionId,
        record.razorpayOrderId,
        record.razorpayPaymentId,
        record.admissionNo,
        record.gateway,
        record.amount
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [sedSearchQuery, sortedSedRecords]);
  const sedTotalAmount = filteredSedRecords.reduce(
    (sum, record) => sum + toAmountNumber(record.amount),
    0
  );
  const latestSedPayment = filteredSedRecords[0]?.addedOn
    ? formatSedPaymentDate(filteredSedRecords[0].addedOn).split(",")[0]
    : "Not available";
  const sedRowsPerPage = 10;
  const sedPageCount = Math.max(1, Math.ceil(filteredSedRecords.length / sedRowsPerPage));
  const visibleSedRecords = filteredSedRecords.slice(
    (sedPage - 1) * sedRowsPerPage,
    sedPage * sedRowsPerPage
  );
  const sedStartEntry = filteredSedRecords.length ? (sedPage - 1) * sedRowsPerPage + 1 : 0;
  const sedEndEntry = Math.min(sedPage * sedRowsPerPage, filteredSedRecords.length);
  const sedPaginationItems = useMemo(() => {
    if (sedPageCount <= 7) {
      return Array.from({ length: sedPageCount }, (_, index) => index + 1);
    }

    const pages = new Set([1, sedPageCount, sedPage - 1, sedPage, sedPage + 1]);

    if (sedPage <= 4) {
      [2, 3, 4, 5].forEach((page) => pages.add(page));
    }

    if (sedPage >= sedPageCount - 3) {
      [sedPageCount - 4, sedPageCount - 3, sedPageCount - 2, sedPageCount - 1].forEach(
        (page) => pages.add(page)
      );
    }

    const sortedPages = Array.from(pages)
      .filter((page) => page >= 1 && page <= sedPageCount)
      .sort((left, right) => left - right);

    return sortedPages.flatMap((page, index) => {
      const previousPage = sortedPages[index - 1];

      if (previousPage && page - previousPage > 1) {
        return ["...", page];
      }

      return [page];
    });
  }, [sedPage, sedPageCount]);
  const dynamicSedSummaryCards = [
    {
      ...sedSummaryCards[0],
      value: String(filteredSedRecords.length)
    },
    {
      ...sedSummaryCards[1],
      value: formatAmount(sedTotalAmount)
    },
    {
      ...sedSummaryCards[2],
      value: latestSedPayment
    }
  ];

  useEffect(() => {
    setSedPage((currentPage) => Math.min(currentPage, sedPageCount));
  }, [sedPageCount]);

  async function handleCopySedTransactionId(transactionId: string) {
    if (!transactionId) {
      return;
    }

    await navigator.clipboard.writeText(transactionId);
    setCopiedSedTransactionId(transactionId);
    window.setTimeout(() => setCopiedSedTransactionId(""), 1400);
  }

  function handleSedFilter() {
    setSedSearchQuery(sedSearchInput);
    setSedPage(1);
  }

  return (
    <div className="mt-8 grid gap-6">
      <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
        {dynamicSedSummaryCards.map((card, index) => {
          const Icon = card.icon;

          return (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 16 }}
              key={card.label}
              transition={{ delay: index * 0.05, duration: 0.36, ease: "easeOut" }}
            >
              <Card
                className={cn(
                  "relative h-[118px] overflow-hidden rounded-[8px] bg-[linear-gradient(145deg,rgba(8,20,39,.76),rgba(3,11,24,.58))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.045),0_18px_46px_rgba(0,0,0,.32)]",
                  card.border
                )}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_20%,rgba(0,231,176,.08),transparent_30%),radial-gradient(circle_at_88%_100%,rgba(77,111,255,.05),transparent_34%)]" />
                <div className="relative z-10 flex h-full items-center gap-4">
                  <div
                    className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full text-white shadow-[0_0_26px_rgba(245,158,11,.18)]"
                    style={{ background: card.accent }}
                  >
                    <Icon className="h-6 w-6" strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <p className="break-words text-[24px] font-bold leading-none text-white">
                      {card.value}
                    </p>
                    <p className="mt-3 break-words text-[12px] font-bold text-[#FFB94A]">
                      {card.label}
                    </p>
                    <p className="mt-3 break-words text-[12px] text-[#A8B8D2]">
                      {card.subLabel}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </section>

      <Card className="overflow-hidden rounded-[12px] border-[#00E7B0]/28 bg-[linear-gradient(145deg,rgba(8,20,39,.78),rgba(3,11,24,.62))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.045),0_20px_60px_rgba(0,0,0,.34),0_0_26px_rgba(0,231,176,.07)] sm:p-6">
        <div className="flex flex-col gap-4 border-b border-[#2B3A52] pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-[18px] font-bold text-white">SED Payment Records</h2>
            <p className="mt-3 text-[14px] text-[#A8B8D2]">
              List of all successful SED payments.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              className="h-11 min-w-[144px] rounded-[6px]"
              disabled={sedLookupState === "loading"}
              onClick={handleRefreshSedPayments}
              type="button"
              variant="ghost"
            >
              <RefreshCcw
                className={cn("h-4 w-4", sedLookupState === "loading" && "animate-spin")}
              />
              Refresh
            </Button>
            <Button
              className="h-11 min-w-[178px] rounded-[6px]"
              disabled={rehitState === "loading"}
              onClick={handleRehitPendingSedTransactions}
              type="button"
            >
              {rehitState === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Compass className="h-4 w-4" />
              )}
              {rehitState === "loading" ? "Rehitting" : "Rehit Pending"}
            </Button>
          </div>
        </div>

        {rehitMessage ? (
          <div
            className={cn(
              "mt-5 rounded-[8px] border px-4 py-3 text-[13px] font-semibold",
              rehitState === "loading" &&
                "border-[#4D6FFF]/25 bg-[#4D6FFF]/10 text-[#B8C6FF]",
              rehitState === "success" &&
                "border-[#00E7B0]/25 bg-[#00E7B0]/10 text-[#00E7B0]",
              rehitState === "error" &&
                "border-[#FF4D6D]/25 bg-[#FF4D6D]/10 text-[#FF8DA1]"
            )}
          >
            <div>{rehitMessage}</div>
            {rehitProgress.total ? (
              <div className="mt-2 text-[12px] text-[#A8B8D2]">
                Processed {rehitProgress.current}/{rehitProgress.total} · Success{" "}
                {rehitProgress.success} · Failed {rehitProgress.failed}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(260px,1fr)_128px]">
          <label className="relative min-w-0">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8CA3C7]" />
            <Input
              className="h-11 rounded-[6px] border-[#263852] bg-[#07172D]/74 pl-11 text-[13px] placeholder:text-[#8CA3C7]"
              onChange={(event) => setSedSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSedFilter();
                }
              }}
              placeholder="Search by Transaction ID, Order ID, Admission No."
              value={sedSearchInput}
            />
          </label>
          <Button
            className="h-11 rounded-[6px]"
            onClick={handleSedFilter}
            type="button"
            variant="ghost"
          >
            <Filter className="h-4 w-4 text-[#00E7B0]" />
            Filter
          </Button>
        </div>

        <div className="mt-5 overflow-x-auto rounded-[8px] border border-[#263852]">
          <table className="w-full min-w-[960px] border-collapse text-left text-[14px]">
            <thead className="bg-[#0A1A31]/72 text-[#B9C6DA]">
              <tr>
                {[
                  { align: "text-left", label: "#" },
                  { align: "text-left", label: "Transaction ID" },
                  { align: "text-left", label: "Order ID" },
                  { align: "text-left", label: "Admission No." },
                  { align: "text-left", label: "Amount" },
                  { align: "text-left", label: "Payment Date" },
                  { align: "text-left", label: "Gateway" },
                  { align: "text-left", label: "Status" },
                  { align: "text-left", label: "Receipt" }
                ].map((heading) => (
                  <th
                    className={cn(
                      "border-b border-[#263852] px-5 py-4 font-bold",
                      heading.align
                    )}
                    key={heading.label}
                  >
                    {heading.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sedLookupState === "loading" ? (
                <tr>
                  <td className="px-5 py-8 text-center text-[#A8B8D2]" colSpan={9}>
                    Loading SED payments...
                  </td>
                </tr>
              ) : visibleSedRecords.length ? (
                visibleSedRecords.map((record, index) => (
                  <tr
                    className="border-b border-[#263852]/86 text-[#D8E1EF] last:border-b-0"
                    key={record.id || record.transactionId}
                  >
                    <td className="px-5 py-3.5">{sedStartEntry + index}</td>
                    <td className="px-5 py-3.5">
                      <button
                        className="group relative inline-flex w-full max-w-[245px] items-center justify-between gap-3 text-left text-[#4D7CFF] transition hover:text-[#78A0FF] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4D6FFF]/20"
                        onClick={() => handleCopySedTransactionId(record.transactionId)}
                        type="button"
                      >
                        <span className="min-w-0 break-all">{record.transactionId}</span>
                        <Copy className="h-4 w-4 shrink-0 opacity-90" />
                        <span className="pointer-events-none absolute -top-10 left-0 z-20 hidden whitespace-nowrap rounded-[5px] bg-[#07172D] px-3 py-2 text-[12px] font-bold text-white opacity-0 shadow-[0_12px_28px_rgba(0,0,0,.32)] transition group-hover:opacity-100 sm:block">
                          {copiedSedTransactionId === record.transactionId
                            ? "Copied"
                            : "Click to copy"}
                        </span>
                      </button>
                    </td>
                    <td className="px-5 py-3.5">{record.razorpayOrderId}</td>
                    <td className="px-5 py-3.5">{record.admissionNo}</td>
                    <td className="px-5 py-3.5 font-semibold text-white">
                      ₹{formatSedPaymentAmount(record.amount)}
                    </td>
                    <td className="px-5 py-3.5">{formatSedPaymentDate(record.addedOn)}</td>
                    <td className="px-5 py-3.5">{record.gateway}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex rounded-[8px] bg-[#00E7B0]/16 px-3 py-1.5 text-[12px] font-black text-[#00E7B0]">
                        Success
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {record.razorpayPaymentId ? (
                        <a
                          className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-[#4D6FFF]/30 bg-[#4D6FFF]/10 px-3 text-[12px] font-bold text-[#8FB0FF] transition hover:border-[#00E7B0]/45 hover:bg-[#00E7B0]/10 hover:text-[#00E7B0]"
                          href={getSedReceiptUrl(record.razorpayPaymentId)}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <Download className="h-3.5 w-3.5" />
                          SED Receipt
                        </a>
                      ) : (
                        <span className="text-[12px] text-[#6F7F98]">Not available</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-5 py-8 text-center text-[#A8B8D2]" colSpan={9}>
                    {sedSearchQuery
                      ? "No SED payments match your search."
                      : sedLookupMessage || "No successful SED payments found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-col gap-4 text-[14px] text-[#A8B8D2] md:flex-row md:items-center md:justify-between">
          <p>
            Showing {sedStartEntry} to {sedEndEntry} of {filteredSedRecords.length} entries
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              aria-label="Previous SED payments page"
              className="grid h-10 min-w-10 place-items-center rounded-[6px] border border-[#263852] bg-[#07172D]/74 px-3 text-[14px] font-semibold text-[#A8B8D2] transition enabled:hover:border-[#00E7B0]/40 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
              disabled={sedPage === 1 || !filteredSedRecords.length}
              onClick={() => setSedPage((page) => Math.max(1, page - 1))}
              type="button"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {sedPaginationItems.map((page, index) => (
              <button
                className={cn(
                  "grid h-10 min-w-10 place-items-center rounded-[6px] border border-[#263852] bg-[#07172D]/74 px-3 text-[14px] font-semibold text-[#A8B8D2] transition enabled:hover:border-[#00E7B0]/40 enabled:hover:text-white disabled:cursor-default",
                  page === sedPage &&
                    "border-[#00E7B0] bg-gradient-to-r from-[#00E7B0] to-[#008E78] text-white shadow-[0_0_26px_rgba(0,231,176,.25)]",
                  page === "..." && "text-[#6F7F98]"
                )}
                disabled={page === "..."}
                key={`${page}-${index}`}
                onClick={() => {
                  if (typeof page === "number") {
                    setSedPage(page);
                  }
                }}
                type="button"
              >
                {page}
              </button>
            ))}
            <button
              aria-label="Next SED payments page"
              className="grid h-10 min-w-10 place-items-center rounded-[6px] border border-[#263852] bg-[#07172D]/74 px-3 text-[14px] font-semibold text-[#A8B8D2] transition enabled:hover:border-[#00E7B0]/40 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
              disabled={sedPage === sedPageCount || !filteredSedRecords.length}
              onClick={() => setSedPage((page) => Math.min(sedPageCount, page + 1))}
              type="button"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function UniformReceiptsView() {
  const [receiptDate, setReceiptDate] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [downloadState, setDownloadState] = useState<LookupState>("idle");
  const [downloadMessage, setDownloadMessage] = useState("");
  const [transactionIdsInput, setTransactionIdsInput] = useState("");
  const [transactionDownloadState, setTransactionDownloadState] =
    useState<LookupState>("idle");
  const [transactionDownloadMessage, setTransactionDownloadMessage] = useState("");
  const [transactionFailures, setTransactionFailures] = useState<
    UniformReceiptFailure[]
  >([]);
  const receiptDateInputRef = useRef<HTMLInputElement>(null);
  const transactionIds = useMemo(
    () => parseTransactionIdsInput(transactionIdsInput),
    [transactionIdsInput]
  );
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const previousMonthDays = new Date(year, month, 0).getDate();
    const leadingDays = firstDay.getDay();

    return Array.from({ length: 42 }, (_, index) => {
      const dayNumber = index - leadingDays + 1;
      const date =
        dayNumber < 1
          ? new Date(year, month - 1, previousMonthDays + dayNumber)
          : dayNumber > daysInMonth
            ? new Date(year, month + 1, dayNumber - daysInMonth)
            : new Date(year, month, dayNumber);

      return {
        date,
        isCurrentMonth: date.getMonth() === month,
        value: toDateInputValue(date)
      };
    });
  }, [calendarMonth]);

  const selectedDateLabel = receiptDate
    ? new Date(`${receiptDate}T00:00:00`).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      })
    : "";
  const calendarMonthLabel = calendarMonth.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric"
  });

  async function handleUniformReceiptDownload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!receiptDate) {
      setDownloadState("error");
      setDownloadMessage("Please select a receipt date.");
      return;
    }

    setDownloadState("loading");
    setDownloadMessage("Preparing receipt ZIP. This may take a few minutes.");

    try {
      const response = await fetch(
        `/api/uniform-receipts?date=${encodeURIComponent(receiptDate)}`
      );

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(
          result && typeof result.message === "string"
            ? result.message
            : "Unable to download uniform receipts."
        );
      }

      await downloadZipFromResponse(response, `uniform-receipts-${receiptDate}.zip`);

      setDownloadState("success");
      const failures = readUniformReceiptFailures(response);
      setDownloadMessage(
        failures.length
          ? `Receipt ZIP download started. ${failures.length} receipt${
              failures.length === 1 ? "" : "s"
            } skipped.`
          : "Receipt ZIP download started."
      );
    } catch (error) {
      setDownloadState("error");
      setDownloadMessage(
        error instanceof Error ? error.message : "Unable to download uniform receipts."
      );
    }
  }

  async function handleTransactionReceiptDownload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!transactionIds.length) {
      setTransactionDownloadState("error");
      setTransactionDownloadMessage("Please enter at least one transaction ID.");
      setTransactionFailures([]);
      return;
    }

    setTransactionDownloadState("loading");
    setTransactionDownloadMessage("Preparing receipt ZIP for selected transactions.");
    setTransactionFailures([]);

    try {
      const response = await fetch("/api/uniform-receipts", {
        body: JSON.stringify({ transactionIds }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        const failures =
          result && Array.isArray(result.failures)
            ? (result.failures as UniformReceiptFailure[])
            : [];

        setTransactionFailures(failures);

        throw new Error(
          result && typeof result.message === "string"
            ? result.message
            : "Unable to download uniform receipts."
        );
      }

      const failures = readUniformReceiptFailures(response);
      await downloadZipFromResponse(response, "uniform-receipts-transactions.zip");

      setTransactionFailures(failures);
      setTransactionDownloadState("success");
      setTransactionDownloadMessage(
        failures.length
          ? `Receipt ZIP download started. ${failures.length} transaction${
              failures.length === 1 ? "" : "s"
            } failed.`
          : `Receipt ZIP download started for ${transactionIds.length} transaction${
              transactionIds.length === 1 ? "" : "s"
            }.`
      );
    } catch (error) {
      setTransactionDownloadState("error");
      setTransactionDownloadMessage(
        error instanceof Error ? error.message : "Unable to download uniform receipts."
      );
    }
  }

  return (
    <div className="mt-8 grid gap-4">
      <motion.section
        animate={{ opacity: 1, y: 0 }}
        className="relative min-w-0 overflow-visible rounded-[14px] border border-[#00E7B0]/72 bg-[linear-gradient(145deg,rgba(8,20,39,.78),rgba(3,11,24,.62))] px-5 py-7 shadow-[inset_0_1px_0_rgba(255,255,255,.045),0_20px_60px_rgba(0,0,0,.34),0_0_28px_rgba(0,231,176,.10)] sm:px-8 lg:px-10"
        initial={{ opacity: 0, y: 18 }}
        transition={{ duration: 0.42, ease: "easeOut" }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_11%_18%,rgba(0,231,176,.14),transparent_28%),radial-gradient(circle_at_80%_38%,rgba(77,111,255,.10),transparent_34%)]" />
        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(380px,560px)]">
          <div className="min-w-0">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border border-[#00E7B0]/24 bg-[#00E7B0]/14 text-[#BFFCEF] shadow-[0_0_34px_rgba(0,231,176,.32),inset_0_1px_0_rgba(255,255,255,.08)] sm:h-[82px] sm:w-[82px]">
                <FileText className="h-10 w-10" strokeWidth={2.1} />
              </div>
              <div className="min-w-0 pt-1">
                <h2 className="text-[24px] font-bold leading-tight text-white md:text-[26px]">
                  Download Uniform Receipts
                </h2>
                <p className="mt-3 max-w-lg text-[15px] leading-7 text-[#C4D1E8]">
                  Choose a date to download all receipts of successful uniform payments.
                </p>
              </div>
            </div>

            <div className="my-7 h-px w-full bg-[#31425E]/80" />

            <form
              className="grid max-w-[490px] gap-5"
              onSubmit={handleUniformReceiptDownload}
            >
              <label
                className={cn(
                  "grid gap-3 text-[15px] font-semibold text-white transition-[margin] duration-200",
                  isCalendarOpen && "mb-[398px]"
                )}
                htmlFor="receiptDate"
              >
                Receipt Date
                <div className="relative">
                  <Input
                    className="h-[54px] cursor-pointer rounded-[8px] border-[#34445E] bg-[#061226]/80 pl-5 pr-14 text-[15px] text-[#C4D1E8] focus:border-[#4D6FFF]/65 focus:shadow-[0_0_0_4px_rgba(77,111,255,.14),0_0_30px_rgba(77,111,255,.14)]"
                    id="receiptDate"
                    onClick={() => setIsCalendarOpen(true)}
                    onFocus={() => setIsCalendarOpen(true)}
                    placeholder="Select Receipt Date"
                    readOnly
                    ref={receiptDateInputRef}
                    value={selectedDateLabel}
                  />
                  <button
                    aria-label="Open receipt date picker"
                    className="absolute right-4 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-[6px] text-white transition hover:bg-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4D6FFF]/70"
                    onClick={() => {
                      setIsCalendarOpen((current) => !current);
                      receiptDateInputRef.current?.focus();
                    }}
                    type="button"
                  >
                    <Calendar className="h-5 w-5" />
                  </button>
                  {isCalendarOpen ? (
                    <div className="absolute left-0 top-[calc(100%+12px)] z-50 w-[310px] max-w-full rounded-[12px] border border-[#00E7B0]/24 bg-[#061226] p-4 shadow-[0_24px_60px_rgba(0,0,0,.55),0_0_34px_rgba(0,231,176,.12)]">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[14px] font-semibold text-white">
                          {calendarMonthLabel}
                        </p>
                        <div className="flex gap-2">
                          <button
                            aria-label="Previous month"
                            className="grid h-8 w-8 place-items-center rounded-[7px] border border-white/10 bg-white/[.04] text-[#C4D1E8] transition hover:border-[#00E7B0]/35 hover:text-white"
                            onClick={() =>
                              setCalendarMonth(
                                new Date(
                                  calendarMonth.getFullYear(),
                                  calendarMonth.getMonth() - 1,
                                  1
                                )
                              )
                            }
                            type="button"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            aria-label="Next month"
                            className="grid h-8 w-8 place-items-center rounded-[7px] border border-white/10 bg-white/[.04] text-[#C4D1E8] transition hover:border-[#00E7B0]/35 hover:text-white"
                            onClick={() =>
                              setCalendarMonth(
                                new Date(
                                  calendarMonth.getFullYear(),
                                  calendarMonth.getMonth() + 1,
                                  1
                                )
                              )
                            }
                            type="button"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-[#8CA3C7]">
                        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                          <span className="py-1" key={day}>
                            {day}
                          </span>
                        ))}
                      </div>
                      <div className="mt-1 grid grid-cols-7 gap-1">
                        {calendarDays.map((day) => {
                          const isSelected = day.value === receiptDate;
                          const isToday = day.value === toDateInputValue(new Date());

                          return (
                            <button
                              className={cn(
                                "grid h-9 place-items-center rounded-[7px] text-[13px] font-semibold transition",
                                day.isCurrentMonth
                                  ? "text-white hover:bg-[#00E7B0]/14"
                                  : "text-[#60708A]",
                                isToday &&
                                  "border border-[#00E7B0]/35 text-[#00E7B0]",
                                isSelected &&
                                  "border border-[#00E7B0] bg-[#00E7B0] text-[#02111D] shadow-[0_0_24px_rgba(0,231,176,.32)] hover:bg-[#00E7B0]"
                              )}
                              key={day.value}
                              onClick={() => {
                                setReceiptDate(day.value);
                                setCalendarMonth(
                                  new Date(day.date.getFullYear(), day.date.getMonth(), 1)
                                );
                                setIsCalendarOpen(false);
                              }}
                              type="button"
                            >
                              {day.date.getDate()}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-4 flex justify-between border-t border-white/10 pt-3">
                        <button
                          className="text-[12px] font-semibold text-[#8CA3C7] transition hover:text-white"
                          onClick={() => {
                            setReceiptDate("");
                            receiptDateInputRef.current?.focus();
                          }}
                          type="button"
                        >
                          Clear
                        </button>
                        <button
                          className="text-[12px] font-semibold text-[#00E7B0] transition hover:text-white"
                          onClick={() => {
                            const today = new Date();
                            setReceiptDate(toDateInputValue(today));
                            setCalendarMonth(
                              new Date(today.getFullYear(), today.getMonth(), 1)
                            );
                            setIsCalendarOpen(false);
                          }}
                          type="button"
                        >
                          Today
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </label>

              <Button
                className="h-[58px] w-full rounded-[8px] text-[16px]"
                disabled={downloadState === "loading"}
                type="submit"
              >
                {downloadState === "loading" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
                Download All Receipts
              </Button>
            </form>

            {downloadMessage ? (
              <div
                className={cn(
                  "mt-5 max-w-[490px] rounded-[8px] border px-4 py-3 text-sm font-semibold",
                  downloadState === "loading" &&
                    "border-[#4D6FFF]/25 bg-[#4D6FFF]/10 text-[#AFC0FF]",
                  downloadState === "success" &&
                    "border-[#22C55E]/25 bg-[#22C55E]/10 text-[#22C55E]",
                  downloadState === "error" &&
                    "border-[#FF4D6D]/25 bg-[#FF4D6D]/10 text-[#FF4D6D]"
                )}
              >
                {downloadMessage}
              </div>
            ) : null}

            <div className="mt-8 flex items-center gap-3 text-[14px] text-[#C4D1E8]">
              <ShieldCheck className="h-5 w-5 shrink-0 text-[#00E7B0]" strokeWidth={2.3} />
              <span>All receipts will be downloaded in a single ZIP file.</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[580px]">
            <Image
              alt="Uniform receipt download illustration"
              className="h-auto w-full object-contain drop-shadow-[0_30px_55px_rgba(0,0,0,.42)]"
              placeholder="blur"
              priority
              sizes="(max-width: 1024px) 92vw, 560px"
              src={receiptDashboardImage}
            />
          </div>
        </div>
      </motion.section>

      <motion.section
        animate={{ opacity: 1, y: 0 }}
        className="flex min-w-0 gap-5 rounded-[14px] border border-[#315EFF]/52 bg-[linear-gradient(145deg,rgba(14,31,79,.72),rgba(4,14,30,.64))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.045),0_18px_46px_rgba(0,0,0,.28),0_0_28px_rgba(77,111,255,.10)] sm:p-7"
        initial={{ opacity: 0, y: 18 }}
        transition={{ delay: 0.08, duration: 0.42, ease: "easeOut" }}
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#315EFF] text-white shadow-[0_0_30px_rgba(77,111,255,.34)] sm:h-11 sm:w-11">
          <Info className="h-5 w-5" strokeWidth={2.8} />
        </div>
        <div className="min-w-0">
          <h3 className="text-[16px] font-semibold text-white">Important Note</h3>
          <p className="mt-3 text-[13px] leading-6 text-[#D3DCF1]">
            Receipts will be downloaded based on successful uniform payments for the
            selected date.
          </p>
          <p className="mt-1 text-[13px] leading-6 text-[#D3DCF1]">
            Make sure the date is correct before starting the download.
          </p>
        </div>
      </motion.section>

      <motion.section
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-6 rounded-[14px] border border-[#00E7B0]/34 bg-[linear-gradient(145deg,rgba(7,18,36,.82),rgba(4,13,27,.70))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.045),0_18px_46px_rgba(0,0,0,.28)] sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]"
        initial={{ opacity: 0, y: 18 }}
        transition={{ delay: 0.12, duration: 0.42, ease: "easeOut" }}
      >
        <div className="min-w-0">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[10px] border border-[#00E7B0]/20 bg-[#00E7B0]/10 text-[#00E7B0]">
              <Download className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[18px] font-semibold text-white">
                Download By Transaction IDs
              </h3>
              <p className="mt-2 text-[13px] leading-6 text-[#C4D1E8]">
                Paste comma-separated uniform payment IDs. ONLINE_ prefix values are
                converted before download.
              </p>
            </div>
          </div>

          <form className="mt-6 grid gap-4" onSubmit={handleTransactionReceiptDownload}>
            <label className="grid gap-3 text-[15px] font-semibold text-white">
              Transaction IDs
              <textarea
                className="min-h-[180px] resize-y rounded-[8px] border border-[#34445E] bg-[#061226]/80 px-4 py-4 text-[14px] leading-6 text-[#C4D1E8] outline-none transition placeholder:text-[#60708A] focus:border-[#4D6FFF]/65 focus:shadow-[0_0_0_4px_rgba(77,111,255,.14),0_0_30px_rgba(77,111,255,.14)]"
                onChange={(event) => {
                  setTransactionIdsInput(event.target.value);
                  setTransactionDownloadState("idle");
                  setTransactionDownloadMessage("");
                  setTransactionFailures([]);
                }}
                placeholder="ONLINE_pay_SokfxsYRhqNA25, ONLINE_pay_SvA5dNh1EqfdKw"
                value={transactionIdsInput}
              />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] font-semibold text-[#8CA3C7]">
                {transactionIds.length} transaction ID
                {transactionIds.length === 1 ? "" : "s"} ready
              </p>
              <Button
                className="h-[54px] rounded-[8px] px-6"
                disabled={transactionDownloadState === "loading"}
                type="submit"
                variant="blue"
              >
                {transactionDownloadState === "loading" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
                Download ZIP
              </Button>
            </div>
          </form>

          {transactionDownloadMessage ? (
            <div
              className={cn(
                "mt-5 rounded-[8px] border px-4 py-3 text-sm font-semibold",
                transactionDownloadState === "loading" &&
                  "border-[#4D6FFF]/25 bg-[#4D6FFF]/10 text-[#AFC0FF]",
                transactionDownloadState === "success" &&
                  "border-[#22C55E]/25 bg-[#22C55E]/10 text-[#22C55E]",
                transactionDownloadState === "error" &&
                  "border-[#FF4D6D]/25 bg-[#FF4D6D]/10 text-[#FF4D6D]"
              )}
            >
              {transactionDownloadMessage}
            </div>
          ) : null}
        </div>

        <div className="min-w-0 rounded-[10px] border border-white/10 bg-[#031022]/72 p-4">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <h4 className="text-[15px] font-semibold text-white">Failed Records</h4>
              <p className="mt-1 text-[12px] font-semibold text-[#8CA3C7]">
                Failed IDs also appear in the ZIP summary file.
              </p>
            </div>
            <span className="grid h-9 min-w-9 place-items-center rounded-[8px] bg-[#FF4D6D]/12 px-3 text-[13px] font-bold text-[#FF7A91]">
              {transactionFailures.length}
            </span>
          </div>

          {transactionFailures.length ? (
            <div className="mt-4 max-h-[276px] overflow-y-auto pr-1">
              <div className="grid gap-2">
                {transactionFailures.map((failure) => (
                  <div
                    className="rounded-[8px] border border-[#FF4D6D]/18 bg-[#FF4D6D]/8 px-3 py-2"
                    key={`${failure.transactionId}-${failure.reason}`}
                  >
                    <p className="break-all text-[13px] font-semibold text-white">
                      {failure.transactionId}
                    </p>
                    <p className="mt-1 text-[12px] font-semibold text-[#FF9AAC]">
                      {failure.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid min-h-[180px] place-items-center text-center">
              <p className="max-w-[240px] text-[13px] leading-6 text-[#8CA3C7]">
                Failed transaction IDs will appear here after a download attempt.
              </p>
            </div>
          )}
        </div>
      </motion.section>
    </div>
  );
}

export default function Home() {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [dashboardRole, setDashboardRole] = useState<DashboardRole | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>("Wizklub Payments");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginState, setLoginState] = useState<LookupState>("idle");
  const [loginMessage, setLoginMessage] = useState("");
  const [admissionNo, setAdmissionNo] = useState("SCS");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [lookupMessage, setLookupMessage] = useState("");
  const [studentSyncState, setStudentSyncState] = useState<LookupState>("idle");
  const [studentSyncMessage, setStudentSyncMessage] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [verifyMessage, setVerifyMessage] = useState("");
  const [verifySteps, setVerifySteps] = useState<{
    receipt: VerifyStepState;
    status: VerifyStepState;
  }>({
    receipt: "idle",
    status: "idle"
  });
  const [copiedTransactionId, setCopiedTransactionId] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const hadDashboardLogin = hasStoredDashboardLogin();

      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store"
        });
        const result = await response.json();

        const role =
          result.role === "admin" || result.role === "uniform" || result.role === "wizklub"
            ? result.role
            : null;

        setDashboardRole(role);
        setActiveView(getDefaultViewForRole(role));
        setAuthState(result.authenticated && role ? "loggedIn" : "loggedOut");
        setLoginMessage(
          result.authenticated && role
            ? ""
            : hadDashboardLogin
              ? expiredSessionMessage
              : ""
        );
      } catch {
        setDashboardRole(null);
        setAuthState("loggedOut");
        setLoginMessage(hadDashboardLogin ? expiredSessionMessage : "");
      }
    }

    checkSession();
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  const summary = useMemo(() => {
    const successful = payments.filter(
      (payment) => statusClass(payment.paymentStatus) === "success"
    );
    const failed = payments.filter(
      (payment) => statusClass(payment.paymentStatus) === "failed"
    );
    const totalAmount = successful.reduce(
      (sum, payment) => sum + toAmountNumber(payment.amount),
      0
    );

    return {
      failed: failed.length,
      successRate: payments.length ? Math.round((successful.length / payments.length) * 100) : 0,
      successful: successful.length,
      totalAmount,
      totalRecords: payments.length
    };
  }, [payments]);

  const stats: StatCard[] = [
    {
      accent: "linear-gradient(135deg,#00E7B0,#008E78)",
      color: "#00E7B0",
      data: chartBase,
      icon: FileText,
      label: "Total Records",
      subLabel: "All payments",
      value: String(summary.totalRecords)
    },
    {
      accent: "linear-gradient(135deg,#22C55E,#19A65A)",
      color: "#22C55E",
      data: chartBase.map((item, index) => ({ value: item.value + index })),
      icon: Check,
      label: "Successful Payments",
      subLabel: "Total success records",
      value: String(summary.successful)
    },
    {
      accent: "linear-gradient(135deg,#FF4D6D,#FF3158)",
      color: "#FF4D6D",
      data: chartBase.map((item, index) => ({ value: Math.max(1, item.value - index) })),
      icon: X,
      label: "Failed Payments",
      subLabel: "Total failure records",
      value: String(summary.failed)
    },
    {
      accent: "linear-gradient(135deg,#4D6FFF,#252ACB)",
      color: "#4D6FFF",
      data: chartBase.map((item, index) => ({ value: item.value + index * 2 })),
      icon: IndianRupee,
      label: "Total Amount",
      subLabel: "Total collected",
      value: formatAmount(summary.totalAmount)
    }
  ];
  const isUniformReceiptsView = activeView === "Uniform Receipts";
  const isPaymentLookupView = activeView === "Receipt Updates";
  const isReciptsView = activeView === "Recipts";
  const isTransactionsView = activeView === "Table Lookup";
  const isSedPaymentsView = activeView === "SED Payments";
  const isStudentsView = activeView === "Students";
  const isStudentBookListView = activeView === "Book Lists";
  const isUniformListsView = activeView === "Uniform Lists";
  const pageTitle = isPaymentLookupView
    ? "Payment Dashboard"
    : isReciptsView
      ? "Receipts"
    : isTransactionsView
      ? "Table Lookup"
    : isSedPaymentsView
      ? "SED Payments"
      : isUniformListsView
        ? "Uniform Lists"
      : isStudentBookListView
        ? "Student Book List"
      : isStudentsView
        ? "Student Details"
    : isUniformReceiptsView
    ? "Uniform Recipt"
    : "Payment Dashboard";
  const pageDescription = isPaymentLookupView
    ? "Search, view and verify all payment transactions in one place."
    : isReciptsView
      ? "View and download receipts for the selected student."
    : isTransactionsView
      ? "View and search all payment transactions across different tables."
    : isSedPaymentsView
      ? "View all successful SED (Student Education Diagnostics) Transaction payments."
      : isUniformListsView
        ? "View uniform kits and products available for the selected student."
      : isStudentBookListView
        ? "View books and products available for the selected student."
      : isStudentsView
        ? "View detailed information about the student."
    : isUniformReceiptsView
    ? "Select a date and download all uniform receipts in one ZIP file."
    : "Search, view and verify all payment transactions in one place.";
  const pageEyebrow = isPaymentLookupView
    ? "FEE PAYMENTs"
    : isReciptsView
      ? "STUDENTS > RECEIPT DOWNLOAD"
    : isTransactionsView
      ? "TABLE LOOKUP"
    : isSedPaymentsView
      ? "FEE PAYMENTS"
      : isUniformListsView
        ? "STUDENTS > UNIFORM LISTS"
      : isStudentBookListView
        ? "STUDENTS > BOOK LISTS"
      : isStudentsView
        ? "STUDENTS > PROFILE"
    : isUniformReceiptsView
    ? "UNIFORM PAYMENT RECIPTS"
    : "WIZKLUB PAYMENTS";
  const verifyStepItems = [
    {
      description:
        verifySteps.status === "success"
          ? "Payment status check completed."
          : verifySteps.status === "error"
            ? "Payment status check failed."
            : "Checking transaction payment status.",
      label: "Checking payment status",
      state: verifySteps.status
    },
    {
      description:
        verifySteps.receipt === "success"
          ? "Receipt generation completed."
          : verifySteps.receipt === "error"
            ? "Receipt generation failed."
            : "Generating receipt after successful payment check.",
      label: "Generating receipt",
      state: verifySteps.receipt
    }
  ];
  const showVerifySteps = verifyStepItems.some((item) => item.state !== "idle");

  function handleExpiredLoginSession(message = expiredSessionMessage) {
    clearStoredDashboardLogin();
    setAuthState("loggedOut");
    setDashboardRole(null);
    setActiveView("Wizklub Payments");
    setPayments([]);
    setLookupState("idle");
    setLookupMessage("");
    setStudentSyncState("idle");
    setStudentSyncMessage("");
    setVerifyState("idle");
    setVerifyMessage("");
    setVerifySteps({ receipt: "idle", status: "idle" });
    setLoginState("error");
    setLoginMessage(message);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!loginUsername.trim() || !loginPassword) {
      setLoginState("error");
      setLoginMessage("Please enter username and password.");
      return;
    }

    setLoginState("loading");
    setLoginMessage("");
    const loginStartedAt = Date.now();

    try {
      const response = await fetch("/api/auth/login", {
        body: JSON.stringify({
          password: loginPassword,
          username: loginUsername
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Invalid username or password.");
      }

      const role =
        result.role === "admin" || result.role === "uniform" || result.role === "wizklub"
          ? result.role
          : null;

      if (!role) {
        throw new Error("Login role is not configured.");
      }

      await waitForMinimumDuration(loginStartedAt, 2500);
      writeStoredDashboardLogin();
      setDashboardRole(role);
      setActiveView(getDefaultViewForRole(role));
      setAuthState("loggedIn");
      setLoginState("idle");
      setLoginMessage("");
      setLoginPassword("");
    } catch (error) {
      await waitForMinimumDuration(loginStartedAt, 2500);
      setLoginState("error");
      setLoginMessage(
        error instanceof Error ? error.message : "Invalid username or password."
      );
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    clearStoredDashboardLogin();
    setAuthState("loggedOut");
    setDashboardRole(null);
    setActiveView("Wizklub Payments");
    setPayments([]);
    setLookupState("idle");
    setLookupMessage("");
    setStudentSyncState("idle");
    setStudentSyncMessage("");
    setVerifyState("idle");
    setVerifyMessage("");
    setVerifySteps({ receipt: "idle", status: "idle" });
  }

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedAdmissionNo = admissionNo.trim();

    if (!trimmedAdmissionNo) {
      setLookupState("error");
      setLookupMessage("Please enter an admission number.");
      return;
    }

    setLookupState("loading");
    setLookupMessage("Loading payment records. Please wait 1-2 seconds.");
    setPayments([]);

    try {
      await wait(1000);
      const response = await fetch(
        `/api/payments?admissionNo=${encodeURIComponent(trimmedAdmissionNo)}`
      );
      const result = await response.json();

      if (response.status === 401) {
        handleExpiredLoginSession(
          typeof result.message === "string" ? result.message : expiredSessionMessage
        );
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to fetch payment details.");
      }

      const paymentRecords = normalizePaymentGroupStatuses(result.data);

      setPayments(paymentRecords);
      setLookupState("success");
      setLookupMessage(
        paymentRecords.length
          ? `Found ${paymentRecords.length} payment record${
              paymentRecords.length === 1 ? "" : "s"
            }.`
          : "No payment records found for this admission number."
      );
    } catch (error) {
      setLookupState("error");
      setLookupMessage(
        error instanceof Error ? error.message : "Unable to fetch payment details."
      );
    }
  }

  async function handleStudentSync() {
    const trimmedAdmissionNo = admissionNo.trim();

    if (!trimmedAdmissionNo) {
      setStudentSyncState("error");
      setStudentSyncMessage("Please enter an admission number.");
      return;
    }

    setStudentSyncState("loading");
    setStudentSyncMessage("Syncing student details. Please wait.");

    try {
      const response = await fetch("/api/student/sync", {
        body: JSON.stringify({ admissionNo: trimmedAdmissionNo }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const result = await response.json();

      if (response.status === 401) {
        handleExpiredLoginSession(
          typeof result.message === "string" ? result.message : expiredSessionMessage
        );
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Student sync failed.");
      }

      setStudentSyncState("success");
      setStudentSyncMessage(result.message || "Student synced successfully.");
    } catch (error) {
      setStudentSyncState("error");
      setStudentSyncMessage(
        error instanceof Error ? error.message : "Student sync failed."
      );
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const matchedTransactionIds = getSingleTransactionId(transactionId);

    if (!transactionId.trim() || matchedTransactionIds.length === 0) {
      setVerifyState("error");
      setVerifyMessage("Please enter one ORDS-KIT transaction ID.");
      setVerifySteps({ receipt: "idle", status: "idle" });
      return;
    }

    if (matchedTransactionIds.length > 1) {
      setVerifyState("error");
      setVerifyMessage("Please verify only one ORDS-KIT transaction ID at a time.");
      setVerifySteps({ receipt: "idle", status: "idle" });
      return;
    }

    const verifiedTransactionId = matchedTransactionIds[0] as string;
    setTransactionId(verifiedTransactionId);
    setVerifyState("loading");
    setVerifyMessage("Checking payment status.");
    setVerifySteps({ receipt: "idle", status: "loading" });

    try {
      const statusResponse = await fetch("/api/transaction/status", {
        body: JSON.stringify({ transactionId: verifiedTransactionId }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const statusResult = await statusResponse.json();

      if (statusResponse.status === 401) {
        setVerifySteps({ receipt: "idle", status: "error" });
        handleExpiredLoginSession(
          typeof statusResult.message === "string" ? statusResult.message : expiredSessionMessage
        );
        return;
      }

      if (!statusResponse.ok || !statusResult.success) {
        setVerifySteps({ receipt: "idle", status: "error" });
        throw new Error(statusResult.message || "Payment transaction is not successful.");
      }

      setVerifyMessage("Payment status checked. Generating receipt.");
      setVerifySteps({ receipt: "loading", status: "success" });

      const receiptResponse = await fetch("/api/transaction/verify", {
        body: JSON.stringify({
          skipStatusCheck: true,
          transactionId: verifiedTransactionId
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const receiptResult = await receiptResponse.json();

      if (receiptResponse.status === 401) {
        setVerifySteps({ receipt: "error", status: "success" });
        handleExpiredLoginSession(
          typeof receiptResult.message === "string" ? receiptResult.message : expiredSessionMessage
        );
        return;
      }

      if (!receiptResponse.ok || !receiptResult.success) {
        setVerifySteps({ receipt: "error", status: "success" });
        throw new Error(receiptResult.message || "Transaction verification failed.");
      }

      setVerifyState("success");
      setVerifySteps({ receipt: "success", status: "success" });
      setVerifyMessage(
        receiptResult.message || "Receipt generated. Reach out site for download receipt."
      );
    } catch (error) {
      setVerifyState("error");
      setVerifySteps((currentSteps) => ({
        receipt: currentSteps.receipt === "loading" ? "error" : currentSteps.receipt,
        status: currentSteps.status === "loading" ? "error" : currentSteps.status
      }));
      setVerifyMessage(
        error instanceof Error ? error.message : "Transaction verification failed."
      );
    }
  }

  async function handleCopyTransactionId(value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedTransactionId(value);
    window.setTimeout(() => setCopiedTransactionId(""), 3000);
  }

  if (authState === "checking") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#020817] p-5">
        <Card className="grid w-full max-w-sm place-items-center p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#00E7B0]" />
          <p className="mt-4 text-sm font-semibold text-white">Checking login...</p>
        </Card>
      </main>
    );
  }

  if (authState === "loggedOut") {
    return (
      <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#020817] p-5">
        <div className="absolute left-[12%] top-[16%] h-40 w-72 rounded-[26px] bg-[#00E7B0]/12 blur-2xl" />
        <div className="absolute bottom-[12%] right-[10%] h-48 w-72 rounded-[26px] bg-[#4D6FFF]/12 blur-2xl" />
        <motion.section
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="relative z-10 w-full max-w-[440px]"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <Card className="p-8">
            <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-[#00E7B0]/20 shadow-[0_0_34px_rgba(0,231,176,.24)]">
              <Image
                alt="Wizklub secure payments logo"
                className="scale-[1.55] object-cover"
                fill
                placeholder="blur"
                sizes="56px"
                src={logoImage}
              />
            </div>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-[#00E7B0]">
              Pay Monitoring System
            </p>
            <h1 className="mt-3 text-[34px] font-bold leading-tight text-white">
              Dashboard Login
            </h1>
            <p className="mt-3 text-[15px] leading-7 text-[#8CA3C7]">
              Sign in to search payment records and verify transactions.
            </p>

            <form className="mt-7 grid gap-5" onSubmit={handleLogin}>
              <label className="grid gap-2 text-sm font-medium text-white" htmlFor="username">
                Username
                <Input
                  autoCapitalize="characters"
                  autoComplete="username"
                  autoFocus
                  id="username"
                  onChange={(event) => setLoginUsername(event.target.value.toUpperCase())}
                  value={loginUsername}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-white" htmlFor="password">
                Password
                <div className="relative">
                  <Input
                    autoComplete="current-password"
                    className="pr-12"
                    id="password"
                    onChange={(event) => setLoginPassword(event.target.value)}
                    type={showLoginPassword ? "text" : "password"}
                    value={loginPassword}
                  />
                  <button
                    aria-label={showLoginPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-[8px] text-[#AFC0D9] transition hover:bg-white/[.06] hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#00E7B0]/20"
                    onClick={() => setShowLoginPassword((value) => !value)}
                    type="button"
                  >
                    {showLoginPassword ? (
                      <EyeOff className="h-4.5 w-4.5" />
                    ) : (
                      <Eye className="h-4.5 w-4.5" />
                    )}
                  </button>
                </div>
              </label>
              <Button disabled={loginState === "loading"} type="submit">
                {loginState === "loading" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in
                  </>
                ) : (
                  "Login"
                )}
              </Button>
            </form>

            {loginMessage ? (
              <div className="mt-5 rounded-[14px] border border-[#FF4D6D]/25 bg-[#FF4D6D]/10 px-4 py-3 text-sm font-semibold text-[#FF4D6D]">
                {loginMessage}
              </div>
            ) : null}
          </Card>
        </motion.section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#020817] font-sans text-white">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        role={dashboardRole}
      />
      <MobileSidebar
        activeView={activeView}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onViewChange={setActiveView}
        role={dashboardRole}
      />
      <section className="relative min-h-screen px-3 pb-5 pt-[112px] sm:px-6 lg:px-8 xl:ml-[280px] xl:px-10 xl:py-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_3%,rgba(0,231,176,.10),transparent_24%),radial-gradient(circle_at_80%_4%,rgba(77,111,255,.08),transparent_24%)]" />
        <div className="relative z-10 min-w-0 max-w-full">
        <MobileHeader onMenuOpen={() => setIsMobileMenuOpen(true)} />

        <header className="flex min-w-0 flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            {pageEyebrow ? (
              <p className="break-words text-xs font-semibold uppercase tracking-[0.12em] text-[#00E7B0] sm:text-sm sm:tracking-[0.14em]">
                {pageEyebrow}
              </p>
            ) : null}
            <h1
              className={cn(
                "break-words font-bold leading-tight text-white",
                pageEyebrow ? "mt-3 text-[28px] sm:text-[34px] md:text-[38px]" : "text-[26px] sm:text-[28px]"
              )}
            >
              {pageTitle}
            </h1>
            <p
              className={cn(
                "max-w-3xl break-words text-[15px] leading-7",
                "mt-4 text-[#8CA3C7]"
              )}
            >
              {pageDescription}
            </p>
          </div>
          <div className="flex min-w-0 flex-wrap gap-3">
            {isPaymentLookupView ? (
              <>
                <div className="grid h-[54px] min-w-[112px] place-items-center rounded-[12px] border border-[#00E7B0]/20 bg-[#00E7B0]/7 px-5 text-sm font-semibold text-[#00E7B0] shadow-[0_0_34px_rgba(0,231,176,.12)]">
                  {summary.totalRecords} Records
                </div>
                <Button onClick={handleLogout} type="button" variant="ghost">
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <div className="grid h-[54px] min-w-[112px] place-items-center rounded-[12px] border border-[#00E7B0]/20 bg-[#00E7B0]/7 px-5 text-sm font-semibold text-[#00E7B0] shadow-[0_0_34px_rgba(0,231,176,.12)]">
                  {summary.totalRecords} Records
                </div>
                <Button onClick={handleLogout} type="button" variant="ghost">
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </>
            )}
          </div>
        </header>

        {isPaymentLookupView ? (
          <PaymentLookupView />
        ) : isReciptsView ? (
          <ReciptsView role={dashboardRole} />
        ) : isTransactionsView ? (
          <TransactionsView />
        ) : isSedPaymentsView ? (
          <SedPaymentsView />
        ) : isStudentsView ? (
          <StudentsView />
        ) : isStudentBookListView ? (
          <StudentBookListView />
        ) : isUniformListsView ? (
          <UniformListsView />
        ) : isUniformReceiptsView ? (
          <UniformReceiptsView />
        ) : (
          <>
            <section className="mt-8 grid gap-5 sm:grid-cols-2 2xl:grid-cols-4">
              {stats.map((stat, index) => (
                <StatCardView index={index} key={stat.label} stat={stat} />
              ))}
            </section>

        <section className="mt-8 grid min-w-0 gap-7 lg:grid-cols-[minmax(0,1.6fr)_minmax(360px,.94fr)]">
          <div className="grid min-w-0 gap-7">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 18 }}
              transition={{ delay: 0.12, duration: 0.42 }}
            >
              <Card className="relative min-w-0 overflow-hidden rounded-[8px] border border-[#00E7B0]/58 bg-[linear-gradient(145deg,rgba(8,20,39,.72),rgba(3,11,24,.56))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.045),0_18px_46px_rgba(0,0,0,.32),0_0_20px_rgba(0,231,176,.06)] sm:p-5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(0,231,176,.055),transparent_32%),radial-gradient(circle_at_88%_100%,rgba(77,111,255,.055),transparent_34%)]" />
                <div className="relative z-10">
                <div className="flex items-center gap-3">
                  <div className="grid h-[48px] w-[48px] shrink-0 place-items-center rounded-[8px] bg-[#00E7B0]/10 text-[#00E7B0] shadow-[0_0_24px_rgba(0,231,176,.08)]">
                    <AdmissionCapIcon className="h-9 w-9" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[18px] font-semibold leading-tight text-white">
                      Admission Lookup
                    </h2>
                    <p className="mt-2 text-[13px] font-normal text-[#8CA3C7]">
                      Enter admission number to fetch payment details
                    </p>
                  </div>
                </div>

                <form
                  className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_154px_154px]"
                  onSubmit={handleLookup}
                >
                  <div className="relative">
                    <Input
                      className="h-[48px] rounded-[6px] border-[#34445E] bg-[#061226]/72 pr-12 text-[14px] placeholder:text-[#8CA3C7] focus:border-[#00E7B0]/60"
                      id="admissionNo"
                      onChange={(event) =>
                        setAdmissionNo(normalizeAdmissionNo(event.target.value))
                      }
                      placeholder="Enter Admission Number (e.g. SCS1234567)"
                      value={admissionNo}
                    />
                    <AdmissionInputIcon className="pointer-events-none absolute right-3.5 top-1/2 h-7 w-7 -translate-y-1/2 text-[#00E7B0]" />
                  </div>
                  <Button
                    className="h-[48px] w-full min-w-0 rounded-[6px] px-4"
                    disabled={lookupState === "loading"}
                    type="submit"
                  >
                    {lookupState === "loading" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Get Payments
                  </Button>
                  <Button
                    className="h-[48px] w-full min-w-0 rounded-[6px] px-4"
                    disabled={studentSyncState === "loading"}
                    onClick={handleStudentSync}
                    type="button"
                    variant="blue"
                  >
                    {studentSyncState === "loading" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCcw className="h-4 w-4" />
                    )}
                    Sync Student
                  </Button>
                </form>

                {lookupMessage ? (
                  <div
                    className={cn(
                      "mt-5 rounded-[14px] border px-4 py-3 text-sm font-semibold",
                      lookupState === "error" &&
                        "border-[#FF4D6D]/25 bg-[#FF4D6D]/10 text-[#FF4D6D]",
                      lookupState === "success" &&
                        "border-[#22C55E]/25 bg-[#22C55E]/10 text-[#22C55E]",
                      lookupState === "loading" &&
                        "border-[#4D6FFF]/25 bg-[#4D6FFF]/10 text-[#4D6FFF]"
                    )}
                  >
                    {lookupMessage}
                  </div>
                ) : null}

                {studentSyncMessage ? (
                  <div
                    className={cn(
                      "mt-3 rounded-[14px] border px-4 py-3 text-sm font-semibold",
                      studentSyncState === "error" &&
                        "border-[#FF4D6D]/25 bg-[#FF4D6D]/10 text-[#FF4D6D]",
                      studentSyncState === "success" &&
                        "border-[#22C55E]/25 bg-[#22C55E]/10 text-[#22C55E]",
                      studentSyncState === "loading" &&
                        "border-[#4D6FFF]/25 bg-[#4D6FFF]/10 text-[#4D6FFF]"
                    )}
                  >
                    {studentSyncMessage}
                  </div>
                ) : null}
                </div>
              </Card>
            </motion.div>

            <motion.div
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 18 }}
              transition={{ delay: 0.18, duration: 0.42 }}
            >
              <Card className="min-h-[430px] min-w-0 overflow-hidden border-t-2 border-t-[#8B5CF6]">
                <div className="p-6 pb-0 sm:p-7 sm:pb-0">
                  <SectionHeading
                    description="Payment data will appear here after lookup"
                    icon={<PaymentDocumentIcon className="h-7 w-7 text-[#8B5CF6]" />}
                    iconWrapperClassName="h-[44px] w-[44px] rounded-[9px] bg-[#2A174E] text-[#8B5CF6] shadow-[0_0_24px_rgba(139,92,246,.18)]"
                    title="Payment Details"
                  />
                </div>

                {lookupState === "loading" ? (
                  <PaymentSkeleton />
                ) : payments.length > 0 ? (
                  <PaymentRecords
                    copiedTransactionId={copiedTransactionId}
                    onCopyTransactionId={handleCopyTransactionId}
                    payments={payments}
                  />
                ) : (
                  <PaymentEmptyState />
                )}
              </Card>
            </motion.div>
          </div>

          <aside className="grid min-w-0 content-start gap-7">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 18 }}
              transition={{ delay: 0.25, duration: 0.42 }}
            >
              <Card className="relative min-w-0 overflow-hidden rounded-[8px] border-[#4D6FFF]/70 bg-[linear-gradient(145deg,rgba(8,20,39,.72),rgba(3,11,24,.56))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.045),0_18px_46px_rgba(0,0,0,.32),0_0_28px_rgba(77,111,255,.1)] sm:p-5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(77,111,255,.08),transparent_32%),radial-gradient(circle_at_88%_100%,rgba(0,231,176,.045),transparent_34%)]" />
                <div className="relative z-10">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-[#172D7D]/70 text-[#6F8BFF] shadow-[0_0_24px_rgba(77,111,255,.12)]">
                    <VerificationShieldIcon className="h-8 w-8 text-[#4D6FFF]" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[16px] font-semibold leading-tight text-white">
                      Transaction Verification
                    </h2>
                    <p className="mt-2 text-[12px] font-normal text-[#C7D2E4]">
                      Verify a transaction using transaction ID
                    </p>
                  </div>
                </div>

                <form className="mt-7 grid gap-3" onSubmit={handleVerify}>
                  <div className="relative">
                    <Input
                      className="h-11 rounded-[6px] border-[#34445E] bg-[#061226]/72 pr-12 text-[13px] placeholder:text-[#A5B4CC] focus:border-[#4D6FFF]/65 focus:shadow-[0_0_0_4px_rgba(77,111,255,.14),0_0_30px_rgba(77,111,255,.14)]"
                      id="transactionId"
                      onChange={(event) => setTransactionId(event.target.value)}
                      placeholder="Enter Transaction ID"
                      value={transactionId}
                    />
                    <ScanQrCode className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white" strokeWidth={2.2} />
                  </div>
                  <Button
                    className="h-11 w-full min-w-0 rounded-[6px] bg-gradient-to-r from-[#315EFF] to-[#2826C8] px-3 text-[13px] shadow-[0_0_34px_rgba(77,111,255,.24)] hover:shadow-[0_0_40px_rgba(77,111,255,.34)]"
                    disabled={verifyState === "loading"}
                    type="submit"
                    variant="blue"
                  >
                    {verifyState === "loading" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 fill-white/10" strokeWidth={2.1} />
                    )}
                    Verify Transaction
                  </Button>
                </form>

                <div
                  className={cn(
                    "mt-6 flex min-w-0 gap-3 rounded-[6px] border border-[#263852] bg-[#07172D]/72 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.035)] sm:gap-4 sm:p-4",
                    verifyState === "success" && "border-[#22C55E]/25 bg-[#22C55E]/10",
                    verifyState === "error" && "border-[#FF4D6D]/25 bg-[#FF4D6D]/10"
                  )}
                >
                  <div
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-[8px] bg-[#4D6FFF]/16 text-[#6F8BFF]",
                      verifyState === "success" && "bg-[#22C55E]/15 text-[#22C55E]",
                      verifyState === "error" && "bg-[#FF4D6D]/15 text-[#FF4D6D]"
                    )}
                  >
                    {verifyState === "success" ? (
                      <Check className="h-5 w-5" />
                    ) : verifyState === "error" ? (
                      <X className="h-5 w-5" />
                    ) : (
                      <span className="grid h-4 w-4 place-items-center rounded-full bg-[#4D6FFF] text-[10px] font-bold leading-none text-white">
                        i
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-white">
                      {verifyMessage || "Verification result will appear here"}
                    </p>
                    <p className="mt-1 text-[12px] leading-5 text-[#C7D2E4]">
                      {verifyMessage
                        ? "The latest verification status is shown above."
                        : "Enter a transaction ID and click verify."}
                    </p>
                    {showVerifySteps ? (
                      <div className="mt-4 grid gap-2">
                        {verifyStepItems.map((item) => (
                          <div
                            className={cn(
                              "flex min-w-0 items-start gap-3 rounded-[6px] border border-[#263852] bg-[#061226]/56 px-3 py-2",
                              item.state === "success" &&
                                "border-[#22C55E]/20 bg-[#22C55E]/10",
                              item.state === "error" &&
                                "border-[#FF4D6D]/20 bg-[#FF4D6D]/10",
                              item.state === "loading" &&
                                "border-[#4D6FFF]/25 bg-[#4D6FFF]/10"
                            )}
                            key={item.label}
                          >
                            <div
                              className={cn(
                                "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#4D6FFF]/16 text-[#6F8BFF]",
                                item.state === "success" && "bg-[#22C55E]/15 text-[#22C55E]",
                                item.state === "error" && "bg-[#FF4D6D]/15 text-[#FF4D6D]"
                              )}
                            >
                              {item.state === "loading" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : item.state === "success" ? (
                                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                              ) : item.state === "error" ? (
                                <X className="h-3.5 w-3.5" strokeWidth={3} />
                              ) : (
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[12px] font-semibold leading-4 text-white">
                                {item.label}
                              </p>
                              <p className="mt-0.5 text-[11px] leading-4 text-[#AAB8D0]">
                                {item.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                </div>
              </Card>
            </motion.div>
          </aside>
        </section>
          </>
        )}

        {isPaymentLookupView ? (
          <section className="mt-8 flex min-w-0 gap-5 rounded-[14px] border border-[#315EFF]/52 bg-[linear-gradient(145deg,rgba(14,31,79,.72),rgba(4,14,30,.64))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.045),0_18px_46px_rgba(0,0,0,.28),0_0_28px_rgba(77,111,255,.10)] sm:p-7">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#315EFF] text-white shadow-[0_0_30px_rgba(77,111,255,.34)] sm:h-11 sm:w-11">
              <Info className="h-5 w-5" strokeWidth={2.8} />
            </div>
            <div className="min-w-0">
              <h3 className="text-[16px] font-semibold text-white">Important Note</h3>
              <p className="mt-3 text-[13px] leading-6 text-[#D3DCF1]">
                Put the respective transaction IDs or order IDs from database,
                separated using comma.
              </p>
            </div>
          </section>
        ) : null}

        <footer className="mt-8 flex flex-col gap-3 rounded-[14px] border border-[#00E7B0]/12 bg-[rgba(6,18,38,.72)] px-5 py-4 text-sm text-[#8CA3C7] shadow-[0_20px_60px_rgba(0,0,0,.28)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <LockKeyhole className="h-4 w-4 fill-[#00E7B0]/20 text-[#00E7B0]" strokeWidth={2.8} />
            <span>Your payment data is safe and secure with us.</span>
          </div>
          <span>© 2026 Wizklub Payments. All rights reserved.</span>
        </footer>
        </div>
      </section>
    </main>
  );
}
