function calcularTotalBs(totalUsd, tasaBcv) {
  return totalUsd * tasaBcv
}

function calcularRedondeoEfectivo(totalBs) {
  const residuo = totalBs % 100
  if (residuo === 0) return totalBs
  const base = Math.floor(totalBs / 100) * 100
  if (residuo <= 50) return base + 50
  return base + 100
}

function calcularAjusteRedondeo(montoCobrado, montoExacto) {
  return +(montoCobrado - montoExacto).toFixed(2)
}

function calcularCheckout(totalUsd, tasaBcv, pagos) {
  const totalBsExacto = calcularTotalBs(totalUsd, tasaBcv)
  const totalBsEfectivo = calcularRedondeoEfectivo(totalBsExacto)

  const pagoUsd = +(pagos.usd || 0)
  const pagoBs = +(pagos.bs || 0)
  const pagoPagoMovil = +(pagos.pagoMovil || 0)
  const pagoPunto = +(pagos.punto || 0)

  const pagoUsdEnBs = pagoUsd * tasaBcv
  const digitalBs = pagoPagoMovil + pagoPunto

  const totalPagadoBs = pagoBs + pagoUsdEnBs + digitalBs
  const aplicaEfectivo = pagoBs > 0 || pagoUsd > 0
  const totalACobrar = aplicaEfectivo ? totalBsEfectivo : totalBsExacto

  const faltante = +(totalACobrar - totalPagadoBs).toFixed(2)
  const excedente = +(totalPagadoBs - totalACobrar).toFixed(2)

  let vueltoBs = 0
  let faltanteFinal = 0

  if (excedente > 0 && pagoUsd > 0) {
    vueltoBs = excedente
  } else if (faltante > 0) {
    faltanteFinal = faltante
  }

  const ajusteRedondeo = aplicaEfectivo
    ? calcularAjusteRedondeo(totalBsEfectivo, totalBsExacto)
    : 0

  return {
    totalBsExacto: +totalBsExacto.toFixed(2),
    totalBsEfectivo,
    faltante: +faltanteFinal.toFixed(2),
    vueltoBs: +vueltoBs.toFixed(2),
    ajusteRedondeo,
    puedeProcesar: faltanteFinal <= 0
  }
}
