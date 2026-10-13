import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ID_TYPES, passwordField, PASSWORD_RULES, phoneField, WORK_TYPES } from '@planet/shared'
import { useAuth } from '../../context/AuthContext'
import { api, applyServerErrors } from '../../lib/api'
import { formatDate } from '../../lib/format'
import PageHeader from '../../components/ui/PageHeader'
import Field from '../../components/ui/Field'
import NominationCard from '../../components/staff/NominationCard'
import PasswordInput from '../auth/PasswordInput'

const profileSchema = z.object({ name: z.string().trim().min(1, 'Name is required').max(100), phone: phoneField, workDetail: z.string().trim().max(160).optional(), designation: z.string().trim().max(80).optional() })
const passwordSchema = z.object({ currentPassword: z.string().min(1, 'Enter your current password'), password: passwordField, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })

function Row({ label, value }) {
  if (!value) return null
  return <div className="flex justify-between gap-4 border-b border-base-200 py-2.5 text-sm last:border-0"><dt className="text-base-content/60">{label}</dt><dd className="text-right font-medium">{value}</dd></div>
}

export default function ProfilePage() {
  const { user, refresh } = useAuth()
  const isStaff = user.role === 'admin' || user.role === 'super_admin'
  const [pwError, setPwError] = useState('')

  const profile = useForm({ resolver: zodResolver(profileSchema), defaultValues: { name: user.name, phone: user.phone, workDetail: user.workDetail ?? '', designation: user.designation ?? '' } })
  const pw = useForm({ resolver: zodResolver(passwordSchema) })

  const saveProfile = async (values) => {
    try { await api('/users/me', { method: 'PATCH', body: values }); await refresh(); toast.success('Profile updated') }
    catch (err) { if (!applyServerErrors(err, profile.setError)) toast.error(err.message) }
  }
  const changePassword = async (values) => {
    setPwError('')
    try { const { message } = await api('/auth/change-password', { method: 'POST', body: values }); pw.reset(); toast.success(message) }
    catch (err) { if (!applyServerErrors(err, pw.setError)) setPwError(err.message) }
  }

  const idLabel = ID_TYPES.find((t) => t.value === user.idType)?.label
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="My profile" />
      {isStaff && user.staffCode && <NominationCard user={user} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-box border border-base-300 bg-base-100 p-5">
          <h2 className="mb-3 text-lg font-bold">Account</h2>
          <dl>
            <Row label="Account type" value={user.roleLabel} />
            <Row label="Email" value={user.email} />
            <Row label={idLabel ?? 'ID'} value={user.idNumberMasked} />
            <Row label="I am a" value={WORK_TYPES.find((w) => w.value === user.workType)?.label} />
            <Row label="Company" value={user.company?.name} />
            <Row label="Employee ID" value={user.employeeId} />
            <Row label={`${user.roleLabel} ID`} value={isStaff ? user.staffCode : null} />
            <Row label="Member since" value={formatDate(user.createdAt)} />
          </dl>
          <p className="mt-3 text-xs text-base-content/55">To change your email, ID number, company or employee ID, contact HR.</p>
        </section>

        <section className="rounded-box border border-base-300 bg-base-100 p-5">
          <h2 className="mb-4 text-lg font-bold">Contact details</h2>
          <form onSubmit={profile.handleSubmit(saveProfile)} className="space-y-4" noValidate>
            <Field label="Full name" id="p-name" error={profile.formState.errors.name?.message}>{(a) => <input id="p-name" className="input w-full" {...a} {...profile.register('name')} />}</Field>
            <Field label="Phone number" id="p-phone" error={profile.formState.errors.phone?.message}>{(a) => <input id="p-phone" className="input w-full" {...a} {...profile.register('phone')} />}</Field>
            {user.role === 'general' && <Field label={WORK_TYPES.find((w) => w.value === user.workType)?.detailLabel ?? 'Details'} id="p-wd">{(a) => <input id="p-wd" className="input w-full" {...a} {...profile.register('workDetail')} />}</Field>}
            {isStaff && <Field label="Designation" id="p-des">{(a) => <input id="p-des" className="input w-full" {...a} {...profile.register('designation')} />}</Field>}
            <button className="btn btn-primary" disabled={profile.formState.isSubmitting}>Save changes</button>
          </form>
        </section>
      </div>

      <section className="rounded-box border border-base-300 bg-base-100 p-5">
        <h2 className="mb-1 text-lg font-bold">Change password</h2>
        <p className="mb-4 text-sm text-base-content/60">You’ll stay signed in here; other devices will be signed out.</p>
        <form onSubmit={pw.handleSubmit(changePassword)} className="grid gap-4 sm:grid-cols-3" noValidate>
          <Field label="Current password" id="pw-c" error={pw.formState.errors.currentPassword?.message}>{(a) => <PasswordInput id="pw-c" autoComplete="current-password" {...a} {...pw.register('currentPassword')} />}</Field>
          <Field label="New password" id="pw-n" error={pw.formState.errors.password?.message} hint={PASSWORD_RULES}>{(a) => <PasswordInput id="pw-n" autoComplete="new-password" {...a} {...pw.register('password')} />}</Field>
          <Field label="Confirm new password" id="pw-r" error={pw.formState.errors.confirmPassword?.message}>{(a) => <PasswordInput id="pw-r" autoComplete="new-password" {...a} {...pw.register('confirmPassword')} />}</Field>
          {pwError && <div role="alert" className="alert alert-error alert-soft text-sm sm:col-span-3">{pwError}</div>}
          <div className="sm:col-span-3"><button className="btn btn-primary" disabled={pw.formState.isSubmitting}>Update password</button></div>
        </form>
      </section>
    </div>
  )
}
