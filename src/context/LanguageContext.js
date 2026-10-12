import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STRINGS = {
  en: {
    tagline: 'Find Work. Find Workers.',
    chooseLanguage: 'Choose Your Language',
    continue: 'Confirm & Continue',
    roleTitle: 'How will you use Vedakaru?',
    roleWorker: "I'm Looking for Work",
    roleEmployer: "I'm Hiring Workers",
    login: 'Sign In',
    register: 'Create Account',
    jobs: 'Jobs',
    calendar: 'Calendar',
    myJobs: 'My Jobs',
    postings: 'My Postings',
    profile: 'Profile',
    save: 'Save',
    apply: 'Apply Now',
    withdraw: 'Withdraw',
    logout: 'Log Out',
    saved: 'Saved',
    applications: 'Applications',
    work: 'My Work',
    business: 'Business',
  },
  si: {
    tagline: 'වැඩ සොයන්න. වැඩකරුවන් සොයන්න.',
    chooseLanguage: 'ඔබේ භාෂාව තෝරන්න',
    continue: 'තහවුරු කර ඉදිරියට',
    roleTitle: 'ඔබ වේදකරු භාවිතා කරන්නේ කෙසේද?',
    roleWorker: 'මම රැකියාවක් සොයනවා',
    roleEmployer: 'මම වැඩකරුවන් බඳවා ගන්නවා',
    login: 'පිවිසෙන්න',
    register: 'ගිණුමක් සාදන්න',
    jobs: 'රැකියා',
    calendar: 'දින දර්ශනය',
    myJobs: 'මගේ රැකියා',
    postings: 'මගේ දැන්වීම්',
    profile: 'පැතිකඩ',
    save: 'සුරකින්න',
    apply: 'දැන් අයදුම් කරන්න',
    withdraw: 'ඉවත් කරන්න',
    logout: 'ඉවත් වන්න',
    saved: 'සුරකින ලද',
    applications: 'අයදුම්පත්',
    work: 'මගේ වැඩ',
    business: 'ව්‍යාපාරය',
  },
  ta: {
    tagline: 'வேலை தேடுங்கள். ஆட்களைத் தேடுங்கள்.',
    chooseLanguage: 'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்',
    continue: 'உறுதிசெய்து தொடரவும்',
    roleTitle: 'வேதகாரு-வை எவ்வாறு பயன்படுத்துவீர்கள்?',
    roleWorker: 'நான் வேலை தேடுகிறேன்',
    roleEmployer: 'நான் ஆட்களை நியமிக்கிறேன்',
    login: 'உள்நுழை',
    register: 'கணக்கை உருவாக்கு',
    jobs: 'வேலைகள்',
    calendar: 'நாட்காட்டி',
    myJobs: 'என் வேலைகள்',
    postings: 'என் பதிவுகள்',
    profile: 'சுயவிவரம்',
    save: 'சேமி',
    apply: 'இப்போது விண்ணப்பிக்கவும்',
    withdraw: 'திரும்பப் பெறு',
    logout: 'வெளியேறு',
    saved: 'சேமித்தவை',
    applications: 'விண்ணப்பங்கள்',
    work: 'என் பணி',
    business: 'வணிகம்',
  },
};

const LanguageContext = createContext({ lang: 'en', setLang: () => {}, t: (k) => k });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('en');

  useEffect(() => {
    AsyncStorage.getItem('lang').then((v) => v && STRINGS[v] && setLangState(v));
  }, []);

  const setLang = async (l) => {
    setLangState(l);
    await AsyncStorage.setItem('lang', l);
  };

  const t = (key) => STRINGS[lang]?.[key] || STRINGS.en[key] || key;

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export const useLang = () => useContext(LanguageContext);
