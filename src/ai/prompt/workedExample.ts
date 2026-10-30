/**
 * The owner's Question 1 session (2026-10-29), condensed: urn of 3 red and 5
 * black balls, 3 drawn together, P(exactly one red). Tutor messages are the
 * session's darija (lightly shortened); student answers are verbatim. The
 * numbers belong to THIS urn only; the tutor must not reuse them.
 * reviewed: false.
 */
export const WORKED_EXAMPLE = `[1 plan] Tutor: «الصندوق فيه ثلاثة حمر وخمسة كحل، نجبدو ثلاثة كور مع بعض. السؤال: قدّاش احتمال نلقاو حمراء وحدة بالضبط؟ ما نحسبو حتى حاجة توّا. الخطوات هاذم مخلّطين: رتّبهم: شنوّة نعملو الأول، وشنوّة بعدو، وشنوّة في الآخر؟» (input order: three cards)
Student: C,B,A  -> right order.
[2 total] Tutor: «صحيح. الخطة هاذي تبقى قدّامك في كل السؤال. أنت هنا: الأول. قدّاش من تيراج ممكن؟ اكتب الحساب كيما تكتبو في الورقة. وكان ما تعرفش من وين تبدا، اكتب «ما نعرفش»: الجواب هذا مفيد لينا.»
Student: "7asb ma fi mo5i bch ne7sb lkol gadech li houma 8+3 =11 o madem bch nejbdou 3 na3ml haka 11*10*9 , kn jena bch nejbdou 4 na3ml 11*10*9*8"
[3 test his rule] Tutor: «شفت كيفاش تفكّر: تبدا من عدد الكور، وتنقص بواحد في كل مرّة، وعدد الأرقام يساوي عدد الكور اللي نجبدو. هاذي فكرة صحيحة، وعمّمتها بروحك. نحب نختبرو الرقم اللي تبدا بيه.» math: 8 + 3 = 11 «نجرّبو قاعدتك على صندوق صغير فيه أربعة كور a b c d، نجبدو كورتين بالترتيب. سؤال وحيد: طبّق قاعدتك، وبعدها اكتب كل النتائج بالحروف وعدّهم. الرقمين متطابقين؟»
Student: "7asb 9a3di houma 4 o bch nejbdou 2 ya3ni 4*3 =12 , taoa bl7rouf : ab,ac,ad,ba,bc,bd,ca,cb,cd , bl7rouf lgit'hm 9"
[4 two numbers that disagree] Tutor: «كتبت 4×3 = 12، وبالحروف لقيت 9: رقمين مختلفين لنفس السؤال. لاحظت حاجة: هالمرّة بدّيت من عدد الكور في الصندوق، موش من 4 + 2. سؤال وحيد: في قائمتك، قدّاش واحد يبدا بـ a؟ وبـ b؟ وبـ c؟ وبـ d؟»
Student: "oh sorry nsit d : da,db,dc ... ana 8lat no9sd 3adad lkwer fi sondou9 ya3ni 8*7*6"  -> he found both slips himself.
[5 order or together] Tutor: «مسكت غلطتين بروحك. قاعدتك خدمت: 8 × 7 × 6 يعدّ التيراجات بالترتيب. في سؤالنا نجبدو الكور مع بعض. سؤال وحيد: كي نجبدو a و b مع بعض، ab و ba نفس التيراج ولا تيراجين؟ وعلاش؟»
Student: "kn tartib yhem mahmch nafs tirage kn tartib ma yhemch houma nafs tirage"
[6-7 his rule, then the link] Tutor: «قلتها بصيغة قاعدة، وهي صحيحة. توّا اكتب قائمة التيراجات المختلفة من كورتين مع بعض.» Student: "ab,ac,ad,bc,bd,cd = 6". Tutor: «ستّة، صحيح، وما ضيّعتش حتى وحدة. عندك رقمين لنفس الصندوق: بالترتيب، ومع بعض.» math: 12 and 6 (two math blocks, each under its Arabic label) «سؤال وحيد: شنوّة العلاقة بين الرقمين؟»
Student: "ya3ni b tartib dima *2 mn m3a b3adhhm"
[8 test the claim "always"] Tutor: «في الكورتين قاعدتك صحيحة. قلت "دايما"، نختبروها: نجبدو ثلاثة كور من نفس الصندوق. بالترتيب 4 × 3 × 2 = 24، وبقاعدة "دايما ×2" مع بعض يكون 12. سؤال وحيد: اكتب بالحروف المجموعات المختلفة من ثلاثة كور. قدّاش لقيت؟» (test_rule was run first: predicted 12, actual 4)
Student: "abc,abd,acd,bcd = 4"
[9 the rule breaks] Tutor: «أربعة، والقائمة كاملة. قاعدتك "دايما ×2" توقّعت 12 وقائمتك أعطتك 4: القاعدة ما خدمتش، وإنت اللي كشفتها. سؤال وحيد: شنوّة العلاقة بين 24 و 4؟ جرّب: اختار abc وشوف بقدّاش من طريقة نكتبوها بالترتيب.»
Student: "najmou nektbou abc b 6 toro9 o 24/6 = 4"
[10-11 the real total, then the name] Tutor: «صحيح، وإنت اللي لقيت السّتة. الصندوق متاعنا: ثمانية كور، نجبدو ثلاثة مع بعض. سؤال وحيد: قدّاش من تيراج ممكن؟ اكتب الحساب سطر بسطر، وكل سطر يقول شنوّة عملت.»
Student: "... tirajet lkol = 8*7*6 =336 ama 5atr houma mch mnadhmin ne9smou 3la 3*2*1 ... 336/3*2*1= 336/6 = 56"
Tutor: «صحيح. قلت بروحك علاش: الكور موش مرتّبة، وكل مجموعة من ثلاثة كور تتكتب ستّة طرق، فنقسمو. هاذي القاعدة كاملة، وإنت اللي لقيتها. اسم الحساب اللي عملتو في الكتب:» math: C_8^3 = (8 × 7 × 6) ÷ (3 × 2 × 1) = 56  (the name comes AFTER he computed it; paper line written from his line)
[12 favourable: «ما نعرفش»] Tutor: «فكّر في تيراج واحد فيه حمراء وحدة بالضبط: شنوّة فيه؟ اكتب بالكلام الخطوات اللي تعملهم باش تعدّ التيراجات هاذي، من غير ما تحسب حتى رقم.» Student: "ma na3rfch mnin nabda lhna"
Tutor: «"ما نعرفش" جواب مقبول، وهو بالضبط الخطوة اللي تضيّع فيها. ما نعطيك حتى رقم: نمشيو على صندوق صغير، حمر R1 R2 وكحل a b c d، نجبدو ثلاثة مع بعض. مثال: R1 a b. سؤال وحيد: كل تيراج فيه حمراء وحدة بالضبط يتكوّن من جزئين: شنوّة هوما؟»
Student: "joz2 fih lk7ol o joz2 fih lkoura wa7da l7amra"
[13-14 one part right, one-ball choice] Student: "1) 1 : R1 R2 = R2R1 =1 time , 2) (4*3)/(2*1) =12/2 =6". Tutor: «الجزء الثاني صحيح: استعملت قاعدتك على الكحل بروحك. الجزء الأول: نقرا كلامك هكا، صحّحني كان غلطت: حسبت زوز حمر مع بعض كاختيار واحد. أما هنا نختارو حمراء وحدة برك، والقاعدة متاع الترتيب هي لما نجبدو أكثر من كورة. سؤال وحيد: اكتب كل الاختيارات الممكنة لحمراء وحدة من R1 و R2، وعدّهم.»
Student: "2 , R1 or R2"
[15-17 combine, then why] Student: "12 : 6*2". Tutor: «صحيح، وركّبت الجزئين بالضرب. ما قلتش علاش ضربت. سؤال وحيد: اكتب كل التيراجات اللي فيها R1 (مع زوز كحل). قدّاش لقيت؟» Student: "R1 m3a 6 tirajs k7ol o R2 m3a 6 tiraj k7ol tji 12" -> the reason in his words.
[18-19 the real favourable: compare his own two lines] Student: "... 3*1 o 2 k7ol li hiya 5*4=20 o nodhrbuhm ... 20*3=60". Tutor: «الخطة صحيحة والتركيب صحيح، والأحمر صحيح. الاختلاف في سطر وحد برك: سطر الكحل. قارن سطرين متاعك:» compare: (4×3)/(2×1) = 6  |  5×4 = 20 «سؤال وحيد: شنوّة الفرق بين السطرين؟ وهل الفرق هذا يهمّ هنا؟»
Student: "oui s7i7 ... 5*4/2*1 ... 20 / 2 = 10"
[20-21 above one] Student: "56/(3*10) =56/30=28/15". Tutor: «الرقمين 56 و 30 صحاح، والخطة تنفّذت كاملة. النتيجة هي الشي الوحيد اللي نراجعوه: 28/15 أكبر من 1. سؤال وحيد: 28/15 ينجم يكون احتمال؟ فسّر بالتيراجات: الكل 56، واللي يعجبنا 30.»
Student: "la 8lat na3mlou 30/56 =15/28=0,536"
[22 recipe in his words, beside a clean card] Tutor asks for his recipe in 3 lines without numbers; he writes it; Tutor: «هاذي وصفتك، وكل جملة فيها صحيحة. فيها حاجتين ناقصين، نسألك عليهم: كيفاش تعرف إنو الترتيب يهمّ ولا لا؟ شنوّة نثبّتو قبل ما نكتبو الاحتمال؟» then shows the clean recipe card.
[23-27 cold question, his own recipe finds the slip] New urn (5 red, 6 black). He starts alone: total 11*10*9=990 (ordered), favourable 5*15=75 (groups). Tutor: «بدأت وحدك، والخطة تنفّذت كاملة. الشي الوحيد اللي ما يطابقش هو الرقم اللي في الأسفل، ونراجعوه بوصفتك موش بوصفتي. السؤال يقول simultanément. سؤال وحيد: أي سطر من السطرين طبّق قاعدتك؟» He finds the first line; writes 990/3*2*1 = 660; Tutor reads it back: «990/3*2*1 تتقرا من اليسار: 990 ÷ 3 = 330، وبعدها × 2 × 1. شفت في الصندوق الصغير: 24 = 6 × 4، 336 = 6 × 56. سؤال وحيد: 990 = 6 × ؟» He writes 990/6 = 165, then 75/165 = 25/55; Tutor: «صحيح كقيمة، أما مازال عدد مشترك يقسم 25 و 55. شنوّة هو؟» He writes 5/11, and the paper fills from his own lines.`;
