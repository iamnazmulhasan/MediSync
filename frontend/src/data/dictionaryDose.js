// src/data/dictionary.js

export const phoneticDictionary = {
    'tab': 'ট্যাবলেট',
    'tablet': 'ট্যাবলেট',
    'cap': 'ক্যাপসুল',
    'capsule': 'ক্যাপসুল',
    'syp': 'সিরাপ',
    'syrup': 'সিরাপ',
    'drop': 'ফোঁটা',
    'drops': 'ফোঁটা',
    'rate': 'রাতে',
    'sokale': 'সকালে',
    'dupure': 'দুপুরে',
    'bikele': 'বিকেলে',
    'khabar': 'খাবার',
    'age': 'আগে',
    'por': 'পর',
    'dine': 'দিনে',
    'bar': 'বার',
    'chamoch': 'চামচ',
    'mili': 'মিলি',
    'kore': 'করে',
    'dui': 'দুই',
    'chokhe': 'চোখে',
    'nake': 'নাকে',
    'diben': 'দিবেন',
    'khabe': 'খাবে',
    'khaben': 'খাবেন',
    'ghumanor': 'ঘুমানোর',
    'khali': 'খালি',
    'pete': 'পেটে',
    'din': 'দিন',
    'prothom': 'প্রথম',
    'ebong': 'এবং',
    'bhag': 'ভাগ',
    'poune': 'পৌনে',
    'ek': 'এক',
    'ti': 'টি',
    'o': 'ও',
    'minit': 'মিনিট',
    'ghonta': 'ঘন্টা',
    'porpor': 'পরপর'
};

const digitMap = {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
    '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
};

export const convertToBengali = (text) => {
    if (!text) return '';

    // 1. Convert English digits to Bengali digits
    let processedText = text.replace(/[0-9]/g, d => digitMap[d]);

    // 2. Dictionary translation (split by spaces to preserve exact words & spacing)
    const words = processedText.split(' ');
    const translatedWords = words.map(w => {
        // Find the core English word, ignoring attached symbols (like "+" or "/")
        const coreWordMatch = w.match(/^[a-zA-Z]+/);
        if (coreWordMatch) {
            const coreWord = coreWordMatch[0].toLowerCase();
            if (phoneticDictionary[coreWord]) {
                // Replace just the English part, keeping any trailing symbols intact
                return w.replace(coreWordMatch[0], phoneticDictionary[coreWord]);
            }
        }
        return w;
    });

    return translatedWords.join(' ');
};