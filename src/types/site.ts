export type Locale = 'en' | 'zh'

export type LocalizedText = Record<Locale, string>

export interface SeoContent {
  title: LocalizedText
  description: LocalizedText
}

export interface SiteSettings {
  siteName: LocalizedText
  tagline: LocalizedText
  logoUrl: string
  adminPassword: string
  seoDefaults: SeoContent
  twitterHandle?: string
}

export interface HeroContent {
  title: LocalizedText
  subtitle: LocalizedText
  ctaLabel: LocalizedText
  backgroundImage: string
  backgroundVideo?: string
}

export interface Advantage {
  id: string
  icon: string
  title: LocalizedText
  description: LocalizedText
}

export interface Partner {
  id: string
  name: string
  logoUrl?: string
}

export interface TradeRegion {
  id: string
  name: LocalizedText
  markets: LocalizedText
}

export interface Category {
  id: string
  name: LocalizedText
  subcategories: Array<{
    id: string
    name: LocalizedText
  }>
}

export interface Product {
  id: string
  sku: string
  categoryId: string
  subcategoryId?: string
  name: LocalizedText
  shortDescription: LocalizedText
  description: LocalizedText
  price: {
    amount: number
    currency: string
    unit: LocalizedText
    moq: number
  }
  images: string[]
  mainImage: string
  features: LocalizedText[]
  specs: Array<{
    label: LocalizedText
    value: LocalizedText
  }>
  certifications: string[]
  stockStatus: 'in_stock' | 'out_of_stock'
  leadTime: LocalizedText
  seo: SeoContent
  translationStatus: Record<Locale, boolean>
  createdAt: string
  updatedAt: string
}

export interface ContactInfo {
  phone: string
  email: string
  whatsapp: string
  address: LocalizedText
  hours: LocalizedText
  map: {
    lat: number
    lng: number
    zoom: number
  }
  socials: Array<{
    platform: string
    url: string
  }>
}

export interface AboutContent {
  overview: LocalizedText
  mission: LocalizedText
  timeline: Array<{
    year: string
    content: LocalizedText
  }>
  team: Array<{
    name: string
    role: LocalizedText
    bio: LocalizedText
  }>
}

export interface SeoPages {
  home: SeoContent
  products: SeoContent
  productDetail: SeoContent
  about: SeoContent
  contact: SeoContent
  admin: SeoContent
}

export interface SiteData {
  locales: Locale[]
  defaultLocale: Locale
  settings: SiteSettings
  hero: HeroContent
  advantages: Advantage[]
  partners: Partner[]
  tradeRegions: TradeRegion[]
  categories: Category[]
  featuredProductIds: string[]
  products: Product[]
  about: AboutContent
  contact: ContactInfo
  seo: {
    pages: SeoPages
  }
}

export interface Inquiry {
  id: string
  productId?: string
  name: string
  email: string
  phone?: string
  company?: string
  message: string
  quantity?: number
  locale: Locale
  createdAt: string
  status: 'new' | 'processing' | 'closed'
}
