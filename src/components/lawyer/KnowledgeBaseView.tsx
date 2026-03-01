import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Database,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Upload,
  Trash2,
  FileText as FileTextIcon,
  Link,
  Type,
  X,
  RefreshCw,
} from 'lucide-react';
import {
  listKnowledgeBases,
  createKnowledgeBase,
  deleteKnowledgeBase,
  listDocuments,
  uploadDocument,
  addDocumentByUrl,
  addDocumentByText,
  deleteDocument,
  formatFileSize,
  formatRelativeTime,
  formatDocStatus,
  type KnowledgeBaseInfo,
  type DocumentInfo,
} from '../../services/knowledge';
import { texts, tw } from '../../themes';

export default function KnowledgeBaseView() {
  const [kbList, setKbList] = useState<KnowledgeBaseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const [selectedKb, setSelectedKb] = useState<KnowledgeBaseInfo | null>(null);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showAddUrl, setShowAddUrl] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [urlName, setUrlName] = useState('');
  const [addingUrl, setAddingUrl] = useState(false);

  const [showAddText, setShowAddText] = useState(false);
  const [textName, setTextName] = useState('');
  const [textContent, setTextContent] = useState('');
  const [addingText, setAddingText] = useState(false);

  const loadKbList = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const list = await listKnowledgeBases();
      setKbList(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKbList();
  }, [loadKbList]);

  const handleCreate = async () => {
    if (!createName.trim()) return;
    try {
      setCreating(true);
      await createKnowledgeBase({
        name: createName.trim(),
        description: createDesc.trim() || undefined,
      });
      setShowCreate(false);
      setCreateName('');
      setCreateDesc('');
      await loadKbList();
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (kb: KnowledgeBaseInfo) => {
    if (!confirm(`确定删除知识库「${kb.name}」吗？此操作不可撤销。`)) return;
    try {
      await deleteKnowledgeBase(kb.id);
      if (selectedKb?.id === kb.id) {
        setSelectedKb(null);
        setDocuments([]);
      }
      await loadKbList();
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败');
    }
  };

  const openKbDetail = async (kb: KnowledgeBaseInfo) => {
    setSelectedKb(kb);
    setDocsLoading(true);
    try {
      const docs = await listDocuments(kb.id);
      setDocuments(docs);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载文档失败');
      setDocuments([]);
    } finally {
      setDocsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedKb) return;
    handleUpload(file);
    e.target.value = '';
  };

  const handleUpload = async (file: File) => {
    if (!selectedKb) return;
    try {
      setUploading(true);
      const doc = await uploadDocument(selectedKb.id, file);
      setDocuments((prev) => [...prev, doc]);
      await loadKbList();
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (doc: DocumentInfo) => {
    if (!confirm(`确定删除文档「${doc.name || doc.filename}」吗？`)) return;
    try {
      await deleteDocument(doc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      await loadKbList();
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除文档失败');
    }
  };

  const handleAddUrl = async () => {
    if (!selectedKb || !urlValue.trim()) return;
    try {
      setAddingUrl(true);
      const doc = await addDocumentByUrl(selectedKb.id, {
        url: urlValue.trim(),
        name: urlName.trim() || undefined,
      });
      setDocuments((prev) => [...prev, doc]);
      setShowAddUrl(false);
      setUrlValue('');
      setUrlName('');
      await loadKbList();
    } catch (e) {
      setError(e instanceof Error ? e.message : '添加链接失败');
    } finally {
      setAddingUrl(false);
    }
  };

  const handleAddText = async () => {
    if (!selectedKb || !textName.trim() || !textContent.trim()) return;
    try {
      setAddingText(true);
      const doc = await addDocumentByText(selectedKb.id, {
        name: textName.trim(),
        content: textContent.trim(),
      });
      setDocuments((prev) => [...prev, doc]);
      setShowAddText(false);
      setTextName('');
      setTextContent('');
      await loadKbList();
    } catch (e) {
      setError(e instanceof Error ? e.message : '添加文本失败');
    } finally {
      setAddingText(false);
    }
  };

  const refreshDocuments = async () => {
    if (!selectedKb) return;
    setDocsLoading(true);
    try {
      const docs = await listDocuments(selectedKb.id);
      setDocuments(docs);
    } catch (e) {
      setError(e instanceof Error ? e.message : '刷新失败');
    } finally {
      setDocsLoading(false);
    }
  };

  const filteredKb = kbList.filter(
    (kb) => !searchTerm || (kb.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  if (selectedKb) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedKb(null)}
            className="p-2 hover:bg-gray-100 rounded-xl"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{selectedKb.name}</h2>
            {selectedKb.description && (
              <p className="text-sm text-gray-500">{selectedKb.description}</p>
            )}
          </div>
          <button
            onClick={refreshDocuments}
            disabled={docsLoading}
            className={`p-2 text-slate-500 ${tw.hoverPrimary} rounded-xl transition-colors`}
            title="刷新"
          >
            <RefreshCw className={`w-5 h-5 ${docsLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddUrl(true)}
            className={`flex items-center gap-2 px-3 py-2 ${tw.btnSecondary} rounded-xl text-sm font-bold`}
          >
            <Link className="w-4 h-4" />
            {texts.lawyer.knowledge.addLink}
          </button>
          <button
            onClick={() => setShowAddText(true)}
            className={`flex items-center gap-2 px-3 py-2 ${tw.btnSecondary} rounded-xl text-sm font-bold`}
          >
            <Type className="w-4 h-4" />
            {texts.lawyer.knowledge.addText}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={`flex items-center gap-2 px-4 py-2 ${tw.btnPrimary} rounded-xl text-sm font-bold disabled:opacity-50`}
          >
            <Upload className="w-4 h-4" />
            {uploading ? texts.common.uploading : texts.lawyer.knowledge.uploadDoc}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.md"
            onChange={handleFileSelect}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {docsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${tw.spinnerBorder}`} />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12">
            <Database className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">{texts.lawyer.knowledge.noDocs}</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`mt-4 px-6 py-3 ${tw.iconBg} ${tw.iconColor} rounded-xl font-bold ${tw.hoverAccent}`}
            >
              {texts.lawyer.knowledge.uploadFirst}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => {
              const statusInfo = formatDocStatus(doc.status);
              return (
                <div
                  key={doc.id}
                  className="bg-white p-4 rounded-2xl border border-slate-100 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                      <FileTextIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-900 truncate">{doc.name || doc.filename}</h4>
                    </div>
                    <button
                      onClick={() => handleDeleteDoc(doc)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    {doc.chunk_count != null && (
                      <span>{doc.chunk_count} chunks</span>
                    )}
                    {doc.file_size != null && (
                      <span>{formatFileSize(doc.file_size)}</span>
                    )}
                    {doc.char_count != null && (
                      <span>{doc.char_count.toLocaleString()} 字符</span>
                    )}
                    <span className={statusInfo.color}>
                      索引状态 {statusInfo.label}
                    </span>
                    {doc.updated_at && (
                      <span>最后更新 {formatRelativeTime(doc.updated_at)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showAddUrl && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">{texts.lawyer.knowledge.addLinkTitle}</h3>
                <button onClick={() => setShowAddUrl(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <input
                type="text"
                placeholder={texts.lawyer.knowledge.docNamePlaceholder}
                value={urlName}
                onChange={(e) => setUrlName(e.target.value)}
                className={`w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 ${tw.inputFocus}`}
              />
              <input
                type="url"
                placeholder={texts.lawyer.knowledge.linkPlaceholder}
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                className={`w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 ${tw.inputFocus}`}
              />
              <p className="text-xs text-slate-500">{texts.lawyer.knowledge.linkHint}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddUrl(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  {texts.common.cancel}
                </button>
                <button
                  onClick={handleAddUrl}
                  disabled={!urlValue.trim() || addingUrl}
                  className={`flex-1 py-3 ${tw.btnPrimary} rounded-xl font-bold disabled:opacity-50`}
                >
                  {addingUrl ? texts.common.adding : texts.common.add}
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddText && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">{texts.lawyer.knowledge.addTextTitle}</h3>
                <button onClick={() => setShowAddText(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <input
                type="text"
                placeholder={texts.lawyer.knowledge.textNamePlaceholder}
                value={textName}
                onChange={(e) => setTextName(e.target.value)}
                className={`w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 ${tw.inputFocus}`}
              />
              <textarea
                placeholder={texts.lawyer.knowledge.textContentPlaceholder}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={8}
                className={`w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 ${tw.inputFocus} resize-none`}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddText(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                >
                  {texts.common.cancel}
                </button>
                <button
                  onClick={handleAddText}
                  disabled={!textName.trim() || !textContent.trim() || addingText}
                  className={`flex-1 py-3 ${tw.btnPrimary} rounded-xl font-bold disabled:opacity-50`}
                >
                  {addingText ? texts.common.adding : texts.common.add}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">{texts.lawyer.knowledge.title}</h2>
        <button
          onClick={() => setShowCreate(true)}
          className={`flex items-center gap-1 ${tw.iconColor} text-sm font-bold`}
        >
          <Plus className="w-4 h-4" />
          {texts.lawyer.knowledge.newKb}
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder={texts.lawyer.knowledge.searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 ${tw.inputFocus} transition-all`}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${tw.spinnerBorder}`} />
        </div>
      ) : filteredKb.length === 0 ? (
        <div className="text-center py-12">
          <Database className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 mb-4">
            {searchTerm ? texts.lawyer.knowledge.noKbSearch : texts.lawyer.knowledge.noKb}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowCreate(true)}
              className={`px-6 py-3 ${tw.iconBg} ${tw.iconColor} rounded-xl font-bold ${tw.hoverAccent}`}
            >
              {texts.lawyer.knowledge.createFirst}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredKb.map((kb) => (
            <div
              key={kb.id}
              onClick={() => openKbDetail(kb)}
              className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className={`w-12 h-12 ${tw.iconBg} rounded-2xl flex items-center justify-center ${tw.iconColor}`}>
                <Database className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-900">{kb.name || '未命名项目库'}</h4>
                <p className="text-xs text-slate-400 mt-1">
                  {kb.document_count ?? 0} 个文档
                  {kb.total_size ? ` · ${formatFileSize(kb.total_size)}` : ''}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(kb);
                }}
                className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                title="删除"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-slate-900">{texts.lawyer.knowledge.createTitle}</h3>
            <input
              type="text"
              placeholder={texts.lawyer.knowledge.namePlaceholder}
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className={`w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 ${tw.inputFocus}`}
            />
            <textarea
              placeholder={texts.lawyer.knowledge.descPlaceholder}
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              rows={3}
              className={`w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 ${tw.inputFocus} resize-none`}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
              >
                {texts.common.cancel}
              </button>
              <button
                onClick={handleCreate}
                disabled={!createName.trim() || creating}
                className={`flex-1 py-3 ${tw.btnPrimary} rounded-xl font-bold disabled:opacity-50`}
              >
                {creating ? texts.common.creating : texts.common.create}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
