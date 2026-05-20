"use client";

import { useEffect, useMemo, useState } from "react";
import type { ElementType, FormEvent, ReactNode } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  BarChart3,
  Check,
  Copy,
  CreditCard,
  FileText,
  GraduationCap,
  IndianRupee,
  Landmark,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  LogOut,
  Menu,
  RefreshCcw,
  ScanQrCode,
  Search,
  Settings,
  ShieldCheck,
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

type Payment = {
  addedOn: string;
  transactionId: string;
  amount: number | string;
  paymentStatus: string;
  productName: string;
};

type LookupState = "idle" | "loading" | "success" | "error";
type VerifyState = "idle" | "loading" | "success" | "error";
type AuthState = "checking" | "loggedIn" | "loggedOut";

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
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: CreditCard, label: "Payments" },
  { icon: RefreshCcw, label: "Transactions" },
  { icon: BadgeCheck, label: "Refunds" },
  { icon: Landmark, label: "Settlements" },
  { icon: BarChart3, label: "Reports" },
  { icon: GraduationCap, label: "Students" },
  { icon: Settings, label: "Settings" }
];

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

function normalizeAdmissionNo(value: string) {
  const withoutSpaces = value.toUpperCase().replace(/\s/g, "");
  const withoutRepeatedPrefix = withoutSpaces.replace(/^(SCS)+/, "");

  return `SCS${withoutRepeatedPrefix}`;
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
        <div className="text-[18px] font-bold leading-none text-white">WIZKLUB</div>
        <div className="mt-1 text-[12px] font-semibold tracking-[0.22em] text-[#00E7B0]">
          PAYMENTS
        </div>
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-[280px] overflow-hidden border-r border-white/10 bg-gradient-to-b from-[#02111D] via-[#021725] to-[#041E33] p-4 text-white shadow-[24px_0_70px_rgba(0,0,0,.34)] xl:flex xl:flex-col">
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="px-2 py-3">
          <LogoMark />
        </div>

        <nav className="mt-8 grid gap-2">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = index === 0;

            return (
              <button
                aria-disabled={!isActive}
                className={cn(
                  "group flex h-[52px] items-center gap-4 rounded-[13px] px-4 text-[15px] font-medium transition duration-200",
                  isActive &&
                    "border border-[#00E7B0]/24 bg-[#00E7B0]/12 text-white shadow-[0_0_28px_rgba(0,231,176,.14),inset_0_1px_0_rgba(255,255,255,.05)] hover:scale-[1.015] hover:bg-[#00E7B0]/14",
                  !isActive &&
                    "cursor-not-allowed text-[#60708A] opacity-50"
                )}
                disabled={!isActive}
                key={item.label}
                tabIndex={isActive ? 0 : -1}
                type="button"
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition",
                    isActive && "group-hover:scale-105"
                  )}
                />
                {item.label}
              </button>
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
            <div className="text-sm font-bold text-white">WIZKLUB</div>
            <div className="text-xs font-semibold tracking-[0.2em] text-[#00E7B0]">
              PAYMENTS
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
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
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
                {navItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = index === 0;

                  return (
                    <button
                      aria-disabled={!isActive}
                      className={cn(
                        "group flex h-[52px] items-center gap-4 rounded-[13px] px-4 text-[15px] font-medium transition duration-200",
                        isActive &&
                          "border border-[#00E7B0]/24 bg-[#00E7B0]/12 text-white shadow-[0_0_28px_rgba(0,231,176,.14),inset_0_1px_0_rgba(255,255,255,.05)]",
                        !isActive && "cursor-not-allowed text-[#60708A] opacity-50"
                      )}
                      disabled={!isActive}
                      key={item.label}
                      onClick={isActive ? onClose : undefined}
                      tabIndex={isActive ? 0 : -1}
                      type="button"
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </button>
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

export default function Home() {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginState, setLoginState] = useState<LookupState>("idle");
  const [loginMessage, setLoginMessage] = useState("");
  const [admissionNo, setAdmissionNo] = useState("SCS");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [lookupMessage, setLookupMessage] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [verifyMessage, setVerifyMessage] = useState("");
  const [copiedTransactionId, setCopiedTransactionId] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store"
        });
        const result = await response.json();

        setAuthState(result.authenticated ? "loggedIn" : "loggedOut");
      } catch {
        setAuthState("loggedOut");
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

      await waitForMinimumDuration(loginStartedAt, 2500);
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
    setAuthState("loggedOut");
    setPayments([]);
    setLookupState("idle");
    setLookupMessage("");
    setVerifyState("idle");
    setVerifyMessage("");
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
    setLookupMessage("Loading payment records. Please wait 5-10 seconds.");
    setPayments([]);

    try {
      await wait(5000);
      const response = await fetch(
        `/api/payments?admissionNo=${encodeURIComponent(trimmedAdmissionNo)}`
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to fetch payment details.");
      }

      setPayments(result.data);
      setLookupState("success");
      setLookupMessage(
        result.data.length
          ? `Found ${result.data.length} payment record${
              result.data.length === 1 ? "" : "s"
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

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const matchedTransactionIds = getSingleTransactionId(transactionId);

    if (!transactionId.trim() || matchedTransactionIds.length === 0) {
      setVerifyState("error");
      setVerifyMessage("Please enter one ORDS-KIT transaction ID.");
      return;
    }

    if (matchedTransactionIds.length > 1) {
      setVerifyState("error");
      setVerifyMessage("Please verify only one ORDS-KIT transaction ID at a time.");
      return;
    }

    const verifiedTransactionId = matchedTransactionIds[0] as string;
    setTransactionId(verifiedTransactionId);
    setVerifyState("loading");
    setVerifyMessage("");

    try {
      const response = await fetch("/api/transaction/verify", {
        body: JSON.stringify({ transactionId: verifiedTransactionId }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Transaction verification failed.");
      }

      setVerifyState("success");
      setVerifyMessage(
        result.message || "Receipt generated. Reach out site for download receipt."
      );
    } catch (error) {
      setVerifyState("error");
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
              Wizklub Payments
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
                  autoComplete="username"
                  autoFocus
                  id="username"
                  onChange={(event) => setLoginUsername(event.target.value)}
                  value={loginUsername}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-white" htmlFor="password">
                Password
                <Input
                  autoComplete="current-password"
                  id="password"
                  onChange={(event) => setLoginPassword(event.target.value)}
                  type="password"
                  value={loginPassword}
                />
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
      <Sidebar />
      <MobileSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <section className="relative min-h-screen px-3 pb-5 pt-[112px] sm:px-6 lg:px-8 xl:ml-[280px] xl:px-10 xl:py-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_3%,rgba(0,231,176,.10),transparent_24%),radial-gradient(circle_at_80%_4%,rgba(77,111,255,.08),transparent_24%)]" />
        <div className="relative z-10 min-w-0">
        <MobileHeader onMenuOpen={() => setIsMobileMenuOpen(true)} />

        <header className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#00E7B0]">
              WIZKLUB PAYMENTS
            </p>
            <h1 className="mt-3 text-[34px] font-bold leading-tight text-white md:text-[38px]">
              Payment Dashboard
            </h1>
            <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[#8CA3C7]">
              Search, view and verify all payment transactions in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="grid h-[54px] min-w-[112px] place-items-center rounded-[12px] border border-[#00E7B0]/20 bg-[#00E7B0]/7 px-5 text-sm font-semibold text-[#00E7B0] shadow-[0_0_34px_rgba(0,231,176,.12)]">
              {summary.totalRecords} Records
            </div>
            <Button onClick={handleLogout} type="button" variant="ghost">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>

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
                  className="mt-6 grid gap-3 md:grid-cols-[minmax(0,1fr)_154px]"
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
                  <Button className="h-[48px] w-full min-w-0 rounded-[6px] px-4" disabled={lookupState === "loading"} type="submit">
                    {lookupState === "loading" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Get Payments
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
                  </div>
                </div>
                </div>
              </Card>
            </motion.div>
          </aside>
        </section>

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
