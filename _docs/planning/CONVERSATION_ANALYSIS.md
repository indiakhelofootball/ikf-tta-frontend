# Stakeholder Conversation — Line-by-Line Translation & Feature Analysis

**Source**: `features_list.md` (Hindi conversation transcript)
**Participants**: Stakeholder (Sir — the decision maker) and Abhishek (Developer)
**Analyzed**: 2026-03-16

---

## How to Read This Document

Each section below follows this format:
- **Lines X–Y** — The original Hindi text
- **Translation** — English meaning
- **Feature Extracted** — What this means for the system
- **Data Flow** — How data moves between modules based on this requirement

---

## SECTION 1: REP Management Cleanup (Lines 1–3)

### Original
> हां सर तो पहला जो है तुमको आरईपी मैनेजमेंट से पैन हटाना होगा क्योंकि पैन हम लोग वेंडर में जाकर दे रहे हैं। ठीक है? वेंडर में जब जाओगे तो ऐड सब जगह नाम सेम रहना चाहिए। जैसे अभी सर्विस प्रोवाइडर है, पार्टनर है तो सब जगह वेंडर हो गया। ठीक है?

### Translation
"Yes sir, so first thing — you need to **remove PAN from REP Management** because we are now collecting PAN in the Vendor module. OK? When you go to Vendor, the naming should be consistent everywhere. Right now we have 'Service Provider', 'Partner' etc. — all of these should become **'Vendor'** everywhere. OK?"

### Features Extracted
| ID | Feature | Detail |
|----|---------|--------|
| F1 | Remove PAN from REP module | PAN is a vendor-level field now, not REP-level |
| F2 | Naming consistency | Replace all labels: "Service Provider", "Partner" → **"Vendor"** across entire app |

### Data Flow
```
REP Management ──(PAN removed)──> PAN now lives ONLY in Vendor module
All modules ──(rename)──> "Vendor" label everywhere
```

### Why This Matters
PAN is tied to financial identity (bank accounts, TDS). It belongs with Vendor, not with REP (field representative). A REP may or may not be a vendor. This separation is critical for TDS compliance.

---

## SECTION 2: Vendor Search-Before-Add (Lines 4–7)

### Original
> वेंडर तुम ऐड कर रहे हो तो ऐड करने के पहले सर्च करना पड़ेगा कि तुम कौन हो? अभिषेक कौन है? तो सर्च करने का मल्टीपल फ़िल्टर होगा। [...] या नाम से नाम ही मालूम है या कंपनी का नाम मालूम है तो मल्टीपल फिल्टर जिससे भी हम करके ले आए इसको।

### Translation
"When you're adding a vendor, **before adding you must search first** — who is this person? Who is Abhishek? The search should have multiple filters. Maybe we know the type (REP, Videographer), or just the name, or the company name — whatever filter gets us there."

**Abhishek confirms**: "So service type first, then name."

### Features Extracted
| ID | Feature | Detail |
|----|---------|--------|
| F3 | Search-before-add flow | Mandatory search before creating new vendor (prevents duplicates) |
| F4 | Multi-filter vendor search | Filter by: Service Type, Vendor Name, Entity/Company Name |
| F5 | Search order | Service Type → Name/Entity Name |

### Data Flow
```
User clicks "Add Vendor"
  └─> Search Dialog opens (NOT add form)
        ├─ Filter: Service Type (REP, Videographer, Photographer, etc.)
        ├─ Filter: Vendor Name
        └─ Filter: Entity/Company Name
              ├─ Found? → Show existing vendor (no duplicate created)
              └─ Not found? → Now allow "Add New Vendor"
```

---

## SECTION 3: Vendor Fields — Entity, PAN, TDS (Lines 8–15)

### Original (Line 8)
> तो सर्विस टाइप मतलब कर लिए। उसका नाम ले लिए। नाम मेरा कंपनी टाइप है। इफ इट इज इंडिविजुअल अगर नहीं है ठीक है तो उसका एंटिटी नेम मांगोगे जो कंपनी नेम के जगह एंटिटी लिखो

### Translation
"So Service Type done. Name done. Then **Company Type** — if it's Individual, fine. If not, then ask for **Entity Name** (write 'Entity Name' instead of 'Company Name')."

### Original (Line 9)
> एंटिटी नेम डालेगा वो अपना जो भी नाम है प्राइवेट लिमिटेड लिमिटेड कुछ डालेगा

### Translation
"They'll enter whatever entity name — 'Private Limited', 'Limited', whatever it is."

### Original (Line 11)
> उसके बाद है जीएसटी नंबर मांगोगे पैन नंबर मांगोगे ठीक है पैन नंबर दोस्तों मैंडेटरी है [...] टीडीएस टाइप जो अभी तुम डाल रहे हो यहां पर मैं उसमें डबल माइंड में आ रहा हूं बट डालो अभी

### Translation
"After that, ask for **GST Number**, **PAN Number**. PAN is **mandatory**. Also PAN card upload — mandatory. TDS Type — I'm in two minds about putting it here, but keep it in Vendor for now."

### Original (Lines 12–15) — TDS Type Debate
> चाहे तो वर्क टाइप में हम डाल सकते हैं [...] बहुत सा चेंजेस होता है [...] टीडीएस टाइप अभी तुम्हारे नाम से [...] वर्क ऑर्डर में करो तो ज्यादा अच्छा है

### Translation
"We could put TDS Type in Work Order instead because the work type defines the TDS rate... but there are too many changes in Section 11 rules. So keep TDS Type in Vendor for now. Though ideally it should go in Work Order — that would be better."

### Features Extracted
| ID | Feature | Detail |
|----|---------|--------|
| F6 | Vendor fields order | Service Type → Vendor Name → Company Type → Entity Name (conditional) |
| F7 | Entity Name label | Use "Entity Name" instead of "Company Name" |
| F8 | Entity Name conditional | Only shown when Company Type ≠ Individual |
| F9 | PAN mandatory | PAN Number is required for every vendor |
| F10 | PAN card upload mandatory | File upload (image/PDF) of PAN card |
| F11 | TDS Type in Vendor | Keep TDS Type in vendor module for now (may move to Work Order later) |

### Data Flow — Vendor Creation
```
Step 1: Service Type (dropdown)
Step 2: Vendor Name (text)
Step 3: Company Type (Individual / Sole Prop / Pvt Ltd / LLP / etc.)
         ├─ If Individual → skip Entity Name
         └─ If NOT Individual → Step 4: Entity Name (text)
Step 5: GST Number (optional)
Step 6: PAN Number (mandatory, 10 chars)
Step 7: PAN Card Image (mandatory upload, image/PDF)
Step 8: TDS Type (dropdown — "TDS @ X% (Sec XXX)")
Step 9: Contact Details
Step 10: Bank Details
```

### Decision Recorded
**TDS Type stays in Vendor for now.** Stakeholder acknowledged it logically belongs in Work Order (because TDS rate depends on nature of work, not the vendor), but changing it now would create too many cascading changes. This is a known tech debt item.

---

## SECTION 4: Bank Details with PAN Linkage (Lines 16–25)

### Original (Line 16)
> ये कर दोगे जीएसटी वेरीिफाइड ये सब जितना है एड्रेस पिन कोड पहले तो बैंक जो है और यहां पर पूछ लो कि ये वाला है कंफर्म ये पैन नंबर तुमने मांगा है ना

### Translation
"Do GST verified, address, pin code, etc. Then for Bank Details — **confirm the PAN number** that was already entered."

### Original (Lines 18–20)
> तो पैन नंबर यहां बैंक डिटेल में कर दो। जैसे कि दिस बैंक डिटेल इज अटैच्ड विद दिस पैन कार्ड। [...] बैंक डिटेल भरते समय ब्रैकेट में सामने लिख दो पैन कार्ड ये वाला है पैन नंबर

### Translation
"Show PAN number in the bank details section — like 'These bank details are attached to this PAN card'. When filling bank details, write **the PAN number in brackets** next to the header."

### Original (Lines 24–25)
> अकाउंट टाइप तो जरूरी अकाउंट नंबर, आईएफसी कोड और कुछ नंबर रहता है क्या?
> नहीं नहीं सर। जनरली यही रहता है।

### Translation
"Account Type, Account Number, IFSC Code — anything else needed?"
"No sir, generally that's all."

### Features Extracted
| ID | Feature | Detail |
|----|---------|--------|
| F12 | PAN in bank details header | Show: **"Bank Details — linked to PAN ABCDE1234F"** |
| F13 | Bank detail fields | Bank Name, Account Type, Account Number, IFSC Code, Branch Address, Branch Pin Code |
| F14 | PAN-Bank linkage confirmation | Bank details are explicitly tied to the PAN already entered |

### Why This Matters
In India, bank accounts are linked to PAN cards. By showing PAN in the bank details header, the user gets visual confirmation they're entering the right bank account for the right PAN. This prevents mismatch errors that cause payment bounces later.

### Data Flow
```
PAN entered in Step 6 ──(displayed)──> Bank Details Header: "Bank Details — linked to PAN XXXXX"
                                        ├─ Bank Name (dropdown from /banks/ API)
                                        ├─ Account Type (Savings/Current/etc.)
                                        ├─ Account Number
                                        ├─ IFSC Code
                                        ├─ Branch Address
                                        └─ Branch Pin Code
```

---

## SECTION 5: Work Order Module (Lines 26–43)

### Original (Line 28)
> वी विल क्रिएट ए वर्क ऑर्डर तो यहां से एक वर्क ऑर्डर मॉड्यूल बनाओगे वर्क ऑर्डर में क्या डालोगे तुम कि पहला चीज है कि खोज के लाओगे किसके लिए वर्क ऑर्डर बना रहे हो [...] वन टाइम या पीरियडिक

### Translation
"We will create a Work Order — make a separate WO module. In it, first thing: **search and find** who you're creating the WO for. WO type will be: **One Time (Fixed)** or **Periodic**."

### Original (Lines 29–33) — Amount Calculation
> पीरियडिक में पीरियडिक अमाउंट डालोगे तो ड्यूरेशन लिख दोगे [...] 15 × 6 = 90 कंफर्म कराओगे [...] फिक्स्ड कॉन्ट्रैक्ट 1 लाख का कॉन्ट्रैक्ट ही है तो टोटल वैल्यू 1 लाख

### Translation
"For Periodic: enter the per-period amount + number of periods. Like **15,000 × 6 = 90,000** — make the user **confirm** this total. For Fixed: if it's a 1 lakh contract, total value = 1 lakh."

### Original (Lines 34–42) — Description + Vendor Confirmation
> डिस्क्रिप्शन डाल रहे हो [...] वर्कआर्डर जब डाल रहे हो तो नीचे सब उसका यह कंफर्म कर रहे हो कि तुम्हारा अकाउंट यह है तुम्हारा नाम यह है फोन नंबर यह है [...] वो क्योंकि तुम पहले से उसको वेंडर बनाते समय सेव कर ही लिए थे ना [...] वर्क ऑर्डर जब टेंपलेट बनेगा कल को तो यही सब डाटा जाएगा

### Translation
"Add a description. Then **below the WO form, show ALL vendor details** for confirmation — name, account, phone, everything A-to-Z. This data was already saved when the vendor was created. You're showing it here for confirmation because **when the WO template/document is generated in the future, this same data goes into it**."

### Features Extracted
| ID | Feature | Detail |
|----|---------|--------|
| F15 | WO is a separate module | Own page, own route |
| F16 | Search vendor first | Must search and select existing vendor before creating WO |
| F17 | Two WO types | **Fixed** (one-time amount) or **Periodic** (recurring) |
| F18 | Periodic: amount × periods | Enter per-period amount + number of periods |
| F19 | Periodic: confirm total | Show calculation (e.g., "15K × 6 = 90K"), user must confirm |
| F20 | Fixed: single amount | Enter total contract value |
| F21 | Work description | Free text field for specific work details |
| F22 | Vendor details confirmation | Show ALL vendor data below WO form (pulled from vendor record) |
| F23 | Future template support | Data must be stored to support WO document generation later |
| F24 | Draft → Issued flow | WO saves as Draft first, can be Issued later |

### Data Flow — Work Order Creation
```
STEP 1: Search Vendor (same multi-filter search as vendor module)
           └─> Select existing vendor (vendor data loaded from DB)

STEP 2: WO Type selection
           ├─ Fixed → Enter total amount (e.g., ₹1,00,000)
           └─ Periodic → Enter amount per period + number of periods
                          └─> System shows: "₹15,000 × 6 = ₹90,000"
                          └─> User clicks "Confirm" (mandatory)

STEP 3: Description (free text)

STEP 4: Vendor Confirmation Section (read-only, auto-populated)
           ├─ Vendor Name
           ├─ Account Number
           ├─ Phone Number
           ├─ Bank Name, IFSC
           ├─ PAN Number
           └─ ...everything from vendor record

STEP 5: Save → Status: "Draft"
         Later: Issue → Status: "Issued"
```

### Data Dependencies
```
Vendor Module ──(vendor record)──> Work Order Module
  - vendorId, vendorName, phone, email
  - bankName, accountNumber, ifscCode
  - panNumber, gstNumber, tdsType
  - All contact and bank details
```

---

## SECTION 6: Payment Request Module (Lines 44–78)

### Original (Line 44)
> वर्क ऑर्डर बन गया अब जब तुम पेमेंट रिक्वेस्ट रेज करने जाते हो [...] रेज इनवॉइस नहीं करके उसको पेमेंट रिक्वेस्ट कर दोगे

### Translation
"Work Order is created. Now when you go to raise a payment — rename **'Raise Invoice' to 'Payment Request'**. First task: search for who you're paying."

### Original (Lines 50–57) — WO Status Check (Three Scenarios)
> तुम्हारे नाम से अगर वर्क ऑर्डर नहीं है → नो वर्क ऑर्डर फाउंड, क्लिक हियर टू क्रिएट
> वर्क ऑर्डर मिला लेकिन ऑल पेमेंट क्लियर → क्रिएट ए न्यू वर्क ऑर्डर
> वर्कआर्डर है, अमाउंट 1 लाख, पैसा पेंडिंग है

### Translation
Three scenarios after finding a vendor:
1. **No WO exists** → "No Work Order Found — Click here to create a Work Order"
2. **WO exists but fully paid** → "All Payment Clear — Create a New Work Order"
3. **WO exists with pending balance** → Show: "WO Issued ₹1,00,000 — Create payment against this WO"

### Original (Lines 60–67) — Payment Amount Logic
> टोटल वर्क ऑर्डर अमाउंट इशूड ₹1 लाख पेड ₹60,000 → 40 रिमेनिंग टू बी पेड
> पीरियडिक है तो पीरियड सेलेक्ट कर लोगे → ऑटोमेटिकली अमाउंट दिखेगा
> फिक्स्ड है तो पेंडिंग 40 [...] हम 10 दे 15 दे 40 दे हमारी मर्जी है
> फिर दिखा देगा कि इतना अमाउंट के बाद स्टिल पेंडिंग इज ₹10,000

### Translation
"Show: WO Total ₹1L, Paid ₹60K, **Remaining ₹40K**.
- If **Periodic**: User selects which period → amount auto-fills from per-period amount.
- If **Fixed**: User sees ₹40K pending. They can pay **any amount** — 10K, 15K, 40K — their choice. Enter the amount manually.
- After entering amount: **Show 'Still Pending: ₹10,000'** (e.g., had 40K pending, paying 30K → still pending 10K)."

### Original (Lines 75–78) — Grid View
> प्रीव्यू दिख रहा है [...] रिक्वेस्ट आईडी [...] वर्क ऑर्डर [...] वेंडर नाम [...] अमाउंट [...] इनवॉइस डेट [...] ड्यू डेट का कोई मतलब नहीं [...] डाउनलोड की जरूरत नहीं [...] टोटल अमाउंट दिखाओ तभी तो मैं चेंज करने का सोचूंगा

### Translation
"The grid should show: **Request ID, Work Order, Vendor Name, Amount, Invoice Date**.
- Remove: Due Date (not relevant), Download button (not needed here).
- Actions: only View and Edit.
- **Show Total Amount** below the grid — 'Show total amount, only then will I think about making changes.'"

### Features Extracted
| ID | Feature | Detail |
|----|---------|--------|
| F25 | Rename to Payment Request | "Raise Invoice" → "Payment Request", "Payment ID" → "Request ID" |
| F26 | Search vendor first | Same multi-filter search |
| F27 | WO status check — 3 scenarios | No WO / Fully paid WO / Pending WO |
| F28 | Periodic payment | Select period → amount auto-fills |
| F29 | Fixed payment — partial allowed | Enter any amount up to remaining balance |
| F30 | "Still Pending" display | After entering amount, show remaining balance |
| F31 | Grid columns | Request ID, WO, Vendor Name, Amount, Invoice Date, Status, Actions |
| F32 | Remove from grid | Due Date, Download button |
| F33 | Total Amount below grid | Sum of all amounts must be prominently visible |
| F34 | Actions | View and Edit only |

### Data Flow — Payment Request Creation
```
STEP 1: Search Vendor (multi-filter)
           └─> Vendor found → Check Work Orders

STEP 2: WO Check
           ├─ No WO → "No WO Found — Create WO" (link to WO module)
           ├─ WO fully paid → "All Cleared — Create New WO"
           └─ WO has pending amount → Show WO details:
                ├─ Total: ₹1,00,000
                ├─ Paid: ₹60,000
                └─ Remaining: ₹40,000

STEP 3: Enter Payment Amount
           ├─ Periodic WO → Select period → Amount auto-fills (e.g., ₹15,000)
           └─ Fixed WO → Enter amount manually (≤ remaining)
                          └─> System shows: "Still Pending: ₹10,000"

STEP 4: Save / Save & Send to Accounts

GRID VIEW:
  ┌──────────────┬────────────┬──────────────┬──────────┬──────────────┬────────┬─────────┐
  │ Request ID   │ Work Order │ Vendor Name  │ Amount   │ Invoice Date │ Status │ Actions │
  ├──────────────┼────────────┼──────────────┼──────────┼──────────────┼────────┼─────────┤
  │ PR-2026-001  │ WO-S5-002  │ SportsPrint  │ ₹25,000  │ 20-Jan-2025  │ Done   │ View    │
  └──────────────┴────────────┴──────────────┴──────────┴──────────────┴────────┴─────────┘
  TOTAL AMOUNT: ₹2,40,000
```

---

## SECTION 7: TDS Breakdown in Payment (Lines 79–87)

### Original (Lines 79–80)
> सेव एंड सेंड टू अकाउंट लेकिन [...] एक पार्ट हम भूल गए कि जैसे तुमको 30 दिखा रहे हैं → 30 तो यहां नहीं आएगा ना। वहां पर लिखना पड़ेगा अमाउंट टू बी पेड इज़ 27,000 एंड 3000 एज अ टीडीएस अमाउंट

### Translation
"Wait — we forgot one part! If we're showing ₹30,000 as the amount, that's not what actually gets paid. You need to show: **'Amount to be paid: ₹27,000'** and **'TDS Amount: ₹3,000'**."

### Original (Lines 81–87)
> टीडीएस हमको फिर आगे करके एक बार महीना में एक बार देना पड़ता है [...] किसके अगेंस्ट टीडीएस काटे तुम्हें रिकॉर्ड आ जाएगा [...] सेंड टू अकाउंट कर दिया तो बैंक वाला मॉड्यूल में चले गए

### Translation
"Because TDS has to be deposited once a month. We need the record of whose TDS was deducted. When you do 'Send to Account', the request goes to the **Bank module**."

### Features Extracted
| ID | Feature | Detail |
|----|---------|--------|
| F35 | TDS auto-calculation | Gross Amount → split into Net Amount + TDS Amount |
| F36 | TDS display in payment | Show: "Amount to be paid: ₹27,000" and "TDS: ₹3,000" |
| F37 | TDS record keeping | Record which vendor's TDS was deducted, for monthly deposit |
| F38 | Send to Accounts action | Clicking "Send to Accounts" moves request to Bank module |

### Data Flow — TDS Calculation
```
Gross Amount: ₹30,000
  └─> Vendor TDS Type: "TDS @ 10% (Sec 194J)"
        ├─> TDS Amount: ₹30,000 × 10% = ₹3,000
        └─> Net Payable: ₹30,000 − ₹3,000 = ₹27,000

Payment Request record saves:
  { grossAmount: 30000, tdsRate: 10, tdsAmount: 3000, netAmount: 27000 }

"Send to Accounts" →→→ Record appears in Bank/Accounts module
```

---

## SECTION 8: Bank Module — Payment Processing (Lines 88–99)

### Original (Line 88)
> में आ गया तुम्हारा कि रिक्वेस्ट रिसीव्ड एट दिस पॉइंट और डाउनलोड एक्सेल का ऑप्शन रहेगा

### Translation
"In the Bank module, it shows **'Request Received'** at this point. And there'll be a **Download Excel** option."

### Original (Line 89)
> वो अपलोड करेगा [...] पेमेंट कंप्लीट हो गया तो स्टेटस अपडेट [...] पेमेंट डन [...] सिस्टम में लॉक हो गया

### Translation
"The accountant downloads Excel, sends it to the bank for processing. Then **uploads it back**. If payment is complete → status update → **'Payment Done'** → everything is **locked in the system** — no more edits anywhere."

### Original (Lines 90–98) — Bounce Handling
> पेमेंट बाउंस हुआ [...] अकाउंट का बाउंस हुआ है तो ये सेव नहीं रहेगा [...] एडिट करने का ऑप्शन खत्म [...] वहां जाके एडिट करेगा अकाउंट्स वाला [...] जितना अमाउंट का उसी अमाउंट से मैच कराएगा [...] एरर हैंडलिंग हो गया बैंक जो अकाउंट गलत दिया

### Translation
"If payment **bounced** — the record stays open but **editing closes on the payment side**. The **accounts person edits from the Bank module** — they fix the bank details (account number, IFSC). The **same amount** is retried — no new request needed. This is basically error handling for wrong bank account details."

### Features Extracted
| ID | Feature | Detail |
|----|---------|--------|
| F39 | Bank module inbox | Shows all requests with status "Request Received" |
| F40 | Download Excel | Export pending payments for bank processing (includes bank details, net amount) |
| F41 | Upload processed file | Upload Excel back after bank processes payments |
| F42 | Payment Done → Lock | Marking "Done" locks the record system-wide — no edits anywhere |
| F43 | Bounce handling | If bounced: edit bank details in Bank module, retry with same amount |
| F44 | Edit restriction on bounce | Payment module can't edit a bounced payment — only Bank module can |

### Data Flow — Bank Processing
```
Payment Module                          Bank Module
─────────────                          ───────────
"Send to Accounts" ──────────────────> Request appears (status: "Request Received")
                                        │
                                        ├─ Download Excel (vendor bank details + net amount)
                                        │     └─> Accountant sends to bank for transfer
                                        │
                                        ├─ Upload processed file / Manual status update
                                        │     ├─ Payment Successful:
                                        │     │    └─> Status: "Payment Done" → RECORD LOCKED
                                        │     │         (no edits possible anywhere in system)
                                        │     │
                                        │     └─ Payment Bounced:
                                        │          └─> Status: "Payment Bounced"
                                        │               ├─ Payment module: EDIT DISABLED
                                        │               └─ Bank module: CAN EDIT bank details
                                        │                    └─> Fix account/IFSC → Re-submit
                                        │                         (same amount, no new request)
                                        │
                                        └─ Record stays in Bank queue until successfully processed
```

---

## SECTION 9: TDS Compliance & Monthly Deposit (Lines 100–109)

### Original (Line 100)
> बैंक वाले में खाली एक चीज दिखना होगा कि उसमें टीडीएस पेंडिंग फॉर दिस मंथ। टीडीएस क्या होता है कि एक से 30 तारीख के बीच में जितना काटे हो अगला महीना के एक से सात तारीख के अंदर तुमको जमा करना रहता है

### Translation
"In the Bank module, one more thing must be visible: **'TDS Pending for this month'**. TDS rule: whatever TDS you deducted between the **1st and 30th of the month**, you must deposit it by the **1st to 7th of the next month**."

### Original (Lines 105–109)
> टीडीएस का एक सीट बना रहेगा [...] एक्सेल शीट [...] टीडीएस टाइप के हिसाब से फ़्टर करके [...] सर्विस का अलग होता है कांट्रेक्टर का अलग होता है [...] हर एक टीडीएस का अलग-अलग भरना पड़ता है [...] इसमें आपको सिस्टम नहीं लगा रहे हैं अभी

### Translation
"A TDS sheet will be maintained. The accountant works with an Excel sheet — TDS is grouped by **TDS Type** because each type (services, contractors, etc.) requires a **separate government challan**. Each TDS type must be filed separately. **We are NOT building a system for this right now** — the accountant handles it via Excel."

### Original (Line 109) — TDS → Vendor Statement
> जब पूरा पेमेंट हो जाएगा तो बोलेगा हां टीडीएस डन [...] तुम्हारे सिस्टम में अपडेट हो गया कि जिसका टीडीएस काटे थे उसका टीडीएस पे हो गया [...] इमीडिएटली उसके अकाउंट स्टेटमेंट में आएगा [...] टीडीएस डिडक्टेड लिखा रहेगा हमेशा

### Translation
"When the accountant finishes depositing all TDS, they mark it as 'TDS Done' in the system. This **immediately reflects in the vendor's account statement** — it will always show **'TDS Deducted'** against each payment. So the vendor knows their TDS was deducted and deposited."

### Features Extracted
| ID | Feature | Detail |
|----|---------|--------|
| F45 | TDS Pending display | Prominent display in Bank module: "TDS Pending for this month: ₹X" |
| F46 | TDS statutory deadline | Remind: must deposit by 7th of next month |
| F47 | TDS by type grouping | Group TDS by section (194C, 194J, etc.) — each filed separately |
| F48 | TDS Excel download | Export TDS data for manual government filing |
| F49 | No automated TDS filing | System does NOT file with government — manual Excel process |
| F50 | Mark TDS as deposited | Accountant marks month's TDS as "Deposited" after payment |
| F51 | Vendor statement update | TDS deposit status flows to vendor's account statement |
| F52 | "TDS Deducted" in statement | Every payment shows "TDS Deducted" in vendor statement |

### Data Flow — TDS Lifecycle
```
Payment Request created (with TDS deducted)
  │
  ├─> TDS Record created: { vendor, PAN, section, rate, grossAmount, tdsAmount, month }
  │
  └─> Payment marked "Done" in Bank module
        │
        └─> TDS amount added to "TDS Pending for this month"
              │
              ├─> Bank module shows: "TDS Pending: ₹16,550 — due by 7th April"
              │
              ├─> Accountant downloads TDS Excel (grouped by TDS type/section)
              │     ├─ 194C – Contractor (Individual): ₹250
              │     ├─ 194C – Contractor (Company): ₹1,300
              │     └─ 194J – Professional: ₹15,000
              │
              ├─> Accountant deposits TDS manually (separate challan per type)
              │
              └─> Accountant marks "TDS Deposited" in system
                    │
                    └─> Vendor Statement updated:
                          "PR-2026-001 | ₹25,000 | TDS ₹250 | TDS Deposited ✓"
```

---

## SECTION 10: Wrap-up & Next Steps (Lines 110–141)

### Original (Lines 116–119)
> ठीक करके बताना हमको [...] ये तो तुम डिप्लॉय कर दिए [...] वेंडर बदल के हमको वेंडर को रिवम करना है [...] ऐड करना है हमको काफी सारा चीज

### Translation
"So you've deployed what we have. Now: **revamp the Vendor module** and **add a lot of new features**."

### Original (Lines 126–131)
> मंडे से इस पर [...] आरपी मैनेजमेंट तक को लाइव करके उसको प्रोडक्शन में डाल देंगे [...] वो लोग थरो क्यूए कर लेगा दो दिन में

### Translation
"From Monday, we'll take REP Management through QA testing (2 days), push to production. Once that table is finalized, we won't touch it again."

### Original (Lines 137–141)
> अभी फ्रंट एंड नहीं दिखाते हैं सर। एक बार हम लिख लेते हैं पहले एक जगह डॉक्यूमेंट [...] डॉक्यूमेंट भेज देना [...] क्लेरिटी दे दो

### Translation
"Let's not show frontend yet. **First write everything down as a document**. Send the document, we'll review, then discuss and code."

### Features Extracted
| ID | Feature | Detail |
|----|---------|--------|
| F53 | Vendor module revamp | Restructure vendor with search-first flow + all new fields |
| F54 | REP module to production | Finalize REP + Cities modules for production deploy |
| F55 | Document-first approach | Write specs before coding — stakeholder reviews document first |

---

## COMPLETE DATA FLOW — End to End

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          COMPLETE SYSTEM DATA FLOW                              │
│                                                                                 │
│  ┌──────────┐     ┌──────────────┐     ┌──────────────────┐     ┌────────────┐ │
│  │  VENDOR   │────>│  WORK ORDER  │────>│ PAYMENT REQUEST  │────>│   BANK     │ │
│  │  MODULE   │     │   MODULE     │     │    MODULE        │     │  MODULE    │ │
│  └──────────┘     └──────────────┘     └──────────────────┘     └────────────┘ │
│       │                  │                      │                      │        │
│   Creates:          Creates:               Creates:               Processes:   │
│   - Vendor record   - WO linked to         - Payment Request      - Downloads  │
│   - PAN             vendor               - TDS calculated          Excel      │
│   - Bank details    - Fixed or            - Gross/TDS/Net        - Uploads     │
│   - TDS type          Periodic            - Linked to WO           results    │
│                     - Amount(s)            - "Send to Accounts"  - Done/Bounce │
│                     - Description                                 - TDS track  │
│                     - Draft→Issued                                             │
│                                                                                 │
│  DATA FLOWS:                                                                    │
│  ─────────────────────────────────────────────────────────────────────────────── │
│                                                                                 │
│  Vendor ─────> WO (vendor details shown for confirmation)                       │
│  Vendor ─────> Payment Request (TDS type used for calculation)                  │
│  Vendor ─────> Bank Module (bank details for transfer)                          │
│  WO ─────────> Payment Request (amount, type, remaining balance)                │
│  Payment Req ─> Bank Module ("Send to Accounts" action)                         │
│  Bank Module ─> Vendor Statement (TDS Deposited status)                         │
│                                                                                 │
│  LOCK CHAIN:                                                                    │
│  Bank marks "Payment Done" → Record locked in ALL modules                       │
│                                                                                 │
│  TDS CHAIN:                                                                     │
│  Payment created (TDS deducted) → TDS Pending in Bank → Accountant deposits     │
│  → Marks "Deposited" → Vendor Statement shows "TDS Deposited ✓"                │
│                                                                                 │
│  BOUNCE CHAIN:                                                                  │
│  Bank marks "Bounced" → Payment module edit LOCKED → Bank module edits bank     │
│  details → Re-submits same amount → Stays in queue until successful             │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## STATUS vs CONVERSATION MAPPING

| Feature | Conversation Lines | Implemented? |
|---------|-------------------|--------------|
| Remove PAN from REP | Line 3 | Done |
| "Vendor" naming everywhere | Line 3 | Done |
| Vendor search-before-add | Lines 5–7 | Done |
| Entity Name (not Company Name) | Line 8 | Done |
| PAN mandatory + upload | Line 11 | Done |
| TDS Type in vendor | Lines 11–15 | Done |
| PAN in bank details header | Lines 18–20 | Done |
| Work Order module | Lines 28–42 | Done |
| WO: Fixed vs Periodic | Lines 29–33 | Done |
| WO: Periodic confirmation | Line 31 | Done |
| WO: Vendor details below | Lines 36–39 | Done |
| Payment Request (renamed) | Line 44 | Done |
| PR: 3 WO scenarios | Lines 50–56 | Done |
| PR: Periodic period select | Line 62 | Done |
| PR: Fixed partial payment | Lines 64–66 | Done |
| PR: "Still Pending" display | Line 67 | Done |
| PR: TDS breakdown | Lines 79–80 | Done |
| PR: Total amount in grid | Lines 75–77 | Done |
| PR: Send to Accounts | Line 87 | Done |
| Bank: Request received inbox | Line 88 | Done |
| Bank: Download Excel | Line 88 | Done |
| Bank: Upload confirmation | Line 89 | Done |
| Bank: Payment Done → Lock | Line 89 | Done |
| Bank: Bounce handling | Lines 90–98 | Done |
| Bank: TDS Pending display | Line 100 | Done |
| Bank: TDS by type grouping | Line 108 | Done |
| Bank: TDS Excel download | Lines 105–108 | Done |
| Bank: Mark TDS deposited | Line 109 | Done |
| Vendor statement: TDS status | Line 109 | Done |

---

## KEY DECISIONS FROM THE CONVERSATION

| # | Decision | Who Decided | Reasoning |
|---|----------|-------------|-----------|
| 1 | TDS Type stays in Vendor (not WO) | Stakeholder | Too many cascading changes if moved now; Section 11 rules change frequently |
| 2 | No automated TDS filing | Stakeholder | Accountant handles via Excel + manual government portal filing |
| 3 | Bank module edits bounce, not Payment module | Stakeholder | Only the accounts team should fix bank details — separation of duties |
| 4 | "Payment Done" locks everything | Stakeholder | Once money is transferred, no one should change the record |
| 5 | Same amount on bounce retry | Stakeholder | Don't create new request — fix bank details and retry with same amount |
| 6 | Document first, then code | Both | Abhishek suggested writing specs before showing frontend |
| 7 | REP + Cities to production first | Abhishek | Stabilize existing modules before adding new ones |
