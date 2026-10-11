import { uploadAttachment } from './actions';

type AttachmentRecord = { id: string; fileName: string; sizeBytes: number };

export function AttachmentPanel({
  kind,
  recordId,
  attachments,
  canUpload,
  result,
  labels,
}: {
  kind: 'cargo' | 'trip' | 'transaction';
  recordId: string;
  attachments: AttachmentRecord[];
  canUpload: boolean;
  result?: string;
  labels: {
    title: string;
    upload: string;
    download: string;
    empty: string;
    file: string;
    uploaded: string;
    failed: string;
  };
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">{labels.title}</h3>
      {result === 'uploaded' ? <p role="status" className="text-sm text-emerald-700">{labels.uploaded}</p> : null}
      {result === 'failed' ? <p role="alert" className="text-sm text-red-700">{labels.failed}</p> : null}
      {attachments.length > 0 ? (
        <ul className="divide-y rounded-md border bg-white text-sm">
          {attachments.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0 truncate">{item.fileName} <span className="text-slate-500">({Math.ceil(item.sizeBytes / 1024)} KB)</span></span>
              <a href={`/api/attachments/${item.id}`} className="shrink-0 text-slate-600 underline">
                {labels.download}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">{labels.empty}</p>
      )}
      {canUpload ? (
        <form action={uploadAttachment} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="recordId" value={recordId} />
          <input
            type="file"
            name="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            required
            aria-label={labels.file}
            className="max-w-full text-sm"
          />
          <button type="submit" className="rounded border px-3 py-2 text-sm hover:bg-slate-50">
            {labels.upload}
          </button>
        </form>
      ) : null}
    </section>
  );
}