'use client';

import { useState, useRef } from 'react';
import { Upload, X, Loader2, Film, ImageIcon } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface MediaUploadProps {
  value?: string;
  onChange: (url: string) => void;
  accept?: string;
  label?: string;
  compact?: boolean;
  previewType?: 'image' | 'video';
}

export function MediaUpload({ value, onChange, accept = 'image/*', label = 'Upload Image', compact = false, previewType = 'image' }: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const res = await adminApi.uploadSingle(file);
      // The axios interceptor already unwraps .data, so res IS { url: string }
      const url = (res as any)?.url || (res as any)?.data?.url;
      if (!url) throw new Error('No URL returned');
      onChange(url);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Upload failed — check you are logged in');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const isVideo = previewType === 'video' || (value && (value.includes('.mp4') || value.includes('.webm') || value.includes('.mov')));

  return (
    <div className="space-y-2">
      {label && <label className="text-xs font-medium text-slate-600 block">{label}</label>}

      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 group">
          {isVideo ? (
            <video src={value} controls className="w-full max-h-48 object-cover bg-black" />
          ) : (
            <img src={value} alt="preview" className={`w-full object-cover ${compact ? 'h-24' : 'h-40'}`} />
          )}
          <button
            type="button"
            onClick={() => { onChange(''); if (inputRef.current) inputRef.current.value = ''; }}
            className="absolute top-2 right-2 bg-white rounded-full p-1 shadow hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4 text-red-500" />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 bg-sky-500 text-white text-xs px-3 py-1.5 rounded-lg shadow opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Change
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-sky-400 hover:bg-sky-50 transition-colors ${compact ? 'p-4' : 'p-8'}`}
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
          ) : (
            <>
              {accept.includes('video') ? <Film className="w-8 h-8 text-slate-300 mb-2" /> : <ImageIcon className="w-8 h-8 text-slate-300 mb-2" />}
              <p className="text-sm text-slate-500">{compact ? 'Upload' : 'Drop file here or click to upload'}</p>
              {!compact && <p className="text-xs text-slate-400 mt-1">Supports images up to 100MB</p>}
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}

// Multi-image upload
interface MultiImageUploadProps {
  values: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  label?: string;
}

export function MultiImageUpload({ values, onChange, max = 10, label = 'Images' }: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: File[]) => {
    setUploading(true);
    try {
      const res = await adminApi.uploadMultiple(files);
      // The axios interceptor already unwraps .data, so res IS { urls: string[] }
      const newUrls: string[] = (res as any)?.urls || (res as any)?.data?.urls || [];
      if (!newUrls.length) throw new Error('No URLs returned');
      onChange([...values, ...newUrls].slice(0, max));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Upload failed — check you are logged in');
    } finally {
      setUploading(false);
    }
  };

  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      {label && <label className="text-xs font-medium text-slate-600 block">{label} <span className="text-slate-400">({values.length}/{max})</span></label>}
      <div className="flex flex-wrap gap-2">
        {values.map((url, i) => (
          <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button type="button" onClick={() => remove(i)}
              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        ))}
        {values.length < max && (
          <button type="button" onClick={() => inputRef.current?.click()}
            className="w-20 h-20 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center hover:border-sky-400 hover:bg-sky-50 transition-colors cursor-pointer">
            {uploading ? <Loader2 className="w-5 h-5 text-sky-400 animate-spin" /> : <Upload className="w-5 h-5 text-slate-400" />}
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length) handleFiles(files); }} />
    </div>
  );
}
