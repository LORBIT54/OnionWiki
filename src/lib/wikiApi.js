import { isSupabaseConfigured, supabase } from './supabase'

export const DOC_ID = 'main'

export const EMPTY_DOC = {
  title: '',
  photoUrl: '',
  photoPath: '',
  infobox: {
    name: '',
    age: '',
    race: '',
    job: '',
    website: '',
  },
  bodies: {
    s1: '',
    s2: '',
    s3: '',
    s4: '',
  },
}

function normalize(row) {
  if (!row) return { ...EMPTY_DOC }
  return {
    title: row.title || '',
    photoUrl: row.photo_url || '',
    photoPath: row.photo_path || '',
    infobox: { ...EMPTY_DOC.infobox, ...(row.infobox || {}) },
    bodies: { ...EMPTY_DOC.bodies, ...(row.bodies || {}) },
  }
}

function assertClient() {
  if (!supabase) {
    throw new Error('Supabase 환경 변수가 없습니다. .env.local에 URL과 anon 키를 넣어 주세요.')
  }
}

export async function fetchDocument() {
  assertClient()
  const { data, error } = await supabase.from('documents').select('*').eq('id', DOC_ID).maybeSingle()
  if (error) throw error
  return {
    doc: normalize(data),
    updatedAt: data?.updated_at || null,
  }
}

export async function saveDocument(doc) {
  assertClient()
  const payload = {
    id: DOC_ID,
    title: doc.title || '',
    infobox: doc.infobox,
    bodies: doc.bodies,
    photo_url: doc.photoUrl || null,
    photo_path: doc.photoPath || null,
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await supabase.from('documents').upsert(payload).select('updated_at').single()
  if (error) throw error
  return data.updated_at
}

export async function savePhoto(photoUrl, photoPath) {
  assertClient()
  const { data, error } = await supabase
    .from('documents')
    .update({
      photo_url: photoUrl,
      photo_path: photoPath,
      updated_at: new Date().toISOString(),
    })
    .eq('id', DOC_ID)
    .select('updated_at')
    .single()
  if (error) throw error
  return data.updated_at
}

export async function uploadPhoto(file, previousPath) {
  assertClient()
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 올릴 수 있습니다.')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('사진은 5MB 이하만 올릴 수 있습니다.')
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${DOC_ID}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage.from('photos').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })
  if (uploadError) throw uploadError

  if (previousPath && previousPath !== path) {
    await supabase.storage.from('photos').remove([previousPath])
  }

  const { data } = supabase.storage.from('photos').getPublicUrl(path)
  return {
    photoUrl: data.publicUrl,
    photoPath: path,
  }
}

export { isSupabaseConfigured }
