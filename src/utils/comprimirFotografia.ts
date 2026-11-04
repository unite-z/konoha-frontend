export async function comprimirFotografia(archivo: File): Promise<File> {
  const imagen = await createImageBitmap(archivo)
  try {
    const escala = Math.min(1, 1600 / Math.max(imagen.width, imagen.height))
    const lienzo = document.createElement('canvas')
    lienzo.width = Math.max(1, Math.round(imagen.width * escala))
    lienzo.height = Math.max(1, Math.round(imagen.height * escala))
    const contexto = lienzo.getContext('2d')
    if (!contexto) throw new Error('No se pudo preparar la fotografía')
    contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height)
    const comprimido = await new Promise<Blob>((resolve, reject) => lienzo.toBlob(
      resultado => resultado ? resolve(resultado) : reject(new Error('No se pudo comprimir la fotografía')),
      'image/jpeg', 0.8,
    ))
    return new File([comprimido], archivo.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } finally {
    imagen.close()
  }
}
