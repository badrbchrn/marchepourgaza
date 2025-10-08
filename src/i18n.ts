import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

const resources = {
  fr: { translation: {
    brand: 'MarchePourGaza',
    nav: { home:'Accueil', participate:'Participer', sponsors:'Parrains', runners:'Marcheurs', route:'Parcours', media:'Médias', contact:'Contact' },
    hero: { title:'Marche solidaire autour du Léman', ctaRunner:'Je participe', ctaSponsor:'Je parraine' }
  }},
  en: { translation: {
    brand: 'WalkforGaza',
    nav: { home:'Home', participate:'Participate', sponsors:'Sponsors', runners:'Walkers', route:'Route', media:'Media', contact:'Contact' },
    hero: { title:'Solidarity walk around Lake Geneva', ctaRunner:'I participate', ctaSponsor:'I sponsor' }
  }},
}

i18n.use(LanguageDetector).use(initReactI18next).init({
  resources, fallbackLng: 'fr', interpolation: { escapeValue: false }
})
export default i18n
