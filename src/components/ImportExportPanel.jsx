// Import / export / restore-defaults view
import { useRef, useState } from 'react'

export default function ImportExportPanel({ prompts, onImportFile, onExportAll, onRestoreDefaults }) {
  const fileRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [restoreSettings, setRestoreSettings] = useState(false)

  const handleFiles = (files) => {
    const f = files?.[0]
    if (f) onImportFile(f, restoreSettings)
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-lg font-black tracking-wider">
        <span className="text-neon glow-text-cyan">数据管理</span>
        <span className="text-dim font-normal text-sm ml-3">导入 / 导出 / 恢复默认</span>
      </h1>

      {/* export */}
      <div className="neon-panel p-5">
        <h2 className="text-sm font-bold tracking-widest text-dim mb-2">⇩ 导出全部</h2>
        <p className="text-xs text-dim leading-relaxed mb-3">
          把当前全部 <span className="text-neon font-mono">{prompts.length}</span> 条提示词导出为 JSON 文件，
          同时包含分类属性、主题和分类栏设置，可用于备份、跨设备迁移。
        </p>
        <button onClick={onExportAll} className="btn-neon rounded-lg px-4 py-2 text-sm cursor-pointer">
          导出全部提示词（JSON）
        </button>
      </div>

      {/* import */}
      <div className="neon-panel p-5">
        <h2 className="text-sm font-bold tracking-widest text-dim mb-2">⇪ 导入 JSON</h2>
        <p className="text-xs text-dim leading-relaxed mb-3">
          支持本工具备份、提示词数组 / 含 prompts 字段的 JSON，以及 Gemini Voyager 原始导出文件。
          Voyager 重复导入按原始 ID 合并，仅更新较新的内容；其他格式遇 id 冲突会自动分配新 id。
          新分类会自动加入；同名分类 ID 默认保留本地属性。
        </p>
        <label className="flex gap-2 items-center text-sm text-dim mb-4"><input type="checkbox" checked={restoreSettings} onChange={e => setRestoreSettings(e.target.checked)} />同时恢复备份中的分类属性、主题和分类栏名称</label>
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            handleFiles(e.dataTransfer.files)
          }}
          className={`rounded-lg border-2 border-dashed px-4 py-8 text-center text-sm cursor-pointer transition-all ${
            dragOver
              ? 'border-neon/70 bg-neon/5 text-neon'
              : 'border-line text-faint hover:border-line-bright hover:text-dim'
          }`}
        >
          点击选择 JSON 文件，或拖拽到这里
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {/* restore defaults */}
      <div className="neon-panel p-5 border-magenta/25">
        <h2 className="text-sm font-bold tracking-widest text-magenta mb-2">⚠ 恢复默认模板</h2>
        <p className="text-xs text-dim leading-relaxed mb-3">
          将素材库重置为内置的默认模板。<span className="text-magenta">当前所有自定义提示词会被清除</span>，
          建议先导出备份再执行。
        </p>
        <button onClick={onRestoreDefaults} className="btn-magenta rounded-lg px-4 py-2 text-sm cursor-pointer">
          恢复默认模板
        </button>
      </div>
    </div>
  )
}
