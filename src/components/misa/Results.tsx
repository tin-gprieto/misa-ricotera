import { useEffect, useRef, useState } from "react";
import type { GameTrack } from "../../lib/misaGame";
import { SLOT_LABELS, MAX_ATTENDANCE } from "../../lib/misaGame";

function popColor(p: number): string {
  if (p >= 70) return "#2ecc71";
  if (p >= 51) return "#f1c40f";
  return "#e74c3c";
}

const STADIUM_SRC =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/pogo-IM4a5TetY4BIJ7zTeWd4yK18P6ZPzh.jpg";

interface Props {
  slots: (GameTrack | null)[];
  attendance: number;
  won: boolean;
  onRestart: () => void;
}

interface ImageModal {
  blobUrl: string;
  blob: Blob;
}

function formatNumber(n: number) {
  return n.toLocaleString("es-AR");
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (ctx.measureText(t + "…").width > maxWidth && t.length > 0) t = t.slice(0, -1);
  return t + "…";
}

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function verdictText(attendance: number, won: boolean): string {
  if (won) return "¡ESTADIO LLENO! LA ÚLTIMA MISA FUE HISTÓRICA";
  if (attendance >= MAX_ATTENDANCE * 0.75) return "CASI LO LOGRÁS, FALTÓ EL RITUAL PERFECTO";
  if (attendance >= MAX_ATTENDANCE * 0.4) return "BUENA CONVOCATORIA, PERO EL AGUANTE PIDE MÁS";
  return "LA MISA QUEDÓ A MEDIAS";
}

export default function Results({ slots, attendance, won, onRestart }: Props) {
  const [count, setCount] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showVerdict, setShowVerdict] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [imageModal, setImageModal] = useState<ImageModal | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [showModalSocial, setShowModalSocial] = useState(false);
  const [clipboardCopied, setClipboardCopied] = useState(false);

  const shareMenuRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const blobUrlRef = useRef<string | null>(null);

  const fillRatio = Math.min(1, attendance / MAX_ATTENDANCE);

  // Count-up animation
  useEffect(() => {
    const duration = 2400;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(eased * attendance));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    const revealTimer = setTimeout(() => setRevealed(true), 60);
    rafRef.current = requestAnimationFrame(tick);
    const verdictTimer = setTimeout(() => setShowVerdict(true), 2500);
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(revealTimer);
      clearTimeout(verdictTimer);
    };
  }, [attendance]);

  // Close page-share menu on outside click
  useEffect(() => {
    if (!showShareMenu) return;
    function handleClick(e: MouseEvent) {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showShareMenu]);

  // Revoke blob URL when modal closes
  useEffect(() => {
    if (imageModal) {
      blobUrlRef.current = imageModal.blobUrl;
    } else if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, [imageModal]);

  // ESC to close modal + lock body scroll
  useEffect(() => {
    if (!imageModal) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [imageModal]); // eslint-disable-line react-hooks/exhaustive-deps

  const clipTop = revealed ? (1 - fillRatio) * 100 : 100;
  const glowBottom = revealed ? `${fillRatio * 100}%` : "0%";

  // ── Page share ──────────────────────────────────────────
  function shareToSocial(platform: "whatsapp" | "x" | "facebook") {
    const url = window.location.href;
    const text = `Armé mi setlist para La última misa ricotera 🎸 Convoqué ${formatNumber(attendance)} personas. ¿Podés hacerlo mejor?`;
    const links = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
      x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    };
    window.open(links[platform], "_blank", "noopener,noreferrer");
    setShowShareMenu(false);
  }

  // ── Image generation ─────────────────────────────────────
  async function generateImageBlob(): Promise<Blob> {
    const W = 1200;
    const H = 675;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Load fonts, cover images, and stadium photo in parallel
    const coverUrls = slots.map((t) => t?.albumCover ?? null);
    const [coverImgs, stadiumImg] = await Promise.all([
      Promise.all(coverUrls.map((url) => (url ? loadImg(url) : Promise.resolve(null)))),
      loadImg(STADIUM_SRC),
      Promise.all([
        document.fonts.load('700 30px "Oswald"'),
        document.fonts.load('600 17px "Inter"'),
      ]).catch(() => {}),
    ]);

    ctx.fillStyle = "#0d0d14";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#c0392b";
    ctx.fillRect(0, 0, W, 6);

    ctx.fillStyle = "#e8e8f0";
    ctx.font = '700 30px "Oswald", Arial, sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("LA ÚLTIMA MISA RICOTERA", W / 2, 46);

    const ROW_TOP = 62, ROW_H = 56, ROW_GAP = 4, ROW_X = 60;
    const ROW_W = W - ROW_X * 2;
    const COVER_SIZE = 44;
    const textX = ROW_X + 8 + COVER_SIZE + 10; // fixed left margin including cover space
    const numX = ROW_X + ROW_W - 16;
    const maxNameW = numX - textX - 80;

    for (let i = 0; i < slots.length; i++) {
      const track = slots[i];
      const ry = ROW_TOP + i * (ROW_H + ROW_GAP);
      const isPogo = i === 2;

      // Row background + border
      drawRoundRect(ctx, ROW_X, ry, ROW_W, ROW_H, 6);
      ctx.fillStyle = isPogo ? "rgba(225,177,44,0.1)" : "#13131f";
      ctx.fill();
      ctx.strokeStyle = isPogo ? "#e1b12c" : "#25253a";
      ctx.lineWidth = isPogo ? 1.5 : 1;
      drawRoundRect(ctx, ROW_X, ry, ROW_W, ROW_H, 6);
      ctx.stroke();

      // Album cover
      const coverImg = coverImgs[i];
      if (coverImg) {
        const cx = ROW_X + 8;
        const cy = ry + (ROW_H - COVER_SIZE) / 2;
        ctx.save();
        drawRoundRect(ctx, cx, cy, COVER_SIZE, COVER_SIZE, 4);
        ctx.clip();
        ctx.drawImage(coverImg, cx, cy, COVER_SIZE, COVER_SIZE);
        ctx.restore();
      }

      const hasLabel = !!SLOT_LABELS[i];

      if (hasLabel) {
        ctx.fillStyle = isPogo ? "#f4cf52" : "#6a6a8a";
        ctx.font = '400 11px "Oswald", Arial, sans-serif';
        ctx.textAlign = "left";
        ctx.fillText(SLOT_LABELS[i]!.toUpperCase(), textX, ry + 15);
      }

      ctx.fillStyle = "#e8e8f0";
      ctx.font = '600 17px "Inter", Arial, sans-serif';
      ctx.textAlign = "left";
      ctx.fillText(
        truncateText(ctx, track ? track.name : "—", maxNameW),
        textX,
        hasLabel ? ry + 33 : ry + ROW_H / 2 + 6,
      );

      if (track?.albumName) {
        ctx.fillStyle = "#6a6a8a";
        ctx.font = '400 11px "Inter", Arial, sans-serif';
        ctx.fillText(
          truncateText(ctx, `${track.albumName} · ${track.albumYear}`, maxNameW),
          textX,
          ry + ROW_H - 8,
        );
      }

      if (track) {
        ctx.font = '600 13px "Inter", Arial, sans-serif';
        ctx.textAlign = "right";
        const textY = ry + ROW_H / 2 + 5;

        if (track.popularity > 90) {
          const numStr = String(track.popularity);
          ctx.fillStyle = popColor(track.popularity);
          ctx.fillText(numStr, numX, textY);
          const numWidth = ctx.measureText(numStr).width;
          ctx.fillStyle = "#f4cf52";
          ctx.fillText("★", numX - numWidth - 3, textY);
        } else {
          ctx.fillStyle = popColor(track.popularity);
          ctx.fillText(String(track.popularity), numX, textY);
        }
      }
    }

    const footerY = H - 28;
    const secY = ROW_TOP + 5 * (ROW_H + ROW_GAP) + 4;
    const secH = footerY - secY;

    // Stadium photo as background for the attendance section
    if (stadiumImg) {
      const drawW = W;
      const drawH = (stadiumImg.naturalHeight / stadiumImg.naturalWidth) * W;
      // anchor to bottom so the crowd fills the frame
      const drawY = secY + secH - drawH;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, secY, W, secH);
      ctx.clip();
      ctx.drawImage(stadiumImg, 0, drawY, drawW, drawH);
      ctx.restore();
    }

    // Dark gradient overlay so text stays readable
    const overlay = ctx.createLinearGradient(0, secY, 0, footerY);
    overlay.addColorStop(0, "rgba(10,10,20,0.88)");
    overlay.addColorStop(0.45, "rgba(10,10,20,0.60)");
    overlay.addColorStop(1, "rgba(10,10,20,0.78)");
    ctx.fillStyle = overlay;
    ctx.fillRect(0, secY, W, secH);

    // Text with drop shadow for legibility
    ctx.shadowColor = "rgba(0,0,0,0.9)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = won ? "#f4cf52" : "#ffffff";
    ctx.font = '700 76px "Oswald", Arial, sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(formatNumber(attendance), W / 2, secY + 90);

    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = '400 12px "Oswald", Arial, sans-serif';
    ctx.fillText("PERSONAS EN EL ESTADIO · META 400.000", W / 2, secY + 115);

    ctx.fillStyle = won ? "#f4cf52" : "#ffffff";
    ctx.font = '700 20px "Oswald", Arial, sans-serif';
    ctx.fillText(verdictText(attendance, won), W / 2, secY + 148);

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = "#13131f";
    ctx.fillRect(0, H - 28, W, 28);
    ctx.font = '400 12px "Inter", Arial, sans-serif';
    const baseline = H - 10;
    ctx.fillStyle = "#5a5a7a";
    ctx.textAlign = "left";
    ctx.fillText("La última misa ricotera", ROW_X, baseline);
    ctx.fillStyle = "#3a3a5a";
    ctx.textAlign = "right";
    ctx.fillText(`© ${new Date().getFullYear()} Martín González Prieto`, W - ROW_X, baseline);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("canvas toBlob failed"))),
        "image/png",
      );
    });
  }

  // ── Modal controls ───────────────────────────────────────
  async function openImageModal() {
    setImageLoading(true);
    try {
      const blob = await generateImageBlob();
      const blobUrl = URL.createObjectURL(blob);
      setImageModal({ blob, blobUrl });
    } finally {
      setImageLoading(false);
    }
  }

  function closeModal() {
    setImageModal(null);
    setShowModalSocial(false);
    setClipboardCopied(false);
  }

  async function shareToSocialWithImage(platform: "whatsapp" | "x" | "facebook") {
    if (!imageModal) return;

    // Copy image to clipboard before opening the platform so the user can paste it
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": imageModal.blob }),
      ]);
      setClipboardCopied(true);
      setTimeout(() => setClipboardCopied(false), 5000);
    } catch {
      // clipboard not supported or denied — proceed anyway
    }

    const text = `Convoqué ${formatNumber(attendance)} personas en La última misa ricotera 🎸`;
    const url = window.location.href;
    const links = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
      x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    };
    window.open(links[platform], "_blank", "noopener,noreferrer");
  }

  function downloadFromModal() {
    if (!imageModal) return;
    const a = document.createElement("a");
    a.href = imageModal.blobUrl;
    a.download = "misa-resultado.png";
    a.click();
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <>
      <div className="misa misa-results">
        <div className="results-stadium">
          <img
            src={STADIUM_SRC || "/placeholder.svg"}
            alt="Estadio durante la misa"
            className="results-stadium-base"
          />
          <img
            src={STADIUM_SRC || "/placeholder.svg"}
            alt=""
            aria-hidden="true"
            className="results-stadium-bright"
            style={{ clipPath: `inset(${clipTop}% 0 0 0)` }}
          />
          <div
            className="results-stadium-glow"
            style={{ bottom: glowBottom, opacity: revealed && fillRatio > 0 ? 1 : 0 }}
          />
          <div className="results-counter">
            <div className="results-count-num">{formatNumber(count)}</div>
            <div className="results-count-label">
              personas en el estadio · meta 400.000
            </div>
          </div>
        </div>

        {showVerdict && (
          <div className={`results-verdict${won ? " results-verdict--win" : ""}`}>
            <h2>
              {won
                ? "¡Estadio lleno! La última misa fue histórica"
                : attendance >= MAX_ATTENDANCE * 0.75
                  ? "Casi lo lográs, faltó el ritual perfecto"
                  : attendance >= MAX_ATTENDANCE * 0.4
                    ? "Buena convocatoria, pero el aguante pide más"
                    : "La misa quedó a medias"}
            </h2>
            <p>
              Llevaste a <strong>{formatNumber(attendance)}</strong> personas de
              las 400.000 posibles
              {won
                ? `. El pogo más grande del mundo explotó con ${slots[2]?.name ?? "una canción épica"}.`
                : "."}
            </p>
          </div>
        )}

        <div className="results-setlist">
          {slots.map((track, i) => (
            <div
              key={i}
              className={`results-row${i === 2 ? " results-row--pogo" : ""}`}
            >
              {track?.albumCover && (
                <img src={track.albumCover || "/placeholder.svg"} alt="" />
              )}
              <div className="results-row-body">
                {SLOT_LABELS[i] && (
                  <div className="results-row-label">{SLOT_LABELS[i]}</div>
                )}
                <div className="results-row-track">
                  {track ? track.name : "—"}
                </div>
              </div>
              {track && (
                <div className="results-row-pop">
                  {track.popularity > 90 && (
                    <span className="picker-pop-star">★</span>
                  )}
                  <span
                    className="picker-pop-num"
                    style={{ color: popColor(track.popularity) }}
                  >
                    {track.popularity}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="results-actions">
          <div className="results-share-row">
            {/* Share page */}
            <div className="results-share-wrap" ref={shareMenuRef}>
              <button
                className="results-share-btn"
                onClick={() => setShowShareMenu((v) => !v)}
                aria-expanded={showShareMenu}
              >
                <IconUpload />
                Compartir la página
              </button>

              {showShareMenu && (
                <div className="results-share-menu" role="menu">
                  <button className="results-share-menu-item" onClick={() => shareToSocial("whatsapp")} role="menuitem">
                    <IconWhatsApp className="results-social-icon results-social-icon--wa" />
                    WhatsApp
                  </button>
                  <button className="results-share-menu-item" onClick={() => shareToSocial("x")} role="menuitem">
                    <IconX className="results-social-icon results-social-icon--x" />
                    X
                  </button>
                  <button className="results-share-menu-item" onClick={() => shareToSocial("facebook")} role="menuitem">
                    <IconFacebook className="results-social-icon results-social-icon--fb" />
                    Facebook
                  </button>
                </div>
              )}
            </div>

            {/* Open image modal */}
            <button
              className="results-img-btn"
              onClick={openImageModal}
              disabled={imageLoading}
            >
              <IconImage />
              {imageLoading ? "Generando…" : "Compartir resultado"}
            </button>
          </div>

          <button className="misa-restart-btn" onClick={onRestart}>
            Volver a tocar
          </button>
        </div>
      </div>

      {/* Image preview modal */}
      {imageModal && (
        <div
          className="img-modal-overlay"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-label="Compartir resultado"
        >
          <div className="img-modal" onClick={(e) => e.stopPropagation()}>
            <div className="img-modal-header">
              <span className="img-modal-title">Tu resultado</span>
              <button className="img-modal-close" onClick={closeModal} aria-label="Cerrar">
                <IconClose />
              </button>
            </div>

            <img
              src={imageModal.blobUrl}
              alt="Tu resultado en La última misa ricotera"
              className="img-modal-preview"
            />

            <div className="img-modal-actions">
              <button className="img-modal-btn img-modal-btn--download" onClick={downloadFromModal}>
                <IconDownload />
                Descargar
              </button>
            </div>

            {showModalSocial && (
              <div className="img-modal-social">
                <button
                  className="img-modal-social-link"
                  onClick={() => shareToSocialWithImage("whatsapp")}
                >
                  <IconWhatsApp className="results-social-icon results-social-icon--wa" />
                  WhatsApp
                </button>
                <button
                  className="img-modal-social-link"
                  onClick={() => shareToSocialWithImage("x")}
                >
                  <IconX className="results-social-icon results-social-icon--x" />
                  X
                </button>
                <button
                  className="img-modal-social-link"
                  onClick={() => shareToSocialWithImage("facebook")}
                >
                  <IconFacebook className="results-social-icon results-social-icon--fb" />
                  Facebook
                </button>
                {clipboardCopied && (
                  <p className="img-modal-clipboard-hint">
                    Imagen copiada — pegala en el post
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Icon components ──────────────────────────────────────────────────────────

function IconUpload() {
  return (
    <svg className="results-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
    </svg>
  );
}

function IconImage() {
  return (
    <svg className="results-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg className="results-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconWhatsApp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.762l7.59-8.67L2.25 2.25h7.012l4.26 5.632 5.722-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

function IconFacebook({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
