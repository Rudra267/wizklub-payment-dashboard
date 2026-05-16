"use client";

import { FormEvent, useState } from "react";

type Payment = {
  addedOn: string;
  transactionId: string;
  amount: number | string;
  paymentStatus: string;
  productName: string;
};

type LookupState = "idle" | "loading" | "success" | "error";
type VerifyState = "idle" | "loading" | "success" | "error";

function formatAmount(amount: number | string) {
  const numericAmount =
    typeof amount === "number" ? amount : Number(String(amount).replace(/,/g, ""));

  if (Number.isNaN(numericAmount)) {
    return String(amount);
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

export default function Home() {
  const [admissionNo, setAdmissionNo] = useState("SCS");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [lookupMessage, setLookupMessage] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [verifyMessage, setVerifyMessage] = useState("");
  const [copiedTransactionId, setCopiedTransactionId] = useState("");

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

  return (
    <main className="page">
      <div className="shell">
        <header className="header">
          <div>
            <p className="eyebrow">Wizklub Payments</p>
            <h1>Payment Dashboard</h1>
            <p className="subtitle">
              Search by admission number, review all wizklub payment records,
            </p>
          </div>
          <div className="status-pill">{payments.length} Records</div>
        </header>

        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Admission Lookup</h2>
          </div>
          <div className="panel-body">
            <form className="form-row" onSubmit={handleLookup}>
              <div className="field">
                <label htmlFor="admissionNo">Admission Number</label>
                <input
                  className="input"
                  id="admissionNo"
                  onChange={(event) =>
                    setAdmissionNo(normalizeAdmissionNo(event.target.value))
                  }
                  placeholder="SCS admission no"
                  value={admissionNo}
                />
              </div>
              <button className="button" disabled={lookupState === "loading"} type="submit">
                {lookupState === "loading" ? "Loading..." : "Get Payments"}
              </button>
            </form>

            {lookupMessage ? (
              <div
                className={`message ${
                  lookupState === "error"
                    ? "error"
                    : lookupState === "success"
                      ? "success"
                      : "info"
                }`}
              >
                {lookupMessage}
              </div>
            ) : null}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Payment Details</h2>
          </div>
          {lookupState === "loading" ? (
            <div className="loading-block">
              <span className="spinner" aria-hidden="true" />
              <span>Getting payment records...</span>
            </div>
          ) : payments.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Added On</th>
                    <th>Transaction ID</th>
                    <th>Amount</th>
                    <th>Payment Status</th>
                    <th>Product Name</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={`${payment.transactionId}-${payment.addedOn}`}>
                      <td>{payment.addedOn}</td>
                      <td>
                        <span
                          className={`copy-wrap ${
                            copiedTransactionId === payment.transactionId
                              ? "is-copied"
                              : ""
                          }`}
                        >
                          <button
                            className="copy-value"
                            onClick={() => handleCopyTransactionId(payment.transactionId)}
                            type="button"
                          >
                            {payment.transactionId}
                          </button>
                          <span className="copy-tooltip">
                            {copiedTransactionId === payment.transactionId
                              ? "Copied"
                              : "Click to copy"}
                          </span>
                        </span>
                      </td>
                      <td className="amount">{formatAmount(payment.amount)}</td>
                      <td>
                        <span className={`badge ${statusClass(payment.paymentStatus)}`}>
                          {payment.paymentStatus}
                        </span>
                      </td>
                      <td>{payment.productName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">Payment data will appear here after lookup.</div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Transaction Verification</h2>
          </div>
          <div className="panel-body">
            <form className="form-row" onSubmit={handleVerify}>
              <div className="field">
                <label htmlFor="transactionId">Transaction ID</label>
                <input
                  className="input"
                  id="transactionId"
                  onChange={(event) => setTransactionId(event.target.value)}
                  placeholder="Enter transaction ID"
                  value={transactionId}
                />
              </div>
              <button className="button secondary" disabled={verifyState === "loading"} type="submit">
                {verifyState === "loading" ? "Checking..." : "Verify"}
              </button>
            </form>

            {verifyMessage ? (
              <div
                className={`message ${
                  verifyState === "success"
                    ? "success"
                    : verifyState === "error"
                      ? "error"
                      : "info"
                }`}
              >
                {verifyMessage}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
