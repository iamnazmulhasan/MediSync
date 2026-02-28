// src/data/dictionaryDurations.js
export const phoneticDictionary = {
    // Core duration words
    'din': 'দিন',
    'day': 'দিন',
    'd': 'দিন'
};

const digitMap = {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
    '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
};

const reverseDigitMap = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
};

export const convertToBengaliDuration = (text) => {
    if (typeof text !== 'string' || !text) return '';
  
    let processed = text;

    // Convert English digits to Bengali digits
    processed = processed.replace(/[0-9]/g, d => digitMap[d] || d);
  
    // Dictionary replacement (Preserving spaces via regex group)
    const words = processed.split(/(\s+)/);
    const translated = words.map(word => {
        if (word.trim() === '') return word; // Return the exact space characters untouched
        const lower = word.toLowerCase();
        if (phoneticDictionary[lower]) {
            return phoneticDictionary[lower];
        }
        return word;
    });
  
    return translated.join(''); 
};

// NEW: Converts UI text like "১৪ দিন" into the integer 14 for the API
export const convertDurationToEnglishInt = (text) => {
    if (!text) return null;
    
    // Extract all digits (both English and Bengali)
    const digits = text.match(/[0-9০-৯]/g);
    if (!digits) return null;
    
    // Convert to English string, then to integer
    const engString = digits.map(d => reverseDigitMap[d] || d).join('');
    return parseInt(engString, 10);
};