import { useEffect, useMemo, useRef, useState } from 'react'
import Navbar from './components/Navbar.jsx'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './components/Dashboard.jsx'
import PromptLibrary from './components/PromptLibrary.jsx'
import PromptDetailModal from './components/PromptDetailModal.jsx'
import PromptEditorModal from './components/PromptEditorModal.jsx'
import PromptBuilder from './components/PromptBuilder.jsx'
import PromptForge from './components/PromptForge.jsx'
import ImportExportPanel from './components/ImportExportPanel.jsx'
import QuickPromptFab from './components/QuickPromptFab.jsx'
import Toast from './components/Toast.jsx'
import CategoryManager from './components/CategoryManager.jsx'
import { usePreferences } from './PreferencesContext.jsx'
import { ensurePromptCategories, normalizePreferences } from './utils/preferences.js'
import { importWorkspace, persistWorkspace } from './utils/workspace.js'
import {
  loadPrompts,
  persistPrompts,
  generateId,
  exportPromptsToFile,
  restoreDefaults,
  copyToClipboard,
} from './utils/storage.js'

/* Inline confirm dialog (delete / restore-defaults) */
function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onCancel} />
      <div className="modal-card relative neon-panel w-full max-w-sm p-5 border-magenta/40">
        <h3 className="text-base font-bold text-magenta glow-text-magenta mb-2">{title}</h3>
        <p className="text-sm text-dim leading-relaxed mb-5 whitespace-pre-wrap">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="btn-ghost rounded-lg px-4 py-2 text-sm cursor-pointer">
            取消
          </button>
          <button onClick={onConfirm} className="btn-magenta rounded-lg px-4 py-2 text-sm font-medium cursor-pointer">
            {confirmLabel || '确认'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const { preferences, categories, setPreferences, savePreferences } = usePreferences()
  const [prompts, setPrompts] = useState(() => loadPrompts())
  const [managerOpen, setManagerOpen] = useState(false)
  const [view, setView] = useState('dashboard')

  // library filters
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [platform, setPlatform] = useState('all')
  const [favOnly, setFavOnly] = useState(false)
  const [selectedTags, setSelectedTags] = useState([])
  const [sortBy, setSortBy] = useState('updated')

  // overlays
  const [detailId, setDetailId] = useState(null)
  const [editor, setEditor] = useState(null) // { mode: 'new'|'edit', draft }
  const [confirm, setConfirm] = useState(null) // { title, message, confirmLabel, onConfirm }
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // toasts
  const [toasts, setToasts] = useState([])
  const toastSeq = useRef(0)
  const showToast = (message, type = 'success') => {
    const id = ++toastSeq.current
    setToasts((ts) => [...ts, { id, message, type }])
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 2600)
  }

  const update = (next) => {
    persistPrompts(next)
    setPrompts(next)
  }

  useEffect(() => {
    const next = ensurePromptCategories(preferences, prompts)
    if (next !== preferences) {
      try { savePreferences(next) }
      catch { showToast('分类设置保存失败，请检查可用存储空间', 'error') }
    }
  }, [prompts, preferences, savePreferences])

  const saveCategorySettings = (draft, removed) => {
    const nextPreferences = normalizePreferences({ ...draft, theme: preferences.theme })
    const nextPrompts = loadPrompts().map(p => removed[p.category] ? { ...p, category: removed[p.category], updatedAt: new Date().toISOString() } : p)
    persistWorkspace(nextPrompts, nextPreferences)
    setPrompts(nextPrompts)
    setPreferences(nextPreferences)
    if (removed[category]) setCategory(removed[category])
    showToast('分类与侧栏设置已保存')
  }
  const changeTheme = theme => {
    try { savePreferences({ ...preferences, theme }) }
    catch { showToast('主题保存失败，请检查可用存储空间', 'error') }
  }

  /* ---------- navigation ---------- */
  const navigate = (v) => {
    setView(v)
    setSidebarOpen(false)
  }
  const handleGlobalSearch = (q) => {
    setQuery(q)
    if (view !== 'library') setView('library')
  }
  const handleSelectCategory = (catId) => {
    setCategory(catId)
    setFavOnly(false)
    navigate('library')
  }
  const addCategory = (value) => {
    const name = value.trim()
    if (!name) throw new Error('请输入分类名称')
    if (name.length > 40) throw new Error('分类名称最多 40 个字符')
    if (preferences.categories.some(item => item.zh.toLowerCase() === name.toLowerCase())) {
      throw new Error('已有同名分类，请换一个名称')
    }
    const item = { id: `category-${generateId()}`, zh: name, color: '#a3a3a3', description: '' }
    try { savePreferences({ ...preferences, categories: [...preferences.categories, item] }) }
    catch { throw new Error('分类保存失败，请检查可用存储空间后重试') }
    setQuery('')
    setPlatform('all')
    setSelectedTags([])
    handleSelectCategory(item.id)
    showToast(`已创建分类「${name}」`)
  }

  /* ---------- copy (also records lastUsedAt) ---------- */
  const copyPromptText = async (prompt, text, label) => {
    const ok = await copyToClipboard(text)
    if (!ok) {
      showToast('复制失败，请手动选择文本', 'error')
      return
    }
    if (prompt) {
      update(
        loadPrompts().map((p) => (p.id === prompt.id ? { ...p, lastUsedAt: new Date().toISOString() } : p)),
      )
    }
    showToast(`${label}已复制到剪贴板`)
    return true
  }
  const copyLooseText = async (text, label) => {
    const ok = await copyToClipboard(text)
    showToast(ok ? `${label}已复制到剪贴板` : '复制失败，请手动选择文本', ok ? 'success' : 'error')
  }

  /* ---------- CRUD ---------- */
  const toggleFavorite = (id) => {
    update(prompts.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p)))
  }

  const openNewEditor = (draft = null) => setEditor({ mode: 'new', draft })
  const openEditEditor = (prompt) => {
    setDetailId(null)
    setEditor({ mode: 'edit', draft: prompt })
  }

  const savePrompt = (form) => {
    form = { ...form, category: categories.some(c => c.id === form.category) ? form.category : categories[0].id }
    const now = new Date().toISOString()
    if (editor?.mode === 'edit' && editor.draft?.id) {
      update(
        prompts.map((p) =>
          p.id === editor.draft.id ? { ...p, ...form, updatedAt: now } : p,
        ),
      )
      showToast('修改已保存')
    } else {
      const created = {
        ...form,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
        lastUsedAt: null,
      }
      update([created, ...prompts])
      showToast('新提示词已加入素材库')
    }
    setEditor(null)
  }

  /* quick-capture from the floating panel — creates a prompt in one shot */
  const quickAddPrompt = (form) => {
    form = { ...form, category: categories.some(c => c.id === form.category) ? form.category : categories[0].id }
    const now = new Date().toISOString()
    const created = {
      ...form,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      lastUsedAt: null,
    }
    update([created, ...loadPrompts()])
    showToast('已快速存入素材库')
    return true
  }

  // The main renderer remains the sole writer, even when its window is hidden.
  const desktopHandlers = useRef(null)
  desktopHandlers.current = { quickAddPrompt, copyPromptText }
  useEffect(() => {
    window.desktopPrompt?.publish(prompts)
  }, [prompts])
  useEffect(() => {
    const bridge = window.desktopPrompt
    if (!bridge) return
    const detail = bridge.onDetail(id => setDetailId(id))
    const command = bridge.onCommand(async request => {
      try {
        let ok = false
        if (request.type === 'add' && request.form &&
          (request.form.chinesePrompt?.trim() || request.form.englishPrompt?.trim())) {
          ok = desktopHandlers.current.quickAddPrompt(request.form)
        } else if (request.type === 'copy') {
          const prompt = loadPrompts().find(p => p.id === request.id)
          if (prompt) {
            const text = prompt.englishPrompt || prompt.chinesePrompt || prompt.shortPrompt || prompt.strongPrompt
            if (text) ok = await desktopHandlers.current.copyPromptText(prompt, text, '提示词')
          }
        }
        bridge.result({ requestId: request.requestId, ok: !!ok })
      } catch (error) {
        bridge.result({ requestId: request.requestId, ok: false })
      }
    })
    return () => { detail(); command() }
  }, [])

  const requestDelete = (prompt) => {
    setConfirm({
      title: '删除提示词',
      message: `确定要删除「${prompt.title}」吗？\n此操作无法撤销。`,
      confirmLabel: '删除',
      onConfirm: () => {
        update(prompts.filter((p) => p.id !== prompt.id))
        if (detailId === prompt.id) setDetailId(null)
        setConfirm(null)
        showToast('已删除', 'info')
      },
    })
  }

  /* ---------- import / export / restore ---------- */
  const handleExportAll = () => {
    exportPromptsToFile(prompts, preferences)
    showToast(`已导出 ${prompts.length} 条提示词`)
  }

  const handleImportFile = async (file, restoreSettings = false) => {
    try {
      const text = await file.text()
      const { prompts: merged, preferences: nextPreferences, added, reassigned } = importWorkspace(text, loadPrompts(), preferences, restoreSettings)
      persistWorkspace(merged, nextPreferences)
      setPrompts(merged)
      setPreferences(nextPreferences)
      showToast(
        `导入成功：新增 ${added} 条${reassigned > 0 ? `（${reassigned} 条 id 冲突已重新分配）` : ''}`,
      )
    } catch (e) {
      showToast(`导入失败：${e.message}`, 'error')
    }
  }

  const requestRestoreDefaults = () => {
    setConfirm({
      title: '恢复默认模板',
      message: '将清除当前所有提示词，并重置为内置默认模板。\n建议先导出备份。确定继续吗？',
      confirmLabel: '重置',
      onConfirm: () => {
        setPrompts(restoreDefaults())
        setConfirm(null)
        showToast('已恢复默认模板', 'info')
      },
    })
  }

  /* ---------- derived: filter + sort + tags ---------- */
  const allTags = useMemo(() => {
    const freq = new Map()
    for (const p of prompts) for (const t of p.tags) freq.set(t, (freq.get(t) || 0) + 1)
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }))
  }, [prompts])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = prompts.filter((p) => {
      if (category !== 'all' && p.category !== category) return false
      if (platform !== 'all' && p.platform !== platform) return false
      if (favOnly && !p.isFavorite) return false
      if (selectedTags.length > 0 && !selectedTags.every((t) => p.tags.includes(t))) return false
      if (q) {
        const haystack = [
          p.title,
          p.description,
          p.chinesePrompt,
          p.englishPrompt,
          p.shortPrompt,
          p.strongPrompt,
          p.negativePrompt,
          p.usageNotes,
          p.tags.join(' '),
          p.platform,
          p.category,
          categories.find(c => c.id === p.category)?.zh,
        ]
          .join('\n')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })

    const time = (iso) => (iso ? new Date(iso).getTime() : 0)
    switch (sortBy) {
      case 'recent':
        list = [...list].sort((a, b) => time(b.lastUsedAt) - time(a.lastUsedAt))
        break
      case 'created':
        list = [...list].sort((a, b) => time(b.createdAt) - time(a.createdAt))
        break
      case 'title':
        list = [...list].sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
        break
      case 'updated':
      default:
        list = [...list].sort((a, b) => time(b.updatedAt) - time(a.updatedAt))
    }
    return list
  }, [prompts, query, category, platform, favOnly, selectedTags, sortBy, categories])

  const hasActiveFilters =
    query.trim() !== '' ||
    category !== 'all' ||
    platform !== 'all' ||
    favOnly ||
    selectedTags.length > 0

  const clearAllFilters = () => {
    setQuery('')
    setCategory('all')
    setPlatform('all')
    setFavOnly(false)
    setSelectedTags([])
  }

  const detailPrompt = detailId ? prompts.find((p) => p.id === detailId) : null

  return (
    <div className="bg-cybergrid min-h-screen text-ink">
      <Navbar
        theme={preferences.theme}
        onTheme={changeTheme}
        view={view}
        onNavigate={navigate}
        query={query}
        onSearch={handleGlobalSearch}
        onNew={() => openNewEditor()}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
      />

      <div className="flex min-h-[calc(100vh-3.5rem)]">
        <Sidebar
          onManage={() => { setManagerOpen(true); setSidebarOpen(false) }}
          onAddCategory={addCategory}
          prompts={prompts}
          activeCategory={category}
          onSelectCategory={handleSelectCategory}
          favOnly={favOnly}
          onToggleFav={() => {
            setCategory('all')
            setFavOnly((f) => !f)
            navigate('library')
          }}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 min-w-0">
          {view === 'dashboard' && (
            <Dashboard
              prompts={prompts}
              onQuickSearch={(q) => {
                setQuery(q)
                navigate('library')
              }}
              onNew={() => openNewEditor()}
              onImportFile={handleImportFile}
              onExportAll={handleExportAll}
              onOpenPrompt={(p) => setDetailId(p.id)}
              onSelectCategory={handleSelectCategory}
            />
          )}

          {view === 'library' && (
            <PromptLibrary
              filtered={filtered}
              total={prompts.length}
              query={query}
              onSearch={setQuery}
              platform={platform}
              onPlatform={setPlatform}
              sortBy={sortBy}
              onSortBy={setSortBy}
              favOnly={favOnly}
              onToggleFav={() => setFavOnly((f) => !f)}
              allTags={allTags}
              selectedTags={selectedTags}
              onToggleTag={(t) =>
                setSelectedTags((ts) => (ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t]))
              }
              onClearTags={() => setSelectedTags([])}
              hasActiveFilters={hasActiveFilters}
              onClearAllFilters={clearAllFilters}
              onOpen={(p) => setDetailId(p.id)}
              onCopy={copyPromptText}
              onEdit={openEditEditor}
              onDelete={requestDelete}
              onToggleFavPrompt={toggleFavorite}
              onNew={() => openNewEditor()}
            />
          )}

          {view === 'builder' && (
            <PromptBuilder onCopy={copyLooseText} onSaveToLibrary={(draft) => openNewEditor(draft)} />
          )}

          {view === 'forge' && (
            <PromptForge
              onToast={showToast}
              onCopy={copyLooseText}
              onSaveToLibrary={(draft) => openNewEditor(draft)}
            />
          )}

          {view === 'io' && (
            <ImportExportPanel
              prompts={prompts}
              onImportFile={handleImportFile}
              onExportAll={handleExportAll}
              onRestoreDefaults={requestRestoreDefaults}
            />
          )}
        </main>
      </div>

      {/* overlays */}
      {managerOpen && <CategoryManager prompts={prompts} onSave={saveCategorySettings} onClose={() => setManagerOpen(false)} />}
      {detailPrompt && (
        <PromptDetailModal
          prompt={detailPrompt}
          onClose={() => setDetailId(null)}
          onEdit={openEditEditor}
          onToggleFav={toggleFavorite}
          onCopy={copyPromptText}
        />
      )}

      {editor && (
        <PromptEditorModal
          initial={editor.draft}
          isNew={editor.mode === 'new'}
          onSave={savePrompt}
          onClose={() => setEditor(null)}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* global floating quick-prompt dock */}
      {!window.desktopPrompt && <QuickPromptFab
        prompts={prompts}
        onQuickAdd={quickAddPrompt}
        onCopy={copyPromptText}
        onOpenPrompt={(p) => setDetailId(p.id)}
      />}

      <Toast toasts={toasts} />
    </div>
  )
}
