import * as faceapi from '@vladmandic/face-api'
import { instructorsService } from './instructorsService'
import type { Instructor } from '../types/domain'

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/'
let modelsLoaded = false

export const loadFaceModels = async () => {
  if (modelsLoaded) return
  console.log('Carregando modelos de IA Neural...')
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
  ])
  modelsLoaded = true
  console.log('Modelos Neurais Carregados com Sucesso!')
}

export const extractDescriptorFromImage = async (base64Image: string): Promise<Float32Array | null> => {
  await loadFaceModels()
  try {
    const img = await faceapi.fetchImage(base64Image)
    const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor()
    return detection ? detection.descriptor : null
  } catch (error) {
    console.error("Erro ao extrair biometria da foto:", error)
    return null
  }
}

export const recognizeFace = async (scannedDescriptor: Float32Array, tenantId: string): Promise<Instructor | null> => {
  try {
    const instructors = await instructorsService.getInstructors(tenantId)
    if (!instructors || instructors.length === 0) return null

    // Filtra instrutores que têm a biometria cadastrada no banco
    const validInstructors = instructors.filter(i => i.faceDescriptor && i.faceDescriptor.length > 0)
    if (validInstructors.length === 0) {
      console.log("Nenhum instrutor com biometria matemática salva no banco.");
      return null
    }

    const labeledDescriptors = validInstructors.map(instructor => {
      const descriptorArray = new Float32Array(instructor.faceDescriptor!)
      return new faceapi.LabeledFaceDescriptors(instructor.id, [descriptorArray])
    })

    // CORREÇÃO AQUI: Mudamos de 0.45 para 0.60 (limite padrão e mais flexível)
    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.60)
    const match = faceMatcher.findBestMatch(scannedDescriptor)
    
    // Mostra no console do navegador qual foi a decisão da IA
    console.log(`📡 IA Analisou! Match: ${match.label} | Distância: ${match.distance.toFixed(2)}`)

    if (match.label !== 'unknown') {
      const matchedInstructor = validInstructors.find(i => i.id === match.label)
      return matchedInstructor || null
    }

    return null
  } catch (error) {
    console.error('Erro no reconhecimento facial:', error)
    return null
  }
}