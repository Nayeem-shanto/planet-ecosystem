export default function PageLoader({ fullScreen = false }) {
  return (
    <div className={`grid place-items-center ${fullScreen ? 'min-h-screen' : 'min-h-64'}`}>
      <span className="loading loading-spinner loading-lg text-primary" aria-label="Loading" />
    </div>
  )
}
