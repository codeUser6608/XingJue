import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-hot-toast'
import { useSiteData } from '../../context/SiteDataContext'

const loginSchema = z.object({
  password: z.string().min(1)
})

type LoginValues = z.infer<typeof loginSchema>

const AUTH_KEY = 'xj-admin-auth'

export const AdminLogin = ({ onSuccess }: { onSuccess: () => void }) => {
  const { t } = useTranslation()
  const { siteData } = useSiteData()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema)
  })

  const onSubmit = (values: LoginValues) => {
    if (values.password === siteData.settings.adminPassword) {
      localStorage.setItem(AUTH_KEY, 'true')
      onSuccess()
      toast.success(t('misc.updated'))
    } else {
      toast.error(t('admin.invalidPassword'))
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-panel w-full max-w-md rounded-3xl p-8">
        <h1 className="text-2xl font-semibold text-white">{t('admin.loginTitle')}</h1>
        <p className="mt-2 text-sm text-white/60">{t('admin.loginHint')}</p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4 text-sm">
          <input
            {...register('password')}
            type="password"
            placeholder={t('admin.passwordLabel')}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/80 placeholder:text-white/40"
          />
          {errors.password && (
            <p className="text-xs text-rose-300">{t('validation.required')}</p>
          )}
          <button type="submit" className="btn-primary w-full">
            {t('admin.loginButton')}
          </button>
        </form>
      </div>
    </div>
  )
}
