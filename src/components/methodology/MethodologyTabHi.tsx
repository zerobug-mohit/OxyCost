// Hindi version of the Methodology page (rendered when language = Hindi).
// Natural whole-paragraph Hindi. Formula code blocks, units, "facility",
// "OxyCost" and bracketed technical terms stay English. Wrapper is data-no-i18n
// so the DOM translator leaves it alone. #state / #knn ids kept for deep links.
import type { ReactNode } from 'react'
import { Collapsible } from '../shared/Collapsible'
import { DocCards, DocCard, Callout, FormulaCard, GroupHeading, FlowSteps } from './DocBits'

function Section({ n, icon, title, id, children, open }: { n: string; icon: string; title: string; id?: string; children: ReactNode; open?: boolean }) {
  return (
    <div id={id}>
      <Collapsible
        className="doc-section"
        defaultOpen={open}
        summary={
          <span className="doc-section-title">
            <span className="doc-num">{n}</span>
            <span className="doc-ico" aria-hidden>{icon}</span>
            {title}
          </span>
        }
      >
        {children}
      </Collapsible>
    </div>
  )
}

export function MethodologyTabHi() {
  return (
    <div className="methodology" data-no-i18n>
      <p className="doc-lead">
        यह पेज आँकड़ों के पीछे का गणित, डेटा कहाँ से आता है, और हम जो जाँच करते हैं — <strong>दोनों टूल</strong>{' '}
        के लिए — दिखाता है, ताकि कोई भी समझ सके कि कोई आँकड़ा कैसे निकला। यह उन बातों से शुरू होता है जो
        दोनों टूल में <em>साझा</em> हैं — इकाइयाँ, मांग, और हर स्रोत की लागत — फिर दिखाता है कि{' '}
        <strong>Facility कैलकुलेटर</strong> और <strong>ज़िला / राज्य प्लानर</strong> इन्हें कैसे इस्तेमाल
        करते हैं। बटन और स्क्रीन कैसे इस्तेमाल करें, इसके लिए <strong>इसे कैसे इस्तेमाल करें</strong> देखें।
        सब कुछ आपके डिवाइस पर चलता है और अपने-आप टेस्ट होता है।
      </p>

      {/* ================================================================ */}
      <GroupHeading step="मूल बातें" title="हर आँकड़ा किस पर टिका है" sub="वे बातें जो दोनों टूल में एक जैसी हैं।" />

      <Section n="1" icon="📏" title="इकाइयाँ और रूपांतरण" open>
        <p>
          अंदर, टूल <strong>घन मीटर (cu m) ऑक्सीजन गैस</strong> में काम करता है। आप{' '}
          <strong>ऑक्सीजन की मात्रा किसी भी इकाई में भर सकते हैं</strong> (cu m / D-type cylinders / kg;
          LMO के लिए Litre / KL / Nm³ भी) और टूल उन्हें बदल देता है। नतीजे भी cu m में, प्रति{' '}
          <strong>D-type cylinder</strong> (लगभग 7 cu m हर एक) या प्रति kg (1 kg लगभग 0.700 cu m) में
          दिखा सकते हैं — नतीजे के ऊपर वाले स्विच से। <strong>हर लागत GST सहित भरें</strong> — पहले से भरे
          मानों में GST शामिल है। LMO रिफिलिंग और हैंडलिंग में एक GST बॉक्स भी है (डिफ़ॉल्ट 0, यानी दिखाई
          कीमत में GST पहले से है); अगर आपका कोटेशन GST से पहले का हो तो इसे इस्तेमाल करें।
        </p>
        <table>
          <thead>
            <tr><th>से</th><th>में</th><th>कैसे</th></tr>
          </thead>
          <tbody>
            <tr><td>ऑक्सीजन गैस के लीटर</td><td>cu m</td><td><code>cu_m = litres / 1000</code></td></tr>
            <tr><td>LMO (तरल) के लीटर</td><td>cu m गैस</td><td><code>cu_m = lmo_litres × 0.861</code></td></tr>
            <tr><td>D-type cylinder</td><td>cu m</td><td><code>7 cu m each</code></td></tr>
            <tr><td>B-type cylinder</td><td>cu m</td><td><code>1.5 cu m each</code></td></tr>
            <tr><td>LPM (litres/min)</td><td>cu m / hr</td><td><code>cu_m_hr = lpm × 60 / 1000</code></td></tr>
            <tr><td>ऑक्सीजन के kg</td><td>cu m</td><td><code>cu_m ≈ kg × 0.700</code></td></tr>
            <tr><td>मीट्रिक टन (मांग)</td><td>cu m</td><td><code>1 MT = 750 cu m</code></td></tr>
          </tbody>
        </table>
      </Section>

      <Section n="2" icon="🔎" title="लागत दिखाने के दो तरीके">
        <p>दोनों टूल अलग सवालों के जवाब देते हैं, इसलिए लागत अलग तरह से दिखाते हैं:</p>
        <DocCards cols={2}>
          <DocCard icon="🏥" title="Facility · प्रति इकाई लागत" chip="3 नज़रिये">
            facility टैब हर स्रोत के लिए ₹ प्रति cu m दिखाता है। एक स्विच बदलता है कि उसमें क्या शामिल है:{' '}
            <strong>Opex only</strong> = चलाने की लागत, अगर उपकरण पहले से आपका हो; <strong>Capex + Opex</strong>{' '}
            = चलाने की लागत + खरीदने की लागत (उम्र में बाँटी हुई), नया खरीदने पर; <strong>Incremental</strong>{' '}
            = बस थोड़ी और ऑक्सीजन की लागत।
          </DocCard>
          <DocCard icon="🗺️" title="ज़िला · बजट" chip="सालाना / मासिक">
            प्लानर सब कुछ जोड़कर एक <strong>बजट</strong> बनाता है, जो साल या महीने के हिसाब से दिखता है
            (मासिक = सालाना ÷ 12)। एक-बार के पहले-साल के खर्च (जैसे शुरुआती ट्रेनिंग) उन खर्चों से अलग दिखाए
            जाते हैं जो हर साल दोहराते हैं।
          </DocCard>
        </DocCards>
      </Section>

      {/* ================================================================ */}
      <GroupHeading step="साझा" title="कितनी ऑक्सीजन चाहिए, यह निकालना" sub="वही गणित facility के चरण 1 और प्लानर के चरण 1 — दोनों को चलाता है।" />

      <Section n="3" icon="🩺" title="मांग निकालना">
        <p>
          मांग एक WJCF वर्कबुक से आती है। इसे मीट्रिक टन (MT) में नापा जाता है; 1 MT = 750 cu m।
        </p>
        <h4>3a. वार्ड-दर-वार्ड (facility)</h4>
        <p>
          18 वार्ड में से हर एक के लिए, महीने के ऑक्सीजन मरीज़ों को तीन स्तरों (कम, मध्यम, ज़्यादा) में बाँटा
          जाता है। हर स्तर का एक फ़्लो रेट, दिनों की संख्या, और मरीज़ों का हिस्सा होता है:
        </p>
        <FormulaCard
          reads="हर वार्ड के लिए: मरीज़ × उनका हिस्सा × फ़्लो × दिन, को MT में बदला जाता है। एक महीना भरें; बाकी साल टूल मौसमी स्तरों से भर देता है।"
          code={DEMAND_CALC}
        />
        <Callout>
          आप जो मरीज़-संख्याएँ भरते हैं वे आपके चुने एक महीने की होती हैं। बाकी महीने मौसम के हिसाब से ऊपर-नीचे
          करके साल भर के लिए जोड़ दिए जाते हैं, इसलिए आपका भरा महीना ठीक वैसा ही रहता है। महामारी पूरी चीज़ को
          एक surge गुणक से बढ़ा देती है (डिफ़ॉल्ट ×5)।
        </Callout>
        <h4>3b. भर्ती से (facility archetype और ज़िले का कुल)</h4>
        <p>
          हर facility 25 <strong>समूहों</strong> में से किसी एक में आती है (राज्य × facility का प्रकार ×
          कितनी भर्ती)। हर समूह का एक <code>oxygen per admission</code> आँकड़ा होता है, इसलिए किसी facility
          की मांग = <code>महीने की भर्ती × वह आँकड़ा</code>। facility टैब का <strong>भर्ती से</strong> विकल्प
          इसे सीधे इस्तेमाल करता है। <strong>प्लानर का चरण 1</strong> आपके चुने राज्य या ज़िले की हर facility
          की तय मांग जोड़ देता है, और आप इसे हर facility तक खोल सकते हैं। सिर्फ़ मिले-जुले कुल और
          per-admission आँकड़े ही टूल में मौजूद हैं।
        </p>
      </Section>

      {/* ================================================================ */}
      <GroupHeading step="साझा" title="हर ऑक्सीजन स्रोत की लागत" sub="हर स्रोत का गणित दोनों टूल इस्तेमाल करते हैं: facility इन लागतों की तुलना करता है; प्लानर इन्हें हर facility पर जोड़ता है।" />

      <Section n="4" icon="🏭" title="PSA प्लांट">
        <p>
          PSA प्लांट मौके पर ऑक्सीजन बनाता है। यह सिर्फ़ तभी ऑक्सीजन बनाता है जब इसका कंप्रेसर चले — जितने घंटे
          प्लांट चालू रहता है उसका लगभग 90% — और कंप्रेसर ज़्यादातर बिजली इस्तेमाल करता है, जबकि बाकी प्लांट
          चालू रहने के सभी घंटों में बची बिजली लेता है। अगर प्लांट पूरी क्षमता से कम चले तो कम ऑक्सीजन बनती है
          पर बिजली लगभग उतनी ही लगती है, इसलिए प्रति इकाई लागत बढ़ जाती है। प्लांट या तो{' '}
          <strong>खरीदा हुआ</strong> होता है (उसकी कीमत उम्र में बाँटी जाती है — सिर्फ़ खरीदने वाले नज़रिये में
          गिनी जाती है) या <strong>किराए पर</strong> (तय महीने का शुल्क)।
        </p>
        <FormulaCard
          reads="ऑक्सीजन तब बनती है जब कंप्रेसर चले। बिजली = कंप्रेसर + बाकी प्लांट। कुल महीने की लागत ÷ बनी ऑक्सीजन = प्रति cu m लागत।"
          code={PSA_CALC}
        />
      </Section>

      <Section n="5" icon="🛢️" title="LMO (तरल ऑक्सीजन)">
        <p>
          तरल ऑक्सीजन का दाम कुछ हद तक इस्तेमाल की मात्रा से (रिफिलिंग, हैंडलिंग) और कुछ महीने के हिसाब से
          (टैंक किराया) लगता है। टैंक का आकार (KL) सिर्फ़ संदर्भ के लिए है — लागत इस पर निर्भर करती है कि आप
          कितना इस्तेमाल करते हैं। <code>0.861</code> आँकड़ा तरल के प्रति लीटर दाम को प्रति cu m गैस के दाम में
          बदल देता है। एक <strong>boil-off नुकसान %</strong> (डिफ़ॉल्ट 0) लागत थोड़ी बढ़ा देता है, क्योंकि कुछ
          इस्तेमाल से पहले ही उड़ जाता है। टैंक <strong>किराए पर</strong> या <strong>खरीदा हुआ</strong> होता है
          (कीमत उम्र में बाँटी जाती है)।
        </p>
        <FormulaCard
          reads="रिफिलिंग और हैंडलिंग प्रति cu m (boil-off के लिए थोड़ी ज़्यादा) + किराया या खरीद लागत; ÷ दी गई ऑक्सीजन = प्रति cu m लागत।"
          code={LMO_CALC}
        />
        <Callout>
          रिफिल और हैंडलिंग के GST बॉक्स डिफ़ॉल्ट 0 पर हैं (पहले से भरे दाम में GST शामिल है); फ़ॉर्मूला (1 +
          वह GST) से गुणा करता है ताकि आप GST से पहले का कोटेशन भी भर सकें।
        </Callout>
      </Section>

      <Section n="6" icon="🧯" title="सिलेंडर">
        <p>
          सिलेंडर की ज़्यादातर लागत रिफिल का दाम उसके आकार से भाग देने पर आती है, साथ में{' '}
          <strong>ढुलाई</strong> (प्रति फेरा लागत ÷ प्रति फेरा सिलेंडर)। अगर सिलेंडर आपके अपने हों, तो खरीद
          कीमत उनकी उम्र में बाँटी जाती है, और सुरक्षा जाँच (हर 5 साल) भी जोड़ी जाती है।
        </p>
        <FormulaCard
          reads="(रिफिल + ढुलाई) प्रति सिलेंडर ÷ सिलेंडर का आकार, साथ में बाँटी गई खरीद और सुरक्षा-जाँच लागत।"
          code={CYL_CALC}
        />
      </Section>

      <Section n="7" icon="🛏️" title="ऑक्सीजन कॉन्संट्रेटर">
        <p>
          सिर्फ़ वे इकाइयाँ जो <strong>लगी हुई और चालू</strong> हैं, ऑक्सीजन बनाती हैं — इन्हें{' '}
          <strong>ज़्यादा इस्तेमाल (8+ घं/दिन)</strong> और <strong>कम इस्तेमाल (8 घं/दिन से कम)</strong> में
          बाँटा जाता है। कॉन्संट्रेटर कम शुद्धता, कम फ़्लो वाली ऑक्सीजन बनाते हैं, इसलिए नतीजों में हमेशा एक
          नोट रहता है कि ये सिर्फ़ अतिरिक्त सहारे के लिए हैं। बिजली ही एकमात्र चलाने की लागत है।
        </p>
        <FormulaCard
          reads="सिर्फ़ चालू इकाइयाँ ऑक्सीजन बनाती हैं। बिजली + खरीद लागत + देखरेख ÷ बनी ऑक्सीजन = प्रति cu m लागत।"
          code={OC_CALC}
        />
      </Section>

      <Section n="8" icon="🧾" title="साझा लागत">
        <p>
          कुछ लागतें किसी भी स्रोत से ऑक्सीजन मिले, लगती ही हैं — <strong>ऑक्सीजन तकनीशियन / स्टाफ़ का वेतन</strong>{' '}
          और <strong>पाइपलाइन (MGPS)</strong> की देखरेख। facility टैब पर आप इन्हें एक बार भरते हैं और ये पूरी
          ऑक्सीजन पर बराबर बाँट दी जाती हैं; प्लानर में ये अपनी अलग बजट पंक्तियाँ होती हैं।
        </p>
        <FormulaCard
          reads="स्टाफ़ + पाइपलाइन की लागत पूरी ऑक्सीजन पर बराबर बाँटी जाती है — वही राशि हर स्रोत पर पड़ती है।"
          code={SHARED_CALC}
        />
        <Callout>
          चूँकि वही राशि हर स्रोत पर पड़ती है, इससे यह नहीं बदलता कि कौन-सा स्रोत सबसे सस्ता है — पर facility
          की कुल लागत के लिए यह मायने रखती है।
        </Callout>
      </Section>

      {/* ================================================================ */}
      <GroupHeading step="Facility" title="Facility कैलकुलेटर" sub="एक facility के लिए स्रोतों की लागत को जोड़ना।" />

      <Section n="9" icon="⚖️" title="तुलना को जोड़ना">
        <p>
          आपके भरे हर स्रोत की लागत ऊपर के गणित से निकाली जाती है, जिससे उसकी{' '}
          <strong>महीने की ऑक्सीजन</strong> और <strong>₹ प्रति cu m</strong> मिलती है। फिर टूल:
        </p>
        <DocCards cols={3}>
          <DocCard icon="🏅" title="स्रोतों को क्रम देता है">
            जो स्रोत ऑक्सीजन बनाते हैं उन्हें प्रति इकाई लागत से क्रम में लगाया जाता है, और सबसे सस्ता —{' '}
            <em>साझा लागत समेत</em> — निष्कर्ष के रूप में दिखाया जाता है।
          </DocCard>
          <DocCard icon="🎯" title="सप्लाई जाँचता है">
            coverage पट्टी जोड़ती है कि हर स्रोत कितना दे सकता है और उसे चरण 1 की मांग से मिलाती है (करीब
            100% रखें), और कमी या फ़ालतू क्षमता का निशान लगाती है।
          </DocCard>
          <DocCard icon="🧾" title="साझा लागत जोड़ता है">
            facility का कुल = हर स्रोत की महीने की लागत + साझा स्टाफ़ / पाइपलाइन लागत (§8), जो अलग दिखती है
            ताकि क्रम पर असर न पड़े।
          </DocCard>
        </DocCards>
        <p className="muted small">
          परिदृश्य (scenarios) इनपुट का पूरा सेट सेव करके ये आँकड़े अलग से फिर निकालते हैं, ताकि आप कुछ सेटअप
          की साथ-साथ तुलना कर सकें।
        </p>
      </Section>

      <Section n="10" icon="📊" title="चार्ट पढ़ना">
        <DocCards cols={3}>
          <DocCard icon="📉" title="लागत बनाम कितना इस्तेमाल">
            हर रेखा दिखाती है कि अगर कोई स्रोत नीचे वाले अक्ष की मात्रा दे, तो उसकी प्रति इकाई लागत क्या
            होगी। जहाँ रेखाएँ मिलती हैं, वहीं सस्ता स्रोत बदलता है। डैश वाली रेखा आपकी मांग है; कोई रेखा उस
            स्रोत की सीमा पर रुक जाती है।
          </DocCard>
          <DocCard icon="📊" title="प्रति इकाई लागत, स्रोत के हिसाब से">
            हर स्रोत की प्रति इकाई लागत, क्रम में लगे बार के रूप में।
          </DocCard>
          <DocCard icon="🧱" title="पैसा किसमें जाता है">
            हर स्रोत की महीने की लागत किन चीज़ों से बनती है — जो बार ज़्यादातर तय लागत का हो, वह ज़्यादा
            इस्तेमाल पर प्रति इकाई काफ़ी सस्ता हो जाता है।
          </DocCard>
        </DocCards>
      </Section>

      {/* ================================================================ */}
      <GroupHeading step="ज़िला / राज्य" title="प्लानर" sub="वही स्रोत-लागत कई facilities पर इस्तेमाल करना, और यह जाँचना कि सप्लाई ज़रूरत पूरी करती है।" />

      <Section n="11" icon="🗺️" title="बजट कैसे बनता है" id="state">
        <p>
          चरण 1 के ज़रूरत निकालने (§3b) के बाद, चरण 2 बजट बनाता है। आप या तो बताते हैं कि हर{' '}
          <strong>आकार</strong> की कितनी facilities हैं (<strong>आकार से</strong>) या अपने{' '}
          <strong>उपकरण का कुल</strong> (<strong>सीधे</strong>)। बजट तीनों सर्वे किए राज्यों के मिले-जुले
          डेटा से बनता है — यह आकार पर निर्भर करता है, और चरण 1 में चुना राज्य / ज़िला <em>ज़रूरत</em> तय
          करता है, लागत की दरें नहीं।
        </p>

        <h4>11a. आकार क्यों, facility का प्रकार क्यों नहीं</h4>
        <p>
          सर्वे में facility का प्रकार हमेशा दर्ज नहीं हुआ, पर ऑक्सीजन-बेड की गिनती दर्ज हुई — जो{' '}
          <strong>आकार</strong> का एक सीधा नाप है — इसलिए टूल उसी का इस्तेमाल करता है। 92 facilities में से{' '}
          <strong>81</strong> के पास काम-लायक बेड गिनती थी और वे यहाँ इस्तेमाल हुई हैं; बाकी 11 के पास कोई
          गिनती नहीं थी और उन्हें आकार से नहीं रखा जा सकता (डेटा की कमी, न कि ख़राब डेटा)।
        </p>

        <h4 id="knn">11b. आम उपकरण कैसे निकाला जाता है</h4>
        <p>
          किसी दिए आकार की facility के लिए उपकरण भरने के लिए, टूल <strong>आकार में सबसे नज़दीक की असली सर्वे
          की गई facilities</strong> को देखता है और उनमें जो आम है वह ले लेता है — तीन चरणों में:
        </p>
        <FlowSteps
          steps={[
            { icon: '📏', title: 'मिलते-जुलते आकार की facilities खोजें', body: 'ऑक्सीजन-बेड गिनती से मिलान — लगभग उसी आकार की सर्वे की गई facilities, तीनों राज्यों से।' },
            { icon: '⚖️', title: 'नज़दीक वालों को ज़्यादा गिनें', body: 'आकार में जितनी नज़दीक facility, उतनी ज़्यादा गिनती। बहुत अलग आकार मुश्किल से गिने जाते हैं।' },
            { icon: '📋', title: 'जो आम हो वह लें', body: 'हर सेटअप कितनी बार आता है (PSA, LMO, सिलेंडर…) और आम मात्राएँ — वही भरा हुआ आकार बनता है, जो बजट में जुड़ता है।' },
          ]}
        />
        <Callout>
          कुछ भी मनगढ़ंत नहीं — हर भरा मान “मिलते-जुलते आकार की असली facilities के पास आमतौर पर जो होता है”
          वही है, और आप इसमें से कुछ भी बदल सकते हैं। सटीकता पर सबसे ज़्यादा असर इसी का है।
        </Callout>
        <p className="muted small">
          समीक्षकों के लिए: नज़दीकी log bed-size पर एक Gaussian weight से नापी जाती है, <code>w = exp(−(Δln(beds) / h)²)</code>{' '}
          (<code>h ≈ 0.5</code> के साथ)। हर आकार में चार तक सेटअप मिलते हैं (PSA+LMO · सिर्फ़ PSA · सिर्फ़ LMO ·
          सिलेंडर/कॉन्संट्रेटर); कोई स्रोत होने की संभावना = पड़ोसियों का weighted हिस्सा जिनके पास वह है, और
          उसकी मात्रा = उनमें से weighted बीच का मान — तो किसी आकार का कुल उसकी facilities का औसत होता है। जो
          मात्राएँ सर्वे नाप नहीं सका, वे आकार-आधारित मानकों से आती हैं। यह एक k-nearest-neighbours तरीका है।
        </p>

        <h4>11c. दरें</h4>
        <p>
          जो दरें सर्वे ने नापीं — सिलेंडर रिफिल के दाम (D/B) और तकनीशियन का वेतन — वे तीनों राज्यों का
          मिला-जुला बीच का मान इस्तेमाल करती हैं। जो नहीं नापीं (बिजली, उपकरण के मूल्य, मेंटेनेंस %, ट्रेनिंग
          और प्रचार) वे राष्ट्रीय डिफ़ॉल्ट इस्तेमाल करती हैं। इन सबको आप <strong>राज्य की दरें</strong> में
          बदल सकते हैं।
        </p>

        <h4>11d. उपकरण सीधे भरना</h4>
        <p>
          यह आपके भरे कुल को उन्हीं दरों पर लागत में बदलता है। PSA आकार से भरा जाता है (200 / 500 / 1000 /
          1500 LPM, और कस्टम आकार) — <strong>कुल प्लांट</strong>, <strong>कितने चालू हैं</strong> और प्रति
          दिन घंटे के साथ। सिर्फ़ चालू प्लांट ऑक्सीजन बनाते और बिजली इस्तेमाल करते हैं, जबकि मेंटेनेंस और
          मरम्मत <strong>सभी</strong> प्लांट पर लगती है। PSA बिजली और उपकरण-मूल्य के डिफ़ॉल्ट facility
          कैलकुलेटर के आकार-अनुसार आँकड़ों से मिलते हैं।
        </p>
      </Section>

      <Section n="12" icon="🧮" title="बजट जोड़ना और सप्लाई जाँचना">
        <h4>12a. बजट जोड़ना</h4>
        <p>
          हर लागत पंक्ति प्रति आम facility के लिए निकाली जाती है (जब आप आकार से भरते हैं, तो हर एक को इस हिसाब
          से weight दिया जाता है कि उस आकार की कितनी facilities के पास वह स्रोत है), फिर facilities की संख्या
          से गुणा करके जोड़ी जाती है। एक contingency जोड़ी जाती है, और एक-बार के पहले-साल के खर्च (शुरुआती
          ट्रेनिंग) दोहराने वाले खर्चों से अलग दिखाए जाते हैं।
        </p>
        <FormulaCard
          reads="प्रति पंक्ति लागत × facilities की संख्या, आकारों पर जोड़ी गई; + contingency; दोहराने वाले बनाम एक-बार में बँटा; ÷ चालू बेड से प्रति-बेड आँकड़ा।"
          code={BUDGET_CALC}
        />

        <h4>12b. सप्लाई ज़रूरत पूरी करती है या नहीं, यह जाँचना</h4>
        <p>
          <strong>coverage पट्टी</strong> इलाके की ज़रूरत (चरण 1) की तुलना उस ऑक्सीजन से करती है जो वही
          उपकरण साल भर में असल में बना या दे सकता है — यह एक झटपट जाँच है कि पर्याप्त है या नहीं। यह उसी
          उपकरण से बनती है जिसकी लागत बजट में है:
        </p>
        <FormulaCard
          reads="सालाना सप्लाई = PSA उत्पादन + गैस में बदली LMO + सिलेंडर रिफिल + कॉन्संट्रेटर उत्पादन; coverage = सप्लाई ÷ ज़रूरत।"
          code={SUPPLY_CALC}
        />
        <p className="muted small">
          यह एक मोटी सालाना जाँच है (उपकरण मान लिए घंटों पर चलते हुए), गारंटी नहीं। डेटा बिना नाम या जगह के
          टूल में मौजूद है, और सब कुछ आपके डिवाइस पर चलता है।
        </p>
      </Section>

      {/* ================================================================ */}
      <GroupHeading step="जाँच और डेटा" title="जाँच, मान्यताएँ और Excel" sub="आँकड़े कैसे टेस्ट होते हैं, हम क्या मानते हैं, और अपना काम अंदर-बाहर ले जाना — दोनों टूल के लिए।" />

      <Section n="13" icon="✅" title="जाँच">
        <p>गणित को ज्ञात जवाबों के मुक़ाबले अपने-आप टेस्ट किया जाता है। सभी अभी <span className="badge-ok">pass</span> हैं:</p>
        <table>
          <thead>
            <tr><th>टेस्ट</th><th>अपेक्षित</th><th /></tr>
          </thead>
          <tbody>
            <tr><td>PSA 1000 LPM / 300 run hrs / 0.90 compressor-run</td><td>16,200 cu m · ₹15.29 खरीद सहित · ₹11.43 सिर्फ़ चलाने की</td><td><span className="badge-ok">pass</span></td></tr>
            <tr><td>LMO refilling (base 15.22, +12% GST)</td><td>₹19.80 / cu m (15.22 × 1.12 ÷ 0.861)</td><td><span className="badge-ok">pass</span></td></tr>
            <tr><td>LMO handling (base 16.78, +18% GST)</td><td>₹23.00 / cu m (16.78 × 1.18 ÷ 0.861)</td><td><span className="badge-ok">pass</span></td></tr>
            <tr><td>Cylinder D-type @ ₹395 refill</td><td>₹56.43 / cu m (refill ÷ 7)</td><td><span className="badge-ok">pass</span></td></tr>
            <tr><td>Cylinder B-type @ ₹150 refill</td><td>₹100 / cu m (refill ÷ 1.5)</td><td><span className="badge-ok">pass</span></td></tr>
          </tbody>
        </table>
        <p className="muted small">
          ये टेस्ट इन फ़ॉर्मूलों, इकाई रूपांतरणों, लागत-बनाम-इस्तेमाल चार्ट, क्रम और सारांश, साझा-लागत बँटवारे,
          ज़िले के बजट और उसकी सप्लाई जाँच, Excel सेव/लोड (इनपुट और परिदृश्य), और मुश्किल हालात (शून्य run
          hours, सप्लाई कमी, कोई ख़राब आँकड़ा नहीं) को कवर करते हैं।
        </p>
      </Section>

      <Section n="14" icon="⚠️" title="मान्यताएँ, डेटा और निजता">
        <ul>
          <li>
            पहले से भरे मान WJCF के ऑक्सीजन सर्वे — <strong>भारत के तीन राज्यों की 92 facilities</strong> —
            से आते हैं: डिफ़ॉल्ट LMO टैंक किराया, कंप्रेसर का लगभग 90% समय चलना, और सिलेंडर रिफिल के दाम। PSA
            बिजली के डिफ़ॉल्ट आकार-अनुसार प्रकाशित आँकड़ों से आते हैं (200→30, 500→45, 1000→65, 1500→75 kW);
            कॉन्संट्रेटर की कीमतें बाज़ार के अनुमान हैं। अपने हिसाब से इनमें से कुछ भी बदलें।
          </li>
          <li>खरीद लागत उपकरण की उम्र में बराबर बाँटी जाती है। लागतें GST सहित भरी जाती हैं; LMO रिफिलिंग/हैंडलिंग में एक GST बॉक्स है।</li>
          <li>जब PSA प्लांट पूरी क्षमता से कम चले, तो कम ऑक्सीजन बनती है पर बिजली लगभग उतनी ही लगती है, इसलिए प्रति इकाई लागत बढ़ती है। LMO boil-off नुकसान आप भरते हैं (आमतौर पर 1–5% प्रति माह)।</li>
          <li>लागत-बनाम-इस्तेमाल चार्ट मानता है कि एक स्रोत दी गई मात्रा तक बढ़ सकता है; असल में facilities मिश्रण इस्तेमाल करती हैं। बहुत ज़्यादा मांग पर असल इस्तेमाल मान से ज़्यादा हो सकता है, इसलिए वे आँकड़े मोटे-मोटे हैं। क्रॉसओवर को निर्देश नहीं, मार्गदर्शन मानें।</li>
          <li>आँकड़े योजना के लिए अनुमान हैं, सप्लायर के कोटेशन की जगह नहीं।</li>
          <li>
            कुछ तकनीकी आँकड़ों की मिलती-जुलती facilities से तुलना की जाती है और असामान्य लगने पर निशान लगाया
            जाता है — सिर्फ़ इशारा, नतीजा कभी नहीं बदलता। पैसे और वेतन के आँकड़े तुलना या साझा नहीं किए जाते।
            डेटा तीनों राज्यों का मिला-जुला है, बिना नाम या जगह के टूल में मौजूद है, और सब कुछ आपके डिवाइस पर
            चलता है।
          </li>
        </ul>
      </Section>

      <Section n="15" icon="📄" title="Excel में सेव करें (और वापस लोड करें)">
        <p>
          हर टैब एक Excel फ़ाइल बनाता है जिसमें आपके इनपुट और गणनाएँ साथ होती हैं। गणना वाले सेल{' '}
          <strong>असली Excel फ़ॉर्मूले</strong> हैं जो इनपुट सेल की ओर इशारा करते हैं, इसलिए Excel में कोई
          इनपुट बदलें तो कुल वहीं अपडेट हो जाते हैं। जब आप ज़िला आकार से भरते हैं, तो प्रति-facility आँकड़े
          मॉडल से आते हैं, इसलिए वे तय मान होते हैं जबकि कुल live फ़ॉर्मूले रहते हैं। सेव किए कोई भी{' '}
          <strong>परिदृश्य (scenarios)</strong> अलग शीट बन जाते हैं। फ़ाइल लोड करने पर हर शीट वापस पढ़ी जाती
          है और टूल भर जाता है — इनपुट और परिदृश्य दोनों। सेव/लोड दोनों टैब के लिए टेस्ट किया गया है।
        </p>
      </Section>
    </div>
  )
}

const DEMAND_CALC = `For each ward w (O2 patients_w for the CHOSEN month), per severity c ∈ {low, mod, high}:
  wardMT = Σ_c  patients_w × mix%_{w,c} × flow_{w,c}(LPM) × duration_{w,c}(days) × minsPerDay
                ÷ mtConversion              (minsPerDay = 1440, mtConversion = 750,000)
chosen-month demand = Σ_w wardMT            (× pandemicSurge if scenario = Pandemic)
annual  = chosen-month × (Σ seasonFactor ÷ seasonFactor[chosen month])
month m = annual × seasonFactor[m] ÷ Σ seasonFactor   (chosen month reads back exactly)
cu m    = MT × 750`

const PSA_CALC = `production_hours = run_hours × compressor_run_fraction   (default 0.90)
o2_cu_m          = production_hours × 60 × capacity_LPM × utilization / 1000

compressor_kW = power_KW × compressor_power_fraction        (default 0.90)
bop_kW        = power_KW × (1 − compressor_power_fraction)
electricity_kWh = compressor_kW × production_hours + bop_kW × run_hours
electricity_usage = electricity_kWh × rate_per_kWh          (variable)

maintenance   = AMC_annual / 12     (AMC defaults to 3.27% × plant cost)
consumables   = consumables_annual / 12
rental        = monthly_rent              (if RENTED; else 0)
depreciation  = plant_cost / life_years / 12   (if OWNED; else 0)
total_monthly = electricity_usage + electricity_fixed
                + maintenance + repairs + consumables + rental + depreciation
                (technician / staff pay is a SHARED cost — see §8)

per_cu_m (Capex + Opex) = total_monthly / o2_cu_m
per_cu_m (Opex only)       = (total_monthly − depreciation) / o2_cu_m
per_cu_m (Incremental)    = electricity_usage / o2_cu_m`

const LMO_CALC = `volume = delivered cu m (entered in cu m / Nm³ / Litre / KL / kg, auto-converted)
loss_factor = 1 / (1 − boil_off_loss)         (you buy more than you deliver)

refilling_per_cu_m = refill_base × (1 + refill_gst) / 0.861
handling_per_cu_m  = handling_base × (1 + handling_gst) / 0.861
total_refilling    = refilling_per_cu_m × volume × loss_factor
total_handling     = handling_per_cu_m × volume × loss_factor
rental             = monthly_rent              (if RENTED; else 0)
depreciation       = tank_cost / life_years / 12   (if OWNED; else 0)
total_monthly      = rental + total_refilling + total_handling + depreciation
                     (operator pay is a SHARED cost — see §8)

per_cu_m (Capex + Opex) = total_monthly / volume
per_cu_m (Opex only)       = (total_monthly − depreciation) / volume
per_cu_m (Incremental)    = (refilling_per_cu_m + handling_per_cu_m) × loss_factor`

const CYL_CALC = `volume_per_cylinder = 7 (D-type) or 1.5 (B-type)
monthly_volume      = count × volume_per_cylinder
transport_per_cyl   = transport_per_trip / cylinders_per_trip
running_per_cu_m    = (refill_cost + transport_per_cyl) / volume_per_cylinder
buying_monthly      = owned × purchase / (life_years × 12)
safety_test_monthly = owned × test_cost / (interval_years × 12)
total_monthly       = refills + transport + buying_monthly + safety_test_monthly

per_cu_m (Capex + Opex) = total_monthly / monthly_volume
per_cu_m (Opex only)       = (refills + transport + safety_test_monthly) / monthly_volume
per_cu_m (Incremental)    = running_per_cu_m   (each cylinder is a fresh refill + trip)`

const OC_CALC = `Only SET-UP & WORKING units make oxygen, split into heavy-use / light-use.
daily_unit_hours = heavy_units × heavy_hours + light_units × light_hours
monthly_unit_hrs = daily_unit_hours × days_per_month
o2_cu_m          = monthly_unit_hrs × output_LPM × 60 / 1000
electricity      = monthly_unit_hrs × (power_W / 1000) × rate
depreciation     = units × price / (life_years × 12)
maintenance      = units × maintenance_per_unit / 12
total_monthly    = electricity + depreciation + maintenance

per_cu_m (Capex + Opex) = total_monthly / o2_cu_m
per_cu_m (Opex only)       = (electricity + maintenance) / o2_cu_m
per_cu_m (Incremental)    = electricity / o2_cu_m`

const SHARED_CALC = `shared_monthly = staff_pay
                 + (MGPS_AMC_annual + MGPS_maintenance_annual) / 12
                 + other_shared
shared_per_cu_m = shared_monthly / total_oxygen_delivered

Total cost of any source = source_per_cu_m + shared_per_cu_m
(the same shared amount applies to every source, so it does NOT change which
source is cheapest — but it matters for the facility's total cost.)`

const BUDGET_CALC = `Per typical facility of a size, each cost line's yearly cost, e.g.
  electricity_PSA = (share with PSA) × plants × hrs/day × 365 × power_kWh × rate
  refill_cyl      = (share with cyl) × refills/mo × 12 × refill_rate
  ... (LMO refill, maintenance, repairs, staff, training, outreach) ...
size_total  = (Σ lines) × number_of_facilities_of_that_size   (direct: from your totals)
subtotal    = Σ over sizes
contingency = subtotal × contingency%
total       = subtotal + contingency
one_off     = first-year lines (initial training)
repeating   = total − one_off
cost_per_working_bed = total / Σ working_beds`

const SUPPLY_CALC = `Yearly oxygen SUPPLY (cu m/yr), added up over the equipment:
  PSA   = working_plants × capacity_LPM × 60 × hrs_per_day × 365 / 1000
  LMO   = yearly_KL × 1000 × 0.861            (liquid litres → cu m of gas)
  Cyl   = (D_refills×7 + B_refills×1.5 + A_refills×0.7) per month × 12
  OC    = unit_hours_per_day × 60 × 5 LPM × 365 / 1000
by size: each source × the share of facilities that have it, added over sizes.
supply_MT = supply_cu_m / 750
coverage%  = supply / need   (same % whether shown yearly or monthly)`
