import { MessageCircle } from 'lucide-react'
import { useSiteData } from '../../context/SiteDataContext'

export const WhatsAppButton = () => {
  const { siteData } = useSiteData()

  return (
    <a
      href={`https://wa.me/${siteData.contact.whatsapp}`}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400 text-slate-900 shadow-lg shadow-emerald-400/40 transition hover:scale-105"
      aria-label="WhatsApp"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  )
}
