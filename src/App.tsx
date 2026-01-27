import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Toaster } from 'react-hot-toast'
import { AppLayout } from './components/layout/AppLayout'
import { ScrollToTop } from './components/common/ScrollToTop'
import { Home } from './pages/Home'
import { Products } from './pages/Products'
import { ProductDetail } from './pages/ProductDetail'
import { About } from './pages/About'
import { Contact } from './pages/Contact'
import { AdminLayout } from './pages/admin/AdminLayout'
import { AdminProducts } from './pages/admin/AdminProducts'
import { AdminInquiries } from './pages/admin/AdminInquiries'
import { AdminSettings } from './pages/admin/AdminSettings'
import { AdminDataSync } from './pages/admin/AdminDataSync'
import { setLanguageParam, getQueryLanguage } from './i18n/utils'
import type { Locale } from './types/site'

const LanguageSync = () => {
  const { i18n } = useTranslation()
  const location = useLocation()

  useEffect(() => {
    const urlLang = getQueryLanguage()
    if (urlLang && urlLang !== i18n.language) {
      void i18n.changeLanguage(urlLang)
    }
  }, [i18n, location.key])

  useEffect(() => {
    setLanguageParam((i18n.language as Locale) || 'en')
  }, [i18n.language])

  return null
}

const App = () => {
  return (
    <HashRouter>
      <ScrollToTop />
      <LanguageSync />
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:productId" element={<ProductDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
        </Route>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminProducts />} />
          <Route path="inquiries" element={<AdminInquiries />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="data-sync" element={<AdminDataSync />} />
        </Route>
      </Routes>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0f172a',
            color: '#e2e8f0',
            border: '1px solid rgba(148, 163, 184, 0.2)'
          }
        }}
      />
    </HashRouter>
  )
}

export default App
