export default function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between gap-3 px-1 pt-4 text-sm">
      <span className="text-base-content/60">Page {page} of {pages} ({total} total)</span>
      <div className="join">
        <button className="btn btn-sm join-item" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
        <button className="btn btn-sm join-item" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button>
      </div>
    </div>
  )
}
