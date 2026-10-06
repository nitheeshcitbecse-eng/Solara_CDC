import type { Faq } from '../../../lib/types/support';

/**
 * FAQ content is server-owned and localised by Accept-Language. The mock ships
 * English, Tamil and Hindi; other languages receive English (as the real API would).
 */
export const FAQS: Record<'en' | 'ta' | 'hi', Faq[]> = {
  en: [
    {
      id: 'faq_free',
      question: 'Do I have to pay to use Solara?',
      answer: 'No. Solara is always free for job seekers. Never pay anyone to apply for a job — report such requests from the job page.',
    },
    {
      id: 'faq_verified',
      question: 'What does the "Verified" badge mean?',
      answer: 'The hirer has verified their identity with Aadhaar and our team has reviewed it. You can see the badge on every job they post.',
    },
    {
      id: 'faq_voice',
      question: 'Why do I need to record a voice introduction?',
      answer: 'A short voice introduction (up to 60 seconds) helps hirers get to know you in your own words and language. It often matters more than a written CV.',
    },
    {
      id: 'faq_phone',
      question: 'Who can see my phone number?',
      answer: 'Only hirers you apply to, and only if you turn on "Share my phone number" for that application. Otherwise they contact you through in-app messages.',
    },
    {
      id: 'faq_aadhaar',
      question: 'How is my Aadhaar kept safe?',
      answer: 'We only ask for the last four digits and a photo for verification. The full number is never shown in the app, and documents can only be opened by our verification team.',
    },
    {
      id: 'faq_rating',
      question: 'What do Easy, Moderate and Hard mean on a job?',
      answer: 'They describe how demanding the workplace looks, based on the photos the hirer uploaded. Every job is checked for safety before it is published.',
    },
  ],
  ta: [
    {
      id: 'faq_free',
      question: 'Solara-வைப் பயன்படுத்த பணம் செலுத்த வேண்டுமா?',
      answer: 'இல்லை. வேலை தேடுபவர்களுக்கு Solara எப்போதும் இலவசம். வேலைக்கு விண்ணப்பிக்க யாருக்கும் பணம் கொடுக்காதீர்கள் — அப்படிக் கேட்டால் வேலைப் பக்கத்திலிருந்து புகார் செய்யுங்கள்.',
    },
    {
      id: 'faq_verified',
      question: '"சரிபார்க்கப்பட்டது" என்ற அடையாளத்தின் பொருள் என்ன?',
      answer: 'வேலை வழங்குபவர் ஆதார் மூலம் தங்கள் அடையாளத்தைச் சரிபார்த்துள்ளார், எங்கள் குழு அதை ஆய்வு செய்துள்ளது. அவர் பதிவிடும் ஒவ்வொரு வேலையிலும் இந்த அடையாளம் தெரியும்.',
    },
    {
      id: 'faq_voice',
      question: 'குரல் அறிமுகம் ஏன் பதிவு செய்ய வேண்டும்?',
      answer: 'சிறிய குரல் அறிமுகம் (60 விநாடிகள் வரை) உங்கள் சொந்த வார்த்தைகளிலும் மொழியிலும் உங்களை அறிய வேலை வழங்குபவர்களுக்கு உதவுகிறது.',
    },
    {
      id: 'faq_phone',
      question: 'என் தொலைபேசி எண்ணை யார் பார்க்க முடியும்?',
      answer: 'நீங்கள் விண்ணப்பிக்கும் வேலை வழங்குபவர்கள் மட்டுமே, அதுவும் அந்த விண்ணப்பத்தில் "என் எண்ணைப் பகிர்" என்பதை இயக்கினால் மட்டுமே. இல்லையெனில் செயலியில் உள்ள செய்திகள் மூலம் தொடர்புகொள்வார்கள்.',
    },
    {
      id: 'faq_aadhaar',
      question: 'என் ஆதார் எப்படிப் பாதுகாக்கப்படுகிறது?',
      answer: 'கடைசி நான்கு இலக்கங்களும் சரிபார்ப்புக்கான புகைப்படமும் மட்டுமே கேட்கிறோம். முழு எண் செயலியில் ஒருபோதும் காட்டப்படாது.',
    },
    {
      id: 'faq_rating',
      question: 'வேலையில் உள்ள எளிது, மிதமானது, கடினம் என்பதன் பொருள் என்ன?',
      answer: 'வேலை வழங்குபவர் பதிவேற்றிய புகைப்படங்களின் அடிப்படையில் பணியிடம் எவ்வளவு கடினமானது என்பதைக் காட்டுகிறது. ஒவ்வொரு வேலையும் வெளியிடுவதற்கு முன் பாதுகாப்புக்காகச் சரிபார்க்கப்படுகிறது.',
    },
  ],
  hi: [
    {
      id: 'faq_free',
      question: 'क्या Solara इस्तेमाल करने के लिए पैसे देने होंगे?',
      answer: 'नहीं। नौकरी ढूँढने वालों के लिए Solara हमेशा मुफ़्त है। नौकरी के लिए आवेदन करने के लिए किसी को पैसे न दें — ऐसी माँग की शिकायत नौकरी के पेज से करें।',
    },
    {
      id: 'faq_verified',
      question: '"सत्यापित" बैज का क्या मतलब है?',
      answer: 'नियोक्ता ने आधार से अपनी पहचान सत्यापित की है और हमारी टीम ने उसकी जाँच की है। उनकी हर नौकरी पर यह बैज दिखता है।',
    },
    {
      id: 'faq_voice',
      question: 'आवाज़ में परिचय क्यों रिकॉर्ड करना है?',
      answer: 'छोटा आवाज़ परिचय (60 सेकंड तक) नियोक्ताओं को आपके अपने शब्दों और भाषा में आपको जानने में मदद करता है।',
    },
    {
      id: 'faq_phone',
      question: 'मेरा फ़ोन नंबर कौन देख सकता है?',
      answer: 'सिर्फ़ वे नियोक्ता जिन्हें आप आवेदन करते हैं, और तभी जब आप उस आवेदन में "मेरा नंबर साझा करें" चालू करें। वरना वे ऐप में संदेश से संपर्क करेंगे।',
    },
    {
      id: 'faq_aadhaar',
      question: 'मेरा आधार कैसे सुरक्षित रहता है?',
      answer: 'हम सिर्फ़ आख़िरी चार अंक और सत्यापन के लिए फ़ोटो लेते हैं। पूरा नंबर ऐप में कभी नहीं दिखाया जाता।',
    },
    {
      id: 'faq_rating',
      question: 'नौकरी पर आसान, मध्यम और कठिन का क्या मतलब है?',
      answer: 'यह नियोक्ता की अपलोड की गई फ़ोटो के आधार पर बताता है कि काम कितना मेहनत वाला है। हर नौकरी प्रकाशित होने से पहले सुरक्षा के लिए जाँची जाती है।',
    },
  ],
};
