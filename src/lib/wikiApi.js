import { normalizeBodies, pruneBodies } from './bodyBlocks'
import { isSupabaseConfigured, supabase } from './supabase'

export const EMPTY_DOC = {
  id: null,
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
    s1: [],
    s2: [],
    s3: [],
    s4: [],
  },
}

function normalize(row) {
  if (!row) return { ...EMPTY_DOC }
  return {
    id: row.id || null,
    title: row.title || '',
    photoUrl: row.photo_url || '',
    photoPath: row.photo_path || '',
    infobox: { ...EMPTY_DOC.infobox, ...(row.infobox || {}) },
    bodies: normalizeBodies({ ...EMPTY_DOC.bodies, ...(row.bodies || {}) }),
  }
}

function assertClient() {
  if (!supabase) {
    throw new Error('Supabase 설정이 없습니다. .env.local에 URL과 anon 키를 넣어 주세요.')
  }
}

function escapeIlike(value) {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')
}

export async function fetchDocument(id) {
  assertClient()
  const { data, error } = await supabase.from('documents').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) return { doc: null, updatedAt: null }
  return {
    doc: normalize(data),
    updatedAt: data.updated_at || null,
  }
}

export async function fetchDocumentByTitle(title) {
  assertClient()
  const { data, error } = await supabase.from('documents').select('id, title').eq('title', title.trim()).maybeSingle()
  if (error) throw error
  return data
}

export async function fetchDocumentsByTitles(titles) {
  assertClient()
  const unique = [...new Set((titles || []).map((title) => title.trim()).filter(Boolean))]
  if (!unique.length) return []
  const { data, error } = await supabase.from('documents').select('id, title').in('title', unique)
  if (error) throw error
  return data || []
}

export async function saveDocument(doc) {
  assertClient()
  const title = (doc.title || '').trim()
  if (!title) {
    const err = new Error('제목이 없으면 저장되지 않습니다.')
    err.code = 'NO_TITLE'
    throw err
  }

  const payload = {
    title,
    infobox: doc.infobox,
    bodies: pruneBodies(doc.bodies),
    photo_url: doc.photoUrl || null,
    photo_path: doc.photoPath || null,
    updated_at: new Date().toISOString(),
  }

  if (doc.id) {
    const { data, error } = await supabase
      .from('documents')
      .update(payload)
      .eq('id', doc.id)
      .select('id, updated_at')
      .single()
    if (error) throw error
    await addRevision({ id: data.id, ...payload, photoUrl: payload.photo_url, photoPath: payload.photo_path }).catch(() => {})
    return { id: data.id, updatedAt: data.updated_at }
  }

  const { data, error } = await supabase
    .from('documents')
    .insert({ id: crypto.randomUUID(), ...payload })
    .select('id, updated_at')
    .single()
  if (error) throw error
  await addRevision({ id: data.id, ...payload, photoUrl: payload.photo_url, photoPath: payload.photo_path }).catch(() => {})
  return { id: data.id, updatedAt: data.updated_at }
}

export async function savePhoto(docId, photoUrl, photoPath) {
  assertClient()
  if (!docId) {
    throw new Error('제목을 저장한 뒤에 사진을 올릴 수 있습니다.')
  }
  const { data, error } = await supabase
    .from('documents')
    .update({
      photo_url: photoUrl,
      photo_path: photoPath,
      updated_at: new Date().toISOString(),
    })
    .eq('id', docId)
    .select('updated_at')
    .single()
  if (error) throw error
  const { data: current } = await supabase.from('documents').select('*').eq('id', docId).maybeSingle()
  if (current) await addRevision(normalize(current)).catch(() => {})
  return data.updated_at
}

export async function uploadPhoto(file, docId, previousPath) {
  assertClient()
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 올릴 수 있습니다.')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('사진은 5MB 이하만 올릴 수 있습니다.')
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const folder = docId || 'draft'
  const path = `${folder}/${Date.now()}.${ext}`

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

export async function searchDocuments(query) {
  assertClient()
  const q = query.trim()
  if (!q) return []
  const { data, error } = await supabase
    .from('documents')
    .select('id, title, updated_at')
    .neq('title', '')
    .ilike('title', `%${escapeIlike(q)}%`)
    .order('updated_at', { ascending: false })
    .limit(40)
  if (error) throw error
  return data || []
}

export async function listRecentDocuments() {
  assertClient()
  const { data, error } = await supabase
    .from('documents')
    .select('id, title, updated_at')
    .neq('title', '')
    .order('updated_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data || []
}

export async function addRevision(doc) {
  assertClient()
  if (!doc?.id) return
  const { error } = await supabase.from('document_revisions').insert({
    document_id: doc.id,
    title: doc.title || '',
    infobox: doc.infobox || {},
    bodies: doc.bodies || {},
    photo_url: doc.photoUrl || doc.photo_url || null,
    photo_path: doc.photoPath || doc.photo_path || null,
  })
  if (error) throw error
}

export async function listRevisions(documentId) {
  assertClient()
  const { data, error } = await supabase
    .from('document_revisions')
    .select('id, title, created_at')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchRevision(revisionId) {
  assertClient()
  const { data, error } = await supabase.from('document_revisions').select('*').eq('id', revisionId).maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    doc: {
      ...normalize({
        id: data.document_id,
        title: data.title,
        photo_url: data.photo_url,
        photo_path: data.photo_path,
        infobox: data.infobox,
        bodies: data.bodies,
      }),
      id: data.document_id,
    },
    createdAt: data.created_at,
    revisionId: data.id,
  }
}

export function formatTime(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export { isSupabaseConfigured }
