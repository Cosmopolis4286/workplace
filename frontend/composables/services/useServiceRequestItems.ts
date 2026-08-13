export const MAX_PHOTOS_PER_ITEM = 6
export const MAX_VIDEOS_PER_ITEM = 2
export const MAX_PHOTO_SIZE = 5 * 1024 * 1024
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024
export const MAX_VIDEO_DURATION_SECONDS = 120

export interface ServiceRequestItemForm {
  fields: Record<string, string>
  notes: string
  photoFiles: File[]
  videoFiles: File[]
}

export function emptyServiceRequestItem(fieldNames: string[]): ServiceRequestItemForm {
  return {
    fields: Object.fromEntries(fieldNames.map(f => [f, ''])),
    notes: '',
    photoFiles: [],
    videoFiles: [],
  }
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      resolve(video.duration)
    }
    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      reject(new Error('No se pudo leer el video'))
    }
    video.src = URL.createObjectURL(file)
  })
}

export async function validateVideoFile(file: File): Promise<string | null> {
  if (file.size > MAX_VIDEO_SIZE) return 'El video no puede superar 50MB'
  try {
    const duration = await getVideoDuration(file)
    if (duration > MAX_VIDEO_DURATION_SECONDS) return 'El video no puede superar 2 minutos'
  } catch {
    return 'No se pudo procesar el video'
  }
  return null
}

export function validatePhotoFile(file: File): string | null {
  if (file.size > MAX_PHOTO_SIZE) return 'La foto no puede superar 5MB'
  return null
}

export function useServiceRequestItems() {
  const { post } = useApi()

  async function uploadMedia(files: File[]): Promise<string[]> {
    if (!files.length) return []
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    const res = await post<{ urls: string[] }>('/services/requests/upload-media', formData)
    return res.urls
  }

  return { uploadMedia }
}
