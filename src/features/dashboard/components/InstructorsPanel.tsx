import { Camera, Loader2, Trash2, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useAuth } from '../../auth/useAuth'
import { instructorsService } from '../../../services/instructorsService'
import { extractDescriptorFromImage } from '../../../services/faceValidationService'
import type { Instructor } from '../../../types/domain'
import { CapturePhotoDialog } from '../../checkouts/components/CapturePhotoDialog'

const matriculaPattern = /^\d{5}-\d$/

const applyMatriculaMask = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 6)

  if (digits.length <= 5) {
    return digits
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

const loadImage = async (photoDataUrl: string) =>
  await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Não foi possível processar a foto capturada.'))
    image.src = photoDataUrl
  })

const toInstructorPhotoBase64 = async (photoDataUrl: string) => {
  const image = await loadImage(photoDataUrl)
  // CORREÇÃO: Resolução máxima aumentada de 640 para 1280 para manter qualidade HD
  const maxDimension = 1280
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Não foi possível preparar a foto do instrutor.')

  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  // CORREÇÃO: Qualidade aumentada de 0.8 para 0.95
  return canvas.toDataURL('image/jpeg', 0.95).replace(/^data:image\/jpeg;base64,/, '')
}

const toInstructorPhotoSrc = (photoBase64: string) =>
  photoBase64 ? `data:image/jpeg;base64,${photoBase64}` : ''

export const InstructorsPanel = () => {
  const { user } = useAuth()
  const tenantId = user?.tenantId ?? ''

  const [items, setItems] = useState<Instructor[]>([])
  const [name, setName] = useState('')
  const [matricula, setMatricula] = useState('')
  const [photoBase64, setPhotoBase64] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [showCaptureDialog, setShowCaptureDialog] = useState(false)
  const displayedItems = tenantId ? items : []

  useEffect(() => {
    if (!tenantId) {
      return
    }

    let active = true

    const loadInstructors = async () => {
      try {
        setIsLoading(true)
        setError('')
        const instructors = await instructorsService.getInstructors(tenantId)

        if (active) {
          setItems(instructors)
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar os instrutores.')
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadInstructors()

    return () => {
      active = false
    }
  }, [tenantId])

  const resetForm = () => {
    setName('')
    setMatricula('')
    setPhotoBase64('')
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedName = name.trim()
    const normalizedMatricula = applyMatriculaMask(matricula)

    if (!tenantId) {
      setError('Usuário sem tenant ativo para cadastrar instrutores.')
      return
    }

    if (!normalizedName) {
      setError('Informe o nome do instrutor.')
      return
    }

    if (!matriculaPattern.test(normalizedMatricula)) {
      setError('A matrícula deve seguir o formato 99999-9.')
      return
    }

    if (!photoBase64) {
      setError('Capture a foto do instrutor antes de salvar.')
      return
    }

    try {
      setIsSaving(true)
      setError('')

      const descriptor = await extractDescriptorFromImage(toInstructorPhotoSrc(photoBase64));

      if (!descriptor) {
        setError('A Inteligência Artificial não conseguiu reconhecer os traços faciais na foto. Certifique-se de que o rosto está claro, bem iluminado e sem obstruções, e tire a foto novamente.')
        setIsSaving(false)
        return
      }

      const createdInstructor = await instructorsService.addInstructor(tenantId, {
        name: normalizedName,
        matricula: normalizedMatricula,
        photoBase64,
        faceDescriptor: Array.from(descriptor),
      })

      setItems((current) => [...current, createdInstructor].sort((left, right) => left.name.localeCompare(right.name)))
      resetForm()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Falha ao salvar o instrutor.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (instructorId: string) => {
    if (!tenantId) {
      setError('Usuário sem tenant ativo para remover instrutores.')
      return
    }

    try {
      setDeletingId(instructorId)
      setError('')
      await instructorsService.deleteInstructor(tenantId, instructorId)
      setItems((current) => current.filter((item) => item.id !== instructorId))
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Falha ao remover o instrutor.')
    } finally {
      setDeletingId('')
    }
  }

  const handleCapture = async (capturedPhotoDataUrl: string) => {
    const normalizedPhotoBase64 = await toInstructorPhotoBase64(capturedPhotoDataUrl)
    setPhotoBase64(normalizedPhotoBase64)
    setShowCaptureDialog(false)
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="rounded-[1.75rem] border border-brand-ink/10 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-brand-ink">Cadastro de instrutores</p>
            <p className="mt-1 text-sm text-brand-ink/65">Prepare o vínculo inicial para biometria facial com nome, matrícula e foto.</p>
          </div>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-teal/10 text-brand-teal">
            <UserPlus className="h-5 w-5" />
          </span>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-brand-ink">Nome</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-2xl border border-brand-ink/10 px-4 py-3 outline-none transition focus:border-brand-teal"
              placeholder="Nome completo do instrutor"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-brand-ink">Matrícula</span>
            <input
              value={matricula}
              onChange={(event) => setMatricula(applyMatriculaMask(event.target.value))}
              className="w-full rounded-2xl border border-brand-ink/10 px-4 py-3 outline-none transition focus:border-brand-teal"
              inputMode="numeric"
              maxLength={7}
              placeholder="99999-9"
              required
            />
          </label>

          <div className="space-y-3 rounded-[1.5rem] border border-brand-ink/10 bg-brand-sand p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-brand-ink">Foto do instrutor</p>
                <p className="text-sm text-brand-ink/65">Use a câmera para capturar a imagem facial no mesmo fluxo da retirada.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCaptureDialog(true)}
                className="inline-flex items-center gap-2 rounded-full border border-brand-ink/10 bg-white px-4 py-2 text-sm text-brand-ink transition hover:border-brand-teal hover:text-brand-teal"
              >
                <Camera className="h-4 w-4" />
                {photoBase64 ? 'Refazer foto' : 'Capturar foto'}
              </button>
            </div>

            {photoBase64 ? (
              <img
                src={toInstructorPhotoSrc(photoBase64)}
                alt="Prévia do instrutor"
                className="h-52 w-full rounded-[1.25rem] object-cover"
              />
            ) : (
              <div className="flex h-52 items-center justify-center rounded-[1.25rem] border border-dashed border-brand-ink/15 bg-white text-sm text-brand-ink/55">
                Nenhuma foto capturada.
              </div>
            )}
          </div>

          {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-teal px-5 py-3 font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {isSaving ? 'Salvando instrutor e extraindo biometria...' : 'Salvar instrutor'}
          </button>
        </form>
      </div>

      <div className="rounded-[1.75rem] border border-brand-ink/10 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-brand-ink">Instrutores cadastrados</p>
           
          </div>
          <span className="rounded-full bg-brand-teal/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
            {displayedItems.length} registros
          </span>
        </div>

        {isLoading ? (
          <div className="flex min-h-56 items-center justify-center text-sm text-brand-ink/60">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Carregando instrutores...
          </div>
        ) : displayedItems.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {displayedItems.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-[1.5rem] border border-brand-ink/10 bg-brand-sand">
                <img
                  src={toInstructorPhotoSrc(item.photoBase64)}
                  alt={item.name}
                  className="h-52 w-full object-cover"
                />
                <div className="space-y-3 p-4">
                  <div>
                    <p className="text-base font-semibold text-brand-ink">{item.name}</p>
                    <p className="text-sm text-brand-ink/65">Matrícula {item.matricula}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-sm text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    {deletingId === item.id ? 'Removendo...' : 'Excluir'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 flex min-h-56 items-center justify-center rounded-[1.5rem] border border-dashed border-brand-ink/15 bg-slate-50 text-sm text-brand-ink/55">
            Nenhum instrutor cadastrado até o momento.
          </div>
        )}
      </div>

      {showCaptureDialog ? (
        <CapturePhotoDialog
          title="Capturar foto do instrutor"
          helperText="A foto capturada será usada pela Inteligência Artificial para gerar sua assinatura biométrica matemática."
          onClose={() => setShowCaptureDialog(false)}
          onCapture={handleCapture}
        />
      ) : null}
    </section>
  )
}