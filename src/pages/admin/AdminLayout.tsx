import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Settings, PackageSearch, Inbox, Database, LogOut } from 'lucide-react'
import { AdminLogin } from './AdminLogin'
import { Seo } from '../../components/common/Seo'
import { useSiteData } from '../../context/SiteDataContext'
import type { Locale } from '../../types/site'

const AUTH_KEY = 'xj-admin-auth'

export const AdminLayout = () => {
  const { t, i18n } = useTranslation()
  const { siteData } = useSiteData()
  const locale = i18n.language as Locale
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    setAuthed(localStorage.getItem(AUTH_KEY) === 'true')
  }, [])

  if (!authed) {
    return <AdminLogin onSuccess={() => setAuthed(true)} />
  }

  return (
    <>
      <Seo title={siteData.seo.pages.admin.title} description={siteData.seo.pages.admin.description} />
      <div className="min-h-screen bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row md:px-6">
          <aside className="glass-panel sticky top-8 h-fit w-full self-start rounded-3xl p-6 md:w-64">
            <div className="flex items-center gap-3">
              <img
                src={siteData.settings.logoUrl}
                alt={siteData.settings.siteName[locale]}
                className="h-10 w-10 rounded-full object-cover ring-1 ring-white/20"
              />
              <div>
                <p className="text-sm font-semibold text-white">
                  {siteData.settings.siteName[locale]}
                </p>
                <p className="text-xs text-white/60">{t('admin.dashboardTitle')}</p>
              </div>
            </div>
            <nav className="mt-6 space-y-2 text-sm">
              <NavLink
                to="/admin"
                end
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-2xl px-3 py-2 whitespace-nowrap ${
                    isActive ? 'bg-white/10 text-amber-300' : 'text-white/70 hover:text-white'
                  }`
                }
              >
                <PackageSearch className="h-4 w-4 flex-shrink-0" />
                <span>{t('admin.nav.products')}</span>
              </NavLink>
              <NavLink
                to="/admin/inquiries"
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-2xl px-3 py-2 whitespace-nowrap ${
                    isActive ? 'bg-white/10 text-amber-300' : 'text-white/70 hover:text-white'
                  }`
                }
              >
                <Inbox className="h-4 w-4 flex-shrink-0" />
                <span>{t('admin.nav.inquiries')}</span>
              </NavLink>
              <NavLink
                to="/admin/settings"
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-2xl px-3 py-2 whitespace-nowrap ${
                    isActive ? 'bg-white/10 text-amber-300' : 'text-white/70 hover:text-white'
                  }`
                }
              >
                <Settings className="h-4 w-4 flex-shrink-0" />
                <span>{t('admin.nav.settings')}</span>
              </NavLink>
              <NavLink
                to="/admin/data-sync"
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-2xl px-3 py-2 whitespace-nowrap ${
                    isActive ? 'bg-white/10 text-amber-300' : 'text-white/70 hover:text-white'
                  }`
                }
              >
                <Database className="h-4 w-4 flex-shrink-0" />
                <span>{t('admin.nav.dataSync')}</span>
              </NavLink>
            </nav>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem(AUTH_KEY)
                setAuthed(false)
              }}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-xs text-white/70 hover:border-white/30 whitespace-nowrap"
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              <span>{t('actions.logout')}</span>
            </button>
          </aside>
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  )
}
