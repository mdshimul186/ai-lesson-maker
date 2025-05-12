export function getSelectVoiceList(lang: string, list: string[]): string[] {
    return list.filter((voice) => voice.startsWith(lang));
}