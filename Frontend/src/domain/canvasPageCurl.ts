import { flipEase, type SlipDir } from "./bookFlipCurl"

export const FLIP_DURATION_MS = 520
export const CURL_STRIP_PX = 3

/** 手机阅读器：下角抬起再沿弧线甩开 */
export function cornerFromProgress(
  progress: number,
  width: number,
  height: number,
  dir: SlipDir,
): { x: number; y: number } {
  const t = flipEase(progress)
  const curlLift = height * 0.36
  if (dir === "next") {
    const x = width - t * width * 1.07
    const travel = width - x
    const y =
      height -
      Math.sin(Math.min(1, travel / width) * Math.PI) * curlLift * (1 - t * 0.28) -
      t * height * 0.02
    return { x: Math.max(-width * 0.06, x), y: Math.min(height, Math.max(height * 0.32, y)) }
  }
  const x = t * width * 1.07
  const travel = x
  const y =
    height -
    Math.sin(Math.min(1, travel / width) * Math.PI) * curlLift * (1 - t * 0.28) -
    t * height * 0.02
  return { x: Math.min(width * 1.06, x), y: Math.min(height, Math.max(height * 0.32, y)) }
}

type PageBitmap = CanvasImageSource & { width: number; height: number }

export function drawMobilePageCurl(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  top: PageBitmap,
  under: PageBitmap,
  progress: number,
  dir: SlipDir,
  sheetColor: string,
) {
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = sheetColor
  ctx.fillRect(0, 0, width, height)

  const corner = cornerFromProgress(progress, width, height, dir)
  const eased = flipEase(progress)
  const hingeX = dir === "next" ? width * (1 - eased * 1.04) : width * eased * 1.04
  const radius = Math.min(width, height) * 0.5
  const strip = CURL_STRIP_PX
  const shadowStrength = Math.sin(Math.min(1, progress) * Math.PI) * 0.32

  if (dir === "next") {
    ctx.drawImage(under, 0, 0, width, height)

    const shade = ctx.createLinearGradient(hingeX - 52, height * 0.5, hingeX + 20, height)
    shade.addColorStop(0, "rgba(0,0,0,0)")
    shade.addColorStop(1, `rgba(0,0,0,${shadowStrength})`)
    ctx.fillStyle = shade
    ctx.fillRect(0, height * 0.55, Math.min(width, hingeX + 48), height * 0.45)

    if (hingeX > 0.5) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, hingeX, height)
      ctx.clip()
      ctx.drawImage(top, 0, 0, width, height)
      ctx.restore()
    }

    drawCurlStrips(ctx, top, height, hingeX, width, radius, strip, sheetColor, "next")

    drawCrease(ctx, hingeX, height, corner, "next", progress)
    return
  }

  ctx.drawImage(under, 0, 0, width, height)

  const shade = ctx.createLinearGradient(hingeX - 20, height * 0.5, hingeX + 52, height)
  shade.addColorStop(0, `rgba(0,0,0,${shadowStrength})`)
  shade.addColorStop(1, "rgba(0,0,0,0)")
  ctx.fillStyle = shade
  ctx.fillRect(Math.max(0, hingeX - 48), height * 0.55, width, height * 0.45)

  if (hingeX < width - 0.5) {
    const flatW = width - hingeX
    ctx.save()
    ctx.beginPath()
    ctx.rect(hingeX, 0, flatW, height)
    ctx.clip()
    ctx.drawImage(top, 0, 0, width, height)
    ctx.restore()
  }

  drawCurlStrips(ctx, top, height, hingeX, width, radius, strip, sheetColor, "prev")
  drawCrease(ctx, hingeX, height, corner, "prev", progress)
}

function drawCurlStrips(
  ctx: CanvasRenderingContext2D,
  top: PageBitmap,
  height: number,
  foldX: number,
  width: number,
  radius: number,
  strip: number,
  sheetColor: string,
  dir: "next" | "prev",
) {
  if (dir === "next") {
    const span = width - foldX
    if (span <= 0) return
    for (let x = Math.floor(foldX); x < width; x += strip) {
      const sw = Math.min(strip + 1, width - x)
      const dx = x - foldX
      const theta = Math.min((dx / radius) * (Math.PI / 2), Math.PI * 1.05)
      const sx = foldX + Math.sin(theta) * radius
      const lift = Math.sin(theta) * 2.8 * (1 - dx / span)
      paintStrip(ctx, top, x, sw, height, sx, lift, theta, sheetColor)
    }
    return
  }

  const span = foldX
  if (span <= 0) return
  for (let x = 0; x < foldX; x += strip) {
    const sw = Math.min(strip + 1, foldX - x)
    const dx = foldX - x
    const theta = Math.min((dx / radius) * (Math.PI / 2), Math.PI * 1.05)
    const sx = foldX - Math.sin(theta) * radius
    const lift = Math.sin(theta) * 2.8 * (1 - dx / span)
    paintStrip(ctx, top, x, sw, height, sx, lift, theta, sheetColor)
  }
}

function paintStrip(
  ctx: CanvasRenderingContext2D,
  top: PageBitmap,
  srcX: number,
  sw: number,
  height: number,
  dstX: number,
  lift: number,
  theta: number,
  sheetColor: string,
) {
  if (theta < Math.PI / 2) {
    const alpha = 0.9 + 0.1 * Math.cos(theta)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.drawImage(top, srcX, 0, sw, height, dstX, lift, sw, height)
    ctx.restore()
    return
  }
  const backShade = 0.48 + 0.32 * Math.min(1, -Math.cos(theta))
  ctx.fillStyle = sheetColor
  ctx.fillRect(dstX, lift, sw + 0.5, height)
  ctx.fillStyle = `rgba(0,0,0,${0.14 * backShade})`
  ctx.fillRect(dstX, lift, sw + 0.5, height)
}

function drawCrease(
  ctx: CanvasRenderingContext2D,
  hingeX: number,
  height: number,
  corner: { x: number; y: number },
  dir: "next" | "prev",
  progress: number,
) {
  const a = 0.2 * Math.sin(progress * Math.PI)
  ctx.strokeStyle = `rgba(0,0,0,${a})`
  ctx.lineWidth = 1.35
  ctx.beginPath()
  ctx.moveTo(hingeX, height)
  const ctrlX = dir === "next" ? hingeX + (corner.x - hingeX) * 0.42 : hingeX - (hingeX - corner.x) * 0.42
  const ctrlY = height - (height - corner.y) * 0.38
  ctx.quadraticCurveTo(ctrlX, ctrlY, corner.x, corner.y)
  ctx.stroke()
}