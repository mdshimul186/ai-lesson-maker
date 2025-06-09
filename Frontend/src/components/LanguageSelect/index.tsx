'use client';

import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

export default function LanguageSelect() {
    const { t, i18n } = useTranslation();
    
    const changeLang = (lang: string) => {
        i18n.changeLanguage(lang);
        localStorage.setItem('lang', lang);
    };

    const currentLang = typeof window !== 'undefined' ? localStorage.getItem('lang') || 'en' : 'en';
    
    return (
        <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-600">{t('language.switchText')}</div>
            <Select value={currentLang} onValueChange={changeLang}>
                <SelectTrigger className="w-32">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="zh">中文</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="bn">Bangla</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}