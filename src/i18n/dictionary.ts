// English → Hindi (Devanagari) dictionary. Keys must match the exact, trimmed
// text a DOM node renders. Dynamic strings (with numbers / interpolation) won't
// have a key and stay in English. Add entries here to widen coverage.
export const HI: Record<string, string> = {
  // ---- Header / tabs ---------------------------------------------------
  'Oxygen demand & costing — facility and district / state':
    'ऑक्सीजन मांग और लागत — सुविधा और जिला / राज्य',
  'How to use this model': 'इस मॉडल का उपयोग कैसे करें',
  'Facility cost': 'सुविधा लागत',
  'District / State': 'जिला / राज्य',
  'Methodology': 'कार्यप्रणाली',
  '🎓 Tutorial': '🎓 ट्यूटोरियल',
  'On': 'चालू',
  'Off': 'बंद',
  'English': 'English',
  'हिंदी': 'हिंदी',

  // ---- Column headers --------------------------------------------------
  'Inputs': 'इनपुट',
  'Output': 'परिणाम',
  'your results · updates live': 'आपके परिणाम · तुरंत अपडेट होते हैं',
  'demand & annual budget · updates live': 'मांग और बजट · तुरंत अपडेट होते हैं',
  'counts by facility size · rates · model': 'सुविधा आकार अनुसार संख्या · दरें · मॉडल',

  // ---- Steps & navigation ---------------------------------------------
  'Step 1': 'चरण 1',
  'Step 2': 'चरण 2',
  'Step 3': 'चरण 3',
  'Demand': 'मांग',
  'Details': 'विवरण',
  'Cost inputs': 'लागत इनपुट',
  'Estimate monthly demand': 'मासिक मांग का अनुमान',
  'How many of each source?': 'हर स्रोत के कितने?',
  'Source details': 'स्रोत का विवरण',
  'Estimate demand': 'मांग का अनुमान',
  'Reset all': 'सब रीसेट करें',
  'Back': 'पीछे',
  'Next: add your sources': 'आगे: अपने स्रोत जोड़ें',
  'Next: fill in the details': 'आगे: विवरण भरें',
  'Next: cost inputs': 'आगे: लागत इनपुट',
  'See your results': 'अपने परिणाम देखें',
  'See what to finish': 'क्या पूरा करना है देखें',
  'See the budget': 'बजट देखें',
  'Enter your monthly demand to continue': 'जारी रखने के लिए अपनी मासिक मांग दर्ज करें',
  'Add at least one source to continue': 'जारी रखने के लिए कम से कम एक स्रोत जोड़ें',
  "Fill each source's required (red) fields": 'हर स्रोत के आवश्यक (लाल) फ़ील्ड भरें',
  'Choose a district (or whole state) to estimate demand':
    'मांग का अनुमान लगाने के लिए जिला (या पूरा राज्य) चुनें',
  'Add facilities or equipment to see the budget':
    'बजट देखने के लिए सुविधाएँ या उपकरण जोड़ें',
  'Step 1 of 2 · fill these in order': 'चरण 1 / 2 · इन्हें क्रम से भरें',

  // ---- Output trays ----------------------------------------------------
  'Demand output': 'मांग परिणाम',
  'Costing output': 'लागत परिणाम',
  'Cost summary': 'लागत सारांश',
  'Cost comparison': 'लागत तुलना',
  'Shared overhead': 'साझा खर्च',
  'Coverage of demand': 'मांग की पूर्ति',
  'Compare scenarios': 'परिदृश्यों की तुलना',
  'Locked': 'लॉक',

  // ---- Sources ---------------------------------------------------------
  'PSA plant': 'पीएसए प्लांट',
  'LMO': 'एलएमओ (तरल ऑक्सीजन)',
  'Cylinders': 'सिलेंडर',
  'Concentrators': 'कॉन्संट्रेटर',
  'PSA plants': 'पीएसए प्लांट',
  'Oxygen concentrators': 'ऑक्सीजन कॉन्संट्रेटर',

  // ---- Field colour legend --------------------------------------------
  'Green — your value': 'हरा — आपका मान',
  'Yellow — pre-filled default, update with actual values if known':
    'पीला — पहले से भरा डिफ़ॉल्ट, ज्ञात हो तो असली मान डालें',
  'Red — required field, enter a value': 'लाल — आवश्यक फ़ील्ड, कोई मान दर्ज करें',

  // ---- Common controls / units ----------------------------------------
  'Show demand in': 'मांग इस इकाई में दिखाएँ',
  'Show cost per': 'प्रति इकाई लागत दिखाएँ',
  'Period': 'अवधि',
  'Yearly': 'वार्षिक',
  'Monthly': 'मासिक',
  'Annual': 'वार्षिक',
  'cu m': 'घन मीटर',
  'D-type cyl': 'डी-टाइप सिलेंडर',
  'kg': 'किग्रा',
  'Opex only': 'केवल परिचालन लागत',
  'Capex + Opex': 'पूँजी + परिचालन लागत',
  'Capex + opex': 'पूँजी + परिचालन लागत',
  'Incremental': 'अतिरिक्त इकाई',
  'Export to Excel': 'एक्सेल में निर्यात',
  'Import from Excel': 'एक्सेल से आयात',
  'clear': 'हटाएँ',
  'reset': 'रीसेट',
  'Required': 'आवश्यक',

  // ---- PSA panel -------------------------------------------------------
  'Power consumption': 'बिजली खपत',
  'Monthly run hours': 'मासिक चलने के घंटे',
  'Plant ownership': 'प्लांट का स्वामित्व',
  'Purchased': 'खरीदा गया',
  'On rent': 'किराए पर',

  // ---- State demand inputs --------------------------------------------
  'State': 'राज्य',
  'District': 'जिला',
  'Select district…': 'जिला चुनें…',
  'Whole state': 'पूरा राज्य',
  'Scenario': 'परिदृश्य',
  'Normal': 'सामान्य',
  'Pandemic': 'महामारी',

  // ---- Tour (walkthrough) ---------------------------------------------
  'Facility walkthrough': 'सुविधा वॉकथ्रू',
  'District / State walkthrough': 'जिला / राज्य वॉकथ्रू',
  'Presets are yours to change': 'डिफ़ॉल्ट मान आप बदल सकते हैं',
  'Step 1 · Monthly demand': 'चरण 1 · मासिक मांग',
  'Three ways to set demand': 'मांग तय करने के तीन तरीके',
  'Your demand estimate': 'आपकी मांग का अनुमान',
  'Step 2 · Add your sources': 'चरण 2 · अपने स्रोत जोड़ें',
  'Step 3 · Fill in the details': 'चरण 3 · विवरण भरें',
  'Shared facility costs': 'साझा सुविधा लागत',
  'A source panel': 'एक स्रोत पैनल',
  'Purchased vs on rent': 'खरीदा गया बनाम किराए पर',
  'Customize the presets (advanced)': 'डिफ़ॉल्ट बदलें (उन्नत)',
  'Your cost result': 'आपका लागत परिणाम',
  'The three cost views': 'तीन लागत दृश्य',
  'Trace any number': 'किसी भी संख्या का पता लगाएँ',
  'Export & import (Excel)': 'निर्यात और आयात (एक्सेल)',
  'You’re set!': 'हो गया!',
  'Step 1 · Estimate demand': 'चरण 1 · मांग का अनुमान',
  'Demand, drilled down': 'मांग, विस्तार से',
  'Step 2 · Cost inputs': 'चरण 2 · लागत इनपुट',
  'Your budget': 'आपका बजट',

  // ---- Footer ----------------------------------------------------------
  'This tool provides information to support your own decisions.':
    'यह टूल आपके अपने निर्णयों में सहायता के लिए जानकारी देता है।',

  // ---- Doc group headings & section titles (short) --------------------
  'Getting started': 'शुरुआत करें',
  'Using the Facility calculator': 'सुविधा कैलकुलेटर का उपयोग',
  'Using the District / State planner': 'जिला / राज्य प्लानर का उपयोग',
  'Saving, sharing & privacy': 'सहेजना, साझा करना और निजता',
  'What OxyCost does': 'OxyCost क्या करता है',
  'The two tools — which one do I use?': 'दो टूल — किसका उपयोग करूँ?',
  'The four oxygen sources': 'चार ऑक्सीजन स्रोत',
  'Facility calculator': 'सुविधा कैलकुलेटर',
  'District / State planner': 'जिला / राज्य प्लानर',
  'Basics': 'मूल बातें',
  'Shared': 'साझा',
  'Facility': 'सुविधा',
  'Checks': 'जाँच',
  'Units & conversions': 'इकाइयाँ और रूपांतरण',
  'Two ways to show cost': 'लागत दिखाने के दो तरीके',
  'Working out demand': 'मांग की गणना',
  'Shared costs': 'साझा लागत',
  'Reading the charts': 'चार्ट पढ़ना',
  'The planner': 'प्लानर',
}
