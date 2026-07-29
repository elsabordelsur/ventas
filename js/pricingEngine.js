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

  let saldoBs = totalBsExacto

  if (pagoUsd > 0) {
    saldoBs -= pagoUsd * tasaBcv
  }

  if (digital > 0) {
    saldoBs -= digital
  }

  const remanenteBsEfectivo = Math.max(0, saldoBs)
  const aplicaRedondeo = pagoBs > 0 || (remanenteBsEfectivo > 0 && pagoUsd > 0 && pagoBs === 0)

  let montoCobradoBsExacto = 0
  let montoCobradoBsEfectivo = 0
  let ajusteRedondeo = 0

  if (aplicaRedondeo && remanenteBsEfectivo > 0) {
    montoCobradoBsEfectivo = techo50(remanenteBsEfectivo)
    ajusteRedondeo = calcularAjusteRedondeo(montoCobradoBsEfectivo, remanenteBsEfectivo)
  } else {
    montoCobradoBsExacto = remanenteBsEfectivo
  }

  const totalACobrarBs = (pagoUsd * tasaBcv) + digital + montoCobradoBsExacto + montoCobradoBsEfectivo
  const totalPagadoBs = (pagoUsd * tasaBcv) + digital + pagoBs

  let faltante = +(totalACobrarBs - totalPagadoBs).toFixed(2)
  let excedente = +(totalPagadoBs - totalACobrarBs).toFixed(2)

  let vueltoBs = 0
  let vueltoBilletes = []

  if (excedente > 0 && pagoUsd > 0) {
    let vueltoTeoricoBs = excedente

    if (tasaVuelto && tasaVuelto > 0) {
      const vueltoUsd = excedente / tasaBcv
      vueltoTeoricoBs = vueltoUsd * tasaVuelto
    }

    vueltoBs = piso50(vueltoTeoricoBs)
    vueltoBilletes = desglosarBilletes(vueltoBs)
    faltante = 0
  }

  if (faltante < 0) faltante = 0

  const totalBsCobrado = (pagoUsd * tasaBcv) + digital + pagoBs - vueltoBs

  return {
    totalBsExacto,
    totalBsEfectivo,
    faltante: +faltante.toFixed(2),
    vueltoBs: +vueltoBs.toFixed(2),
    vueltoBilletes,
    ajusteRedondeo,
    totalBsCobrado: +totalBsCobrado.toFixed(2),
    puedeProcesar: faltante <= 0
  }
}
