import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

const PasswordInput = forwardRef(function PasswordInput(props, ref) {
  const [visible, setVisible] = useState(false)
  return (
    <label className={`input w-full ${props['aria-invalid'] ? 'input-error' : ''}`}>
      <input ref={ref} type={visible ? 'text' : 'password'} className="grow" {...props} />
      <button type="button" className="text-base-content/50 hover:text-base-content" onClick={() => setVisible((v) => !v)} aria-label={visible ? 'Hide password' : 'Show password'}>
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </label>
  )
})
export default PasswordInput
