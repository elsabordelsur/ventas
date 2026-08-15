const DENOMINACIONES = [500, 200, 100, 50]

function calcularTotalBs(totalUsd, tasaBcv) {
  return totalUsd * tasaBcv
}

function piso50(monto) {
  return Math.floor(monto / 50) * 50
}

function techo50(monto) {
  const residuo = monto % 100
  if (residuo === 0) return monto
  const base = Math.floor(monto / 100) * 100
  if (residuo <= 50) return base + 50
  return base + 100
}

function desglosarBilletes(monto) {
  const billetes = []
  let resto = monto
  for (const denom of DENOMINACIONES) {
    const cantidad = Math.floor(resto / denom)
    if (cantidad > 0) {
      billetes.push({ denom, cantidad })
      resto -= cantidad * denom
    }
  }
  return billetes
}

function calcularAjusteRedondeo(montoCobrado, montoExacto) {
  return +(montoCobrado - montoExacto).toFixed(2)
}

function calcularCheckout(totalUsd, tasaBcv, tasaVuelto, pagos) {
  const totalBsExacto = +calcularTotalBs(totalUsd, tasaBcv).toFixed(2)
  const totalBsEfectivo = techo50(totalBsExacto)

  const pagoUsd = +(pagos.usd || 0)
  const pagoBs = +(pagos.bs || 0)
  const pagoPagoMovil = +(pagos.pagoMovil || 0)
  const pagoPunto = +(pagos.punto || 0)

  const digital = pagoPagoMovil + pagoPunto

  const remanenteOwedBs = Math.max(0, totalBsExacto - pagoUsd * tasaBcv - digital)

  const pagarEnBsEfectivo = pagoBs > 0 || (remanenteOwedBs > 0 && pagoUsd > 0)
  let ajusteRedondeo = 0
  let montoCobradoBs = remanenteOwedBs

  if (pagarEnBsEfectivo && remanenteOwedBs > 0) {
    montoCobradoBs = techo50(remanenteOwedBs)
    ajusteRedondeo = calcularAjusteRedondeo(montoCobradoBs, remanenteOwedBs)
  }

  const totalPagadoBs = (pagoUsd * tasaBcv) + digital + pagoBs
  const totalEsperadoBs = (pagoUsd * tasaBcv) + digital + montoCobradoBs

  let vueltoBs = 0
  let vueltoBilletes = []

  if (pagoUsd > 0 && pagoUsd > totalUsd) {
    const excedenteUsd = pagoUsd - totalUsd
    const tv = (tasaVuelto && tasaVuelto > 0) ? tasaVuelto : tasaBcv
    vueltoBs = Math.min(piso50(excedenteUsd * tv), totalPagadoBs)
    vueltoBilletes = desglosarBilletes(vueltoBs)
  }

  const faltante = +Math.max(0, totalEsperadoBs - totalPagadoBs).toFixed(2)
  const totalBsCobrado = +(totalPagadoBs - vueltoBs).toFixed(2)

  return {
    totalBsExacto,
    totalBsEfectivo,
    faltante,
    vueltoBs: +vueltoBs.toFixed(2),
    vueltoBilletes,
    ajusteRedondeo,
    totalBsCobrado,
    puedeProcesar: faltante <= 0
  }
}
