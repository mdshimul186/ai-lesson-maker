import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en'
import zh from './zh'

const resources = {
    en: {
        translation: en
    },
    zh: {
        translation: zh
    }
}

i18n.use(initReactI18next).init({
    resources,
    lng: typeof window !== 'undefined' ? (localStorage.getItem('lang') || 'en') : 'en',
    fallbackLng: 'en',
    interpolation: {
        escapeValue: false
    }
})

export default i18n