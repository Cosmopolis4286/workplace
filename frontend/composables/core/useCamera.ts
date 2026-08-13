import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

async function takePhotoNative(): Promise<File | null> {
  const photo = await Camera.getPhoto({
    resultType: CameraResultType.Uri,
    source: CameraSource.Prompt,
    quality: 80,
  })

  if (!photo.webPath) return null

  const response = await fetch(photo.webPath)
  const blob = await response.blob()
  const ext = photo.format || 'jpeg'
  return new File([blob], `photo-${Date.now()}.${ext}`, { type: blob.type || `image/${ext}` })
}

function takePhotoWeb(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'

    input.onchange = () => {
      const file = input.files?.[0] ?? null
      resolve(file)
    }
    input.oncancel = () => resolve(null)

    input.click()
  })
}

export function useCamera() {
  async function takePhoto(): Promise<File | null> {
    try {
      if (Capacitor.isNativePlatform()) {
        return await takePhotoNative()
      }
      return await takePhotoWeb()
    } catch {
      return null
    }
  }

  return { takePhoto }
}
