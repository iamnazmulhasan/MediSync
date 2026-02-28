// src/data/dictionaryInstructions.js
export const phoneticDictionary = {
  // Core words from your instructions
  'khabar': 'খাবার',
  'age': 'আগে',
  'pore': 'পরে',
  'sathe': 'সাথে',
  'khali': 'খালি',
  'pete': 'পেটে',
  'rate': 'রাতে',
  'ghumano': 'ঘুমানো',
  'ag': 'আগ',
  'por': 'পর',
  'sokale': 'সকালে',
  'dupure': 'দুপুরে',
  'bikele': 'বিকেলে',
  'dine': 'দিনে',
  'ekbar': 'একবার',
  'dubar': 'দুবার',
  'tinbar': 'তিনবার',
  'charbar': 'চারবার',
  'panchbar': 'পাঁচবার',
  'choybar': 'ছয়বার',
  'ghonta': 'ঘণ্টা',
  'proti': 'প্রতি',
  'chokhe': 'চোখে',
  'nake': 'নাকে',
  'kane': 'কানে',
  'fota': 'ফোঁটা',
  'ek': 'এক',
  'dui': 'দুই',
  'tin': 'তিন',
  'chamoch': 'চামচ',
  'trish': 'ত্রিশ',
  'minit': 'মিনিট',
  'ekghonta': 'এক ঘণ্টা',
  'adhghonta': 'আধঘণ্টা',
  'dighonta': 'দুই ঘণ্টা',
  'sebon': 'সেবন',
  'korun': 'করুন',
  'mukhe': 'মুখে',
  'twoke': 'ত্বকে',
  'khosto': 'ক্ষত',
  'sthane': 'স্থানে',
  'mathay': 'মাথায়',
  'dante': 'দাঁতে',
  'jihwa': 'জিহ্বা',
  'niche': 'নিচে',
  'rakhun': 'রাখুন',
  'shwas': 'শ্বাস',
  'inhaler': 'ইনহেলার',
  'injection': 'ইনজেকশন',
  'hate': 'হাতে',
  'nitombe': 'নিতম্বে',
  'molom': 'মলম',
  'krim': 'ক্রিম',
  'sirap': 'সিরাপ',
  'tablet': 'ট্যাবলেট',
  'capsule': 'ক্যাপসুল',
  'powder': 'পাউডার',
  'panite': 'পানিতে',
  'misiye': 'মিশিয়ে',
  'vitamin': 'ভিটামিন',
  'antacid': 'অ্যান্টাসিড',
  'painkiller': 'পেইনকিলার',
  'antibiotic': 'অ্যান্টিবায়োটিক',
  'purno': 'পুরো',
  'course': 'কোর্স',
  'pani': 'পানি',
  'prochur': 'প্রচুর',
  'muk': 'মুখ',
  'dhoyar': 'ধোয়ার',
  'dant': 'দাঁত',
  'majar': 'মাজার',
  'patla': 'পাতলা',
  'kore': 'করে',
  'lagan': 'লাগান',

  // Extra useful shortcuts doctors type
  'tab': 'ট্যাবলেট',
  'cap': 'ক্যাপসুল',
  'syp': 'সিরাপ',
  'drop': 'ফোঁটা',
  'drops': 'ফোঁটা',
  'eye': 'চোখে',
  'nose': 'নাকে',
  'ear': 'কানে',
  'cream': 'ক্রিম',
  'ointment': 'মলম',
  'inj': 'ইনজেকশন',
  'bd': 'দুবার',
  'tds': 'তিনবার',
  'od': 'একবার',
  'hs': 'ঘুমানোর আগে',
  'ac': 'খাবার আগে',
  'pc': 'খাবার পরে',
  'withfood': 'খাবার সাথে',
  'empty': 'খালি পেটে'
};

const digitMap = {
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
  '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
};

export const convertToBengali = (text) => {
  if (typeof text !== 'string' || !text) return '';

  // 1. English digits → Bengali digits
  let result = text.replace(/[0-9]/g, d => digitMap[d] || d);

  // 2. Dictionary replacement (preserving spaces perfectly via regex capture group)
  const words = result.split(/(\s+)/);
  const translated = words.map(word => {
    if (word.trim() === '') return word; // Return spaces exactly as they are
    const lower = word.toLowerCase();
    if (phoneticDictionary[lower]) {
      return phoneticDictionary[lower];
    }
    return word; // keep unchanged if no match
  });

  return translated.join('');
};