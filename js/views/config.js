async function cargarConfig() {
  const { data } = await supabase.from('configuracion').select('tasa_bcv').eq('id', 1).single()
  if (data) {
    document.getElementById('tasaBcvInput').value = data.tasa_bcv
    tasaBcvActual = data.tasa_bcv
  }
}

async function guardarTasa() {
  const tasa = +document.getElementById('tasaBcvInput').value
  if (!tasa || tasa <= 0) {
    document.getElementById('configStatus').textContent = 'Ingresa una tasa válida'
    document.getElementById('configStatus').style.color = 'var(--danger)'
    return
  }

  const { error } = await supabase.from('configuracion').update({
    tasa_bcv: tasa,
    fecha_actualizacion: new Date().toISOString()
  }).eq('id', 1)

  if (error) {
    document.getElementById('configStatus').textContent = 'Error: ' + error.message
    document.getElementById('configStatus').style.color = 'var(--danger)'
    return
  }

  tasaBcvActual = tasa
  document.getElementById('configStatus').textContent = '✅ Tasa actualizada correctamente'
  document.getElementById('configStatus').style.color = 'var(--success)'
}
