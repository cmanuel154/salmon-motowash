import { useState, useEffect } from "react";
import { db } from "../db";
import { formatRp, fmtDate } from "../utils/format";
import { C } from "../constants/theme";

const STATUS_CONFIG = {
  menunggu: {
    label: "Antri",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    dot: "#f59e0b",
    next: "sedang_dicuci",
    nextLabel: "Mulai Cuci",
    icon: "⏳",
  },
  sedang_dicuci: {
    label: "Sedang Dicuci",
    color: "#3B9FD4",
    bg: "rgba(59,159,212,0.12)",
    dot: "#3B9FD4",
    next: "selesai",
    nextLabel: "Selesai",
    icon: "🔄",
  },
  selesai: {
    label: "Selesai",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.12)",
    dot: "#22c55e",
    next: null,
    nextLabel: null,
    icon: "✅",
  },
};

const PAYMENT_LABELS = {
  cash: "Cash",
  qris: "QRIS",
  transfer: "Transfer",
  voucher: "Voucher",
};

const PAYMENT_COLORS = {
  cash: "#22c55e",
  qris: "#3B9FD4",
  transfer: "#f59e0b",
  voucher: "#a855f7",
};

export default function DisplayPage({ showToast }) {
  const [transactions, setTransactions] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [selected, setSelected] = useState(null); // selected transaction
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [pendingRating, setPendingRating] = useState(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingValue, setRatingValue] = useState(0);

  const todayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const loadData = async () => {
    try {
      const [trxs, wrks] = await Promise.all([
        db.getAll("transactions"),
        db.getAll("workers"),
      ]);
      const today = todayStr();
      const todayTrxs = trxs
        .filter((t) => t.date === today)
        .sort((a, b) => (a.queueNumber ?? 0) - (b.queueNumber ?? 0));
      setTransactions(todayTrxs);
      setWorkers(wrks.filter((w) => w.active));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  // update selected when transactions refresh
  useEffect(() => {
    if (selected) {
      const updated = transactions.find((t) => t.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [transactions]);

  const handleCardClick = (trx) => {
    setSelected(trx);
    setSelectedWorker(null);
  };

  const handleStatusAdvance = (trx) => {
    const cfg = STATUS_CONFIG[trx.status];
    if (!cfg || !cfg.next) return;

    if (trx.status === "menunggu") {
      confirmWorkerAssign();
    } else if (trx.status === "sedang_dicuci") {
      setPendingRating(trx);
      setRatingValue(0);
      setHoverRating(0);
      setShowRatingModal(true);
    }
  };

  const confirmWorkerAssign = async () => {
    if (!selectedWorker) {
      showToast?.("Pilih pekerja terlebih dahulu", "error");
      return;
    }
    setLoading(true);
    try {
      const worker = workers.find((w) => w.id === selectedWorker);
      const updates = {
        status: "sedang_dicuci",
        workerId: worker.id,
        workerName: worker.name,
        startedAt: new Date().toISOString(),
      };
      await db.updateItem("transactions", selected.id, updates);
      showToast?.(`${worker.name} mulai mencuci ${selected.plate}`, "success");
      setSelectedWorker(null);
      await loadData();
    } catch (e) {
      showToast?.("Gagal update status", "error");
    }
    setLoading(false);
  };

  const confirmSelesai = async (rating) => {
    setLoading(true);
    try {
      const updates = {
        status: "selesai",
        completedAt: new Date().toISOString(),
        rating: rating || null,
      };
      await db.updateItem("transactions", pendingRating.id, updates);
      showToast?.(`Transaksi ${pendingRating.plate} selesai!`, "success");
      setShowRatingModal(false);
      setPendingRating(null);
      if (selected?.id === pendingRating.id) setSelected(null);
      await loadData();
    } catch (e) {
      showToast?.("Gagal update status", "error");
    }
    setLoading(false);
  };

  const counts = {
    menunggu: transactions.filter((t) => t.status === "menunggu").length,
    sedang_dicuci: transactions.filter((t) => t.status === "sedang_dicuci").length,
    selesai: transactions.filter((t) => t.status === "selesai").length,
  };

  const qLabel = (n) => `Q-${String(n ?? 1).padStart(2, "0")}`;

  const elapsedMin = (iso) => {
    if (!iso) return null;
    const diff = Date.now() - new Date(iso).getTime();
    return Math.floor(diff / 60000);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "24px 16px" }}>
      {/* Header */}
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "Barlow Condensed, sans-serif",
                fontWeight: 700,
                fontSize: 28,
                color: C.white,
                margin: 0,
                letterSpacing: 1,
              }}
            >
              ANTRIAN HARI INI
            </h1>
            <p style={{ color: C.muted, margin: "4px 0 0", fontSize: 13 }}>
              {fmtDate(new Date().toISOString())} · Auto-refresh setiap 15 detik
            </p>
          </div>
          <button
            onClick={loadData}
            style={{
              background: C.surface,
              border: `1px solid #2a2a2a`,
              color: C.white,
              borderRadius: 6,
              padding: "8px 16px",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "Barlow, sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            ↻ Refresh
          </button>
        </div>

        {/* Status Summary Bar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
            marginBottom: 28,
          }}
        >
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div
              key={key}
              style={{
                background: cfg.bg,
                border: `1px solid ${cfg.color}40`,
                borderRadius: 10,
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 22 }}>{cfg.icon}</span>
              <div>
                <div
                  style={{
                    fontFamily: "Barlow Condensed, sans-serif",
                    fontSize: 28,
                    fontWeight: 700,
                    color: cfg.color,
                    lineHeight: 1,
                  }}
                >
                  {counts[key]}
                </div>
                <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                  {cfg.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Layout: Grid kiri + Detail kanan */}
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          {/* Antrian Grid */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {transactions.length === 0 ? (
              <div
                style={{
                  background: C.surface,
                  border: "1px solid #2a2a2a",
                  borderRadius: 12,
                  padding: "48px 24px",
                  textAlign: "center",
                  color: C.muted,
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 12 }}>🏍️</div>
                <div style={{ fontSize: 14 }}>Belum ada transaksi hari ini</div>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: 12,
                }}
              >
                {transactions.map((trx) => {
                  const cfg = STATUS_CONFIG[trx.status] || STATUS_CONFIG.menunggu;
                  const isSelected = selected?.id === trx.id;
                  const elapsed =
                    trx.status === "sedang_dicuci"
                      ? elapsedMin(trx.startedAt)
                      : trx.status === "menunggu"
                      ? elapsedMin(trx.createdAt)
                      : null;
                  const isLate = elapsed !== null && elapsed > 30;

                  return (
                    <div
                      key={trx.id}
                      onClick={() => handleCardClick(trx)}
                      style={{
                        background: isSelected ? cfg.bg : C.card,
                        border: `2px solid ${isSelected ? cfg.color : isLate ? "#E8372A" : "#2a2a2a"}`,
                        borderRadius: 10,
                        padding: "14px 12px",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {/* Status dot */}
                      <div
                        style={{
                          position: "absolute",
                          top: 10,
                          right: 10,
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: cfg.dot,
                          boxShadow:
                            trx.status === "sedang_dicuci"
                              ? `0 0 8px ${cfg.dot}`
                              : "none",
                        }}
                      />

                      {/* Queue number */}
                      <div
                        style={{
                          fontFamily: "Barlow Condensed, sans-serif",
                          fontWeight: 700,
                          fontSize: 32,
                          color: isSelected ? cfg.color : C.white,
                          lineHeight: 1,
                          marginBottom: 6,
                        }}
                      >
                        {qLabel(trx.queueNumber ?? trx.queue_number)}
                      </div>

                      {/* Plate */}
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: C.white,
                          fontFamily: "Barlow, sans-serif",
                          marginBottom: 4,
                          letterSpacing: 0.5,
                        }}
                      >
                        {trx.plate}
                      </div>

                      {/* Motor type */}
                      <div style={{ fontSize: 11, color: C.muted }}>
                        {trx.motorType?.name || "-"}
                      </div>

                      {/* Elapsed */}
                      {elapsed !== null && (
                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 11,
                            color: isLate ? "#E8372A" : C.muted,
                            fontWeight: isLate ? 600 : 400,
                          }}
                        >
                          {elapsed} menit{isLate ? " ⚠️" : ""}
                        </div>
                      )}

                      {/* Worker badge if assigned */}
                      {trx.workerName && trx.status !== "menunggu" && (
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 10,
                            background: "rgba(59,159,212,0.15)",
                            color: "#3B9FD4",
                            borderRadius: 4,
                            padding: "2px 6px",
                            display: "inline-block",
                          }}
                        >
                          {trx.workerName}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div
              style={{
                width: 300,
                flexShrink: 0,
                position: "sticky",
                top: 80,
                alignSelf: "flex-start",
              }}
            >
            <div
              style={{
                background: C.surface,
                border: "1px solid #2a2a2a",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              {/* Panel Header */}
              <div
                style={{
                  background: STATUS_CONFIG[selected.status]?.bg,
                  borderBottom: `1px solid ${STATUS_CONFIG[selected.status]?.color}40`,
                  padding: "16px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "Barlow Condensed, sans-serif",
                      fontWeight: 700,
                      fontSize: 24,
                      color: STATUS_CONFIG[selected.status]?.color,
                    }}
                  >
                    {qLabel(selected.queueNumber ?? selected.queue_number)}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: STATUS_CONFIG[selected.status]?.color,
                      opacity: 0.8,
                    }}
                  >
                    {STATUS_CONFIG[selected.status]?.label}
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: C.muted,
                    fontSize: 18,
                    cursor: "pointer",
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>

              {/* Panel Body */}
              <div style={{ padding: "16px 20px" }}>
                <DetailRow label="Plat" value={selected.plate} highlight />
                <DetailRow
                  label="Nama"
                  value={selected.memberName || "—"}
                />
                <DetailRow
                  label="Motor"
                  value={selected.motorType?.name || "—"}
                />
                {selected.additionals?.includes("wax") && (
                  <DetailRow label="Tambahan" value="+Wax" />
                )}
                <DetailRow
                  label="Pembayaran"
                  value={PAYMENT_LABELS[selected.payment] || selected.payment}
                  valueColor={PAYMENT_COLORS[selected.payment]}
                />
                <DetailRow
                  label="Total"
                  value={formatRp(selected.totalAmount)}
                  highlight
                />
                {selected.notes && (
                  <DetailRow label="Catatan" value={selected.notes} />
                )}
                {selected.workerName && (
                  <DetailRow
                    label="Pekerja"
                    value={selected.workerName}
                    valueColor="#3B9FD4"
                  />
                )}
                {selected.status === "sedang_dicuci" && selected.startedAt && (
                  <DetailRow
                    label="Mulai Cuci"
                    value={`${elapsedMin(selected.startedAt)} menit lalu`}
                    valueColor={
                      elapsedMin(selected.startedAt) > 30 ? "#E8372A" : C.muted
                    }
                  />
                )}
                {selected.status === "selesai" && selected.completedAt && (
                  <DetailRow
                    label="Selesai"
                    value={new Date(selected.completedAt).toLocaleTimeString(
                      "id-ID",
                      { hour: "2-digit", minute: "2-digit" }
                    )}
                    valueColor="#22c55e"
                  />
                )}

                {/* Inline worker selection for menunggu cards */}
                {selected.status === "menunggu" && (
                  <div style={{ marginTop: 4 }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#6b7280",
                        fontFamily: "Barlow, sans-serif",
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        textTransform: "uppercase",
                        marginBottom: 8,
                      }}
                    >
                      Pilih Pekerja
                    </div>
                    {workers.length === 0 ? (
                      <div
                        style={{
                          color: "#6b7280",
                          fontSize: 12,
                          fontFamily: "Barlow, sans-serif",
                          padding: "8px 0",
                        }}
                      >
                        Tidak ada pekerja aktif
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {workers.map((w) => {
                          const isActive = selectedWorker === w.id;
                          const initials = w.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2);
                          return (
                            <div
                              key={w.id}
                              onClick={() => setSelectedWorker(isActive ? null : w.id)}
                              style={{
                                background: isActive ? "rgba(59,159,212,0.15)" : "#1a1a1a",
                                border: `2px solid ${isActive ? "#3B9FD4" : "#2a2a2a"}`,
                                borderRadius: 8,
                                padding: "8px 10px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                transition: "all 0.15s",
                              }}
                            >
                              <div
                                style={{
                                  width: 30,
                                  height: 30,
                                  borderRadius: "50%",
                                  overflow: "hidden",
                                  background: "#2a2a2a",
                                  flexShrink: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#3B9FD4",
                                }}
                              >
                                {w.photo ? (
                                  <img
                                    src={w.photo}
                                    alt={w.name}
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                  />
                                ) : (
                                  initials
                                )}
                              </div>
                              <span
                                style={{
                                  color: isActive ? "#3B9FD4" : "#d1d5db",
                                  fontWeight: 600,
                                  fontSize: 13,
                                  fontFamily: "Barlow, sans-serif",
                                }}
                              >
                                {w.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Button */}
              {STATUS_CONFIG[selected.status]?.next && (
                <div style={{ padding: "0 20px 20px" }}>
                  <button
                    onClick={() => handleStatusAdvance(selected)}
                    disabled={
                      loading ||
                      (selected.status === "menunggu" && !selectedWorker)
                    }
                    style={{
                      width: "100%",
                      background:
                        selected.status === "menunggu"
                          ? selectedWorker
                            ? "#E8372A"
                            : "#2a2a2a"
                          : "#22c55e",
                      color:
                        selected.status === "menunggu"
                          ? selectedWorker
                            ? "#fff"
                            : "#6b7280"
                          : "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "12px",
                      fontFamily: "Barlow Condensed, sans-serif",
                      fontWeight: 700,
                      fontSize: 16,
                      cursor:
                        loading || (selected.status === "menunggu" && !selectedWorker)
                          ? "not-allowed"
                          : "pointer",
                      letterSpacing: 0.5,
                      opacity: loading ? 0.6 : 1,
                      transition: "all 0.15s",
                    }}
                  >
                    {loading ? "Menyimpan..." : STATUS_CONFIG[selected.status]?.nextLabel}
                  </button>
                </div>
              )}
            </div>
            </div>
          )}
        </div>
      </div>

      {/* Rating Modal */}
      {showRatingModal && pendingRating && (
        <ModalOverlay onClose={() => setShowRatingModal(false)}>
          <div style={{ padding: "24px 24px 20px", textAlign: "center" }}>
            <h2
              style={{
                fontFamily: "Barlow Condensed, sans-serif",
                fontWeight: 700,
                fontSize: 20,
                color: C.white,
                margin: "0 0 4px",
              }}
            >
              Selesai — {pendingRating.plate}
            </h2>
            <p style={{ color: C.muted, fontSize: 13, margin: "0 0 24px" }}>
              Beri rating untuk pekerja{" "}
              <span style={{ color: "#3B9FD4" }}>
                {pendingRating.workerName}
              </span>
            </p>

            {/* Stars */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 8,
                marginBottom: 24,
              }}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() =>
                    setRatingValue(ratingValue === star ? 0 : star)
                  }
                  style={{
                    fontSize: 36,
                    cursor: "pointer",
                    color:
                      star <= (hoverRating || ratingValue)
                        ? "#f59e0b"
                        : "#2a2a2a",
                    transition: "color 0.1s, transform 0.1s",
                    transform:
                      star <= (hoverRating || ratingValue)
                        ? "scale(1.15)"
                        : "scale(1)",
                    display: "inline-block",
                  }}
                >
                  ★
                </span>
              ))}
            </div>

            {ratingValue > 0 && (
              <div
                style={{
                  color: "#f59e0b",
                  fontSize: 13,
                  marginBottom: 20,
                  fontWeight: 600,
                }}
              >
                {["", "Kurang", "Cukup", "Baik", "Sangat Baik", "Luar Biasa!"][ratingValue]}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => confirmSelesai(null)}
                disabled={loading}
                style={{
                  flex: 1,
                  background: C.card,
                  border: "1px solid #2a2a2a",
                  color: C.muted,
                  borderRadius: 8,
                  padding: "11px",
                  cursor: "pointer",
                  fontFamily: "Barlow, sans-serif",
                  fontSize: 13,
                }}
              >
                Lewati
              </button>
              <button
                onClick={() => confirmSelesai(ratingValue || null)}
                disabled={loading}
                style={{
                  flex: 2,
                  background: "#22c55e",
                  border: "none",
                  color: "#fff",
                  borderRadius: 8,
                  padding: "11px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "Barlow Condensed, sans-serif",
                  fontWeight: 700,
                  fontSize: 16,
                  letterSpacing: 0.5,
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? "Menyimpan..." : "Konfirmasi Selesai"}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

// Helper components
function DetailRow({ label, value, highlight, valueColor }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 8,
        marginBottom: 10,
        paddingBottom: 10,
        borderBottom: "1px solid #1f1f1f",
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: "#6b7280",
          fontFamily: "Barlow, sans-serif",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 13,
          color: valueColor || (highlight ? "#fff" : "#d1d5db"),
          fontWeight: highlight ? 600 : 400,
          fontFamily: highlight ? "Barlow Condensed, sans-serif" : "Barlow, sans-serif",
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function ModalOverlay({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#141414",
          border: "1px solid #2a2a2a",
          borderRadius: 14,
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
