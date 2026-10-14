/* Topic, book and "Numbers to Know" reference data for the study app. */

window.TOPICS = {
  lic:   { name: "Licensing (Ch. 489 & 61G4)", short: "Licensing",
           summary: "Florida's contractor licensing law: records, CE, renewals, qualifying agents, insurance minimums, advertising and penalties. Grab the Florida Contractors Manual, chapter 2." },
  dbpr:  { name: "DBPR & FS 455", short: "DBPR / 455",
           summary: "General rules for every DBPR profession: complaints, citations, mediation, probable cause, exams, limited licenses and military rules. Grab your Chapter 455 printout." },
  lien:  { name: "Construction Lien Law (Ch. 713)", short: "Lien law",
           summary: "Notice of Commencement, Notice to Owner, claims of lien, sworn statements, improper payments and payment bonds. Florida Contractors Manual, chapter 9." },
  aia:   { name: "AIA Contract Documents", short: "AIA docs",
           summary: "A201 General Conditions (owner/contractor/architect), A401 Subcontract and A701 Instructions to Bidders. Most questions are about deadlines: 3, 7, 10, 14 and 21 days." },
  law:   { name: "Contract Law", short: "Contract law",
           summary: "Statute of frauds, oral vs. written contracts, statutes of limitation, offers, cost-plus contracts and the Buy American Act. Florida Contractors Manual, chapter 8." },
  acct:  { name: "Accounting & Financial Statements", short: "Accounting",
           summary: "Accounting equation, balance sheet vs. income statement, accrual vs. cash, journals and ledgers, current liabilities." },
  ratio: { name: "Financial Ratios", short: "Ratios",
           summary: "Current ratio, combined ratios, real turnover, liquidity tests and profit margin. Builder's Guide to Accounting, about pages 268–272." },
  dep:   { name: "Depreciation & Equipment", short: "Depreciation",
           summary: "Straight-line and declining-balance depreciation, salvage value, book value, gain or loss on sale, and hourly equipment cost." },
  cash:  { name: "Cash, Credit & Inventory", short: "Cash & credit",
           summary: "Discounts, petty cash (imprest), lapping, bad debt, aging, purchase orders, FIFO and LIFO, inventory ratios, loans and interest." },
  job:   { name: "Job Costing, Overhead & Revenue", short: "Job costing",
           summary: "Direct vs. overhead costs, fixed vs. variable expenses, breakeven, budgets, percentage of completion vs. completed contract, markup." },
  tax:   { name: "Taxes, Payroll & Records", short: "Tax & payroll",
           summary: "Forms 940, 941 and 1099, Florida sales tax (DR-15), record retention and payroll registers." },
  labor: { name: "Labor & Employment Law", short: "Labor law",
           summary: "FLSA (minimum wage, overtime, exemptions), child labor, civil rights acts, Right to Work, I-9, equal pay, drug-free workplace, whistle-blowers." },
  wc:    { name: "Workers' Comp & Reemployment Tax", short: "Workers' comp & UC",
           summary: "Chapter 440 coverage rules and exemptions, sub liability, reemployment (unemployment) tax liability, the RT-6, experience rating and benefit eligibility." },
  ins:   { name: "Insurance & Bonds", short: "Insurance & bonds",
           summary: "Builder's risk, completed operations, special form, bid/performance/payment bonds and the surety's 3 Cs." },
  osha:  { name: "Safety & OSHA", short: "OSHA",
           summary: "300/300A/301 recordkeeping, recordable vs. first aid, reporting deadlines, posters, citations, penalties, slings. Florida Contractors Manual, chapter 7." },
  est:   { name: "Estimating, Scheduling & Project Mgmt", short: "Estimating",
           summary: "Estimate types, manpower and equipment productivity, CPM and network schedules, short-term schedules, RFIs, back charges and FDEP demolition notice." },
  org:   { name: "Business Organization & Management", short: "Business org",
           summary: "Entity types (joint venture, S corp, corporation), fictitious names, management functions, capital and SBA/bank financing." }
};

window.BOOKS = {
  FCM:   { name: "Florida Contractors Manual", short: "Contractors Manual", color: "fcm",
           when: "Licensing (Ch. 2), business organization (Ch. 1), finance and tax (Ch. 3), insurance and bonds (Ch. 4), labor law and reemployment (Ch. 5), workers' comp (Ch. 6), OSHA (Ch. 7), contract law (Ch. 8), lien law (Ch. 9), estimating and project management (Ch. 10)." },
  BGA:   { name: "Builder's Guide to Accounting", short: "Builder's Guide", color: "bga",
           when: "Accounting how-to: depreciation, ratios, cash control, inventory, overhead, job costing, percentage of completion, payroll registers." },
  A201:  { name: "AIA A201 – General Conditions (2017)", short: "AIA A201", color: "aia",
           when: "Owner, contractor and architect duties: change orders, CCDs, pay apps, claims, concealed conditions, tests, insurance notices, subcontractor objections." },
  A401:  { name: "AIA A401 – Contractor/Subcontractor Agreement (2017)", short: "AIA A401", color: "aia",
           when: "Contractor vs. subcontractor: paying the sub, sub stopping work, sub default, assigning the subcontract, progress reports." },
  A701:  { name: "AIA A701 – Instructions to Bidders (2018)", short: "AIA A701", color: "aia",
           when: "The bidding phase: bidder representations, clarification requests, addenda, clerical errors, owner financing proof, bond delivery." },
  FS455: { name: "Florida Statutes Chapter 455", short: "FS 455", color: "fs",
           when: "DBPR general powers: complaints, citations, mediation, probable cause panels, exams, limited licenses, CE providers, military members." }
};

/* "Numbers to Know" — the deadlines, dollar amounts and counts the exam loves.
   t = topic, q = prompt, a = answer, ids = practice questions that test it. */
window.FACTS = [
  // Records retention
  { t: "tax", q: "Hard records (payroll, employment contracts, sales & purchase records): keep how long?", a: "3 years", ids: ["1-1"] },
  { t: "tax", q: "Soft records (timecards, time sheets): keep how long?", a: "2 years", ids: ["1-2"] },
  { t: "lic", q: "Chapter 489: contractor's complete financial & business records are kept for…", a: "Immediately preceding 3 years", ids: ["1-3", "2-45"] },
  { t: "tax", q: "IRS employment tax records: keep at least…", a: "4 years", ids: ["1-5", "3-30"] },
  { t: "osha", q: "OSHA 300 / 300A / 301 records: keep for…", a: "5 years after the end of the calendar year, at each establishment", ids: ["1-4", "2-120", "3-65"] },
  { t: "labor", q: "I-9 forms: keep for…", a: "3 years after hire OR 1 year after employment ends, whichever is later", ids: ["1-7"] },
  { t: "dbpr", q: "CE providers keep course completion records for…", a: "4 years", ids: ["1-70"] },
  { t: "dbpr", q: "DBPR keeps exam scores for at least…", a: "2 years", ids: ["2-81"] },

  // Licensing
  { t: "lic", q: "Continuing education required each 2-year cycle", a: "14 hours (a CE \"hour\" = 50 minutes)", ids: ["2-20", "3-91", "2-32"] },
  { t: "lic", q: "General, building & residential contractors: public liability / property damage minimums", a: "$300,000 / $50,000", ids: ["2-102"] },
  { t: "lic", q: "All other trades (e.g. plumbing, roofing, HVAC): liability / property damage minimums", a: "$100,000 / $25,000", ids: ["1-63", "2-15"] },
  { t: "lic", q: "Changes to info on a business organization's qualification application (incl. business address): report within…", a: "45 days", ids: ["1-97", "3-12"] },
  { t: "lic", q: "Didn't renew an active certificate at biennial renewal: status becomes…", a: "Delinquent", ids: ["1-100", "3-17"] },
  { t: "lic", q: "Residential deposit of more than 10%: apply for the permit within…", a: "30 days (start work within 90 days after the permit is issued)", ids: ["1-120"] },
  { t: "lic", q: "Recovery Fund notice is required on residential contracts over…", a: "$2,500", ids: ["1-115"] },
  { t: "lic", q: "Business loses its qualifier: temporary certificate allows…", a: "Finishing incomplete contracts only. 60 days to replace the qualifier.", ids: ["2-46"] },
  { t: "lic", q: "Secondary qualifier is never responsible for…", a: "Financial matters (the primary qualifier is)", ids: ["1-87"] },
  { t: "lic", q: "Max initial application fee for a certificate", a: "$150", ids: ["3-80"] },
  { t: "lic", q: "Late renewal (delinquency) fee can't exceed…", a: "The renewal fee", ids: ["2-60"] },
  { t: "lic", q: "Fine for an uncertified person associated with a contracting firm (§489.132)", a: "Up to $5,000 plus costs", ids: ["3-61"] },
  { t: "lic", q: "Max fine for letting an uncertified person use your certificate", a: "$10,000", ids: ["3-102"] },
  { t: "lic", q: "First offense: finishing a job without pulling a permit, fine up to…", a: "$5,000", ids: ["1-33"] },
  { t: "lic", q: "Third offense: false statement of insurance coverage", a: "$5,000 fine and/or probation or suspension", ids: ["2-77"] },
  { t: "lic", q: "License number required in advertising, except…", a: "Free Yellow Pages / free directory listings", ids: ["3-90", "3-104"] },
  { t: "lic", q: "Chapter 489 covers…", a: "Construction (Part I), electrical & alarm (Part II), septic tank (Part III) contracting", ids: ["3-57"] },

  // FS 455
  { t: "dbpr", q: "Dispute a citation within…", a: "30 days (or it becomes a final order)", ids: ["2-4"] },
  { t: "dbpr", q: "Citation must be issued within … of the complaint", a: "6 months", ids: ["2-88"] },
  { t: "dbpr", q: "Mediation: max times without Board approval", a: "3 times", ids: ["2-12"] },
  { t: "dbpr", q: "Mediation: tell the mediator about a resolution within…", a: "14 days after the mediator's contact", ids: ["2-78"] },
  { t: "dbpr", q: "Probable cause panel requests more info within…", a: "15 days of receiving the report", ids: ["1-24"] },
  { t: "dbpr", q: "Complaint stays confidential until … after probable cause", a: "10 days", ids: ["3-123"] },
  { t: "dbpr", q: "Minor violation becomes inactive after…", a: "2 years since the final order", ids: ["1-21"] },
  { t: "dbpr", q: "Deficient application files can be closed after…", a: "2 years after the deficiency notice", ids: ["1-6"] },
  { t: "dbpr", q: "Notify DBPR you can't attend an exam hearing at least…", a: "5 days before", ids: ["1-20"] },
  { t: "dbpr", q: "Renewal notice is sent at least…", a: "90 days before the cycle ends", ids: ["2-47"] },
  { t: "dbpr", q: "Limited license: who & how long licensed?", a: "Retired professionals, licensed 10+ years, serving the indigent/underserved", ids: ["1-17", "1-23", "2-70", "2-76"] },
  { t: "dbpr", q: "Theft or reproduction of an exam", a: "Third-degree felony", ids: ["1-25"] },
  { t: "dbpr", q: "Translated exam request (non-Spanish): file at least…", a: "6 months before the exam", ids: ["3-72"] },
  { t: "dbpr", q: "Probable cause panel member pay", a: "$50 per day", ids: ["3-52"] },
  { t: "dbpr", q: "CE provider submits completions electronically within…", a: "30 days", ids: ["3-82"] },
  { t: "dbpr", q: "Military: renewal fee waived during active duty and for … after discharge", a: "2 years", ids: ["3-39"] },
  { t: "dbpr", q: "$5 unlicensed activity fee is used to…", a: "Educate the public on (and combat) unlicensed activity", ids: ["2-94"] },

  // Lien law
  { t: "lien", q: "Notice to Owner deadline", a: "45 days from first furnishing labor/materials", ids: ["3-33", "2-123"] },
  { t: "lien", q: "NTO effective on the mailing date if mailed within…", a: "40 days of first furnishing", ids: ["3-105"] },
  { t: "lien", q: "Claim of lien must be recorded within…", a: "90 days after final furnishing", ids: ["3-26"] },
  { t: "lien", q: "Sworn statement of account: furnish within…", a: "30 days after the demand", ids: ["1-45"] },
  { t: "lien", q: "Notice of Commencement expires…", a: "1 year after recording, unless the NOC states otherwise", ids: ["1-93", "3-5"] },
  { t: "lien", q: "Spouse objects to the other spouse's contract within…", a: "10 days of learning of it", ids: ["3-64"] },
  { t: "lien", q: "Paying without lien releases from NTO lienors =", a: "Improper payments", ids: ["3-100"] },
  { t: "lien", q: "Who records and posts the Notice of Commencement?", a: "The Owner", ids: ["2-111"] },

  // AIA
  { t: "aia", q: "A201: Application for Payment goes to … at least … before the payment date", a: "The Architect, 10 days", ids: ["1-89", "2-96", "3-1"] },
  { t: "aia", q: "A201: Architect issues the Certificate for Payment within…", a: "7 days of the application", ids: ["2-119"] },
  { t: "aia", q: "Contractor pays the sub after receiving owner payment within…", a: "7 (working) days", ids: ["1-95", "2-36", "3-7"] },
  { t: "aia", q: "A401: sub unpaid 7 days → may stop work after…", a: "7 more days' written notice", ids: ["1-71"] },
  { t: "aia", q: "A201: Owner may correct contractor's default after…", a: "10 days after written notice", ids: ["1-46"] },
  { t: "aia", q: "A401: Contractor may correct sub's default after…", a: "5 days after notice", ids: ["2-115"] },
  { t: "aia", q: "A401: Contractor's notice before supplying work for a defaulting sub", a: "7 days' written notice", ids: ["1-86"] },
  { t: "aia", q: "A201: concealed conditions notice", a: "Owner + Architect, within 14 days of first observing", ids: ["2-10", "3-125"] },
  { t: "aia", q: "A201: claims must be initiated within…", a: "21 days of the event or of discovery, whichever is later", ids: ["2-41"] },
  { t: "aia", q: "A201: insurance cancellation notice", a: "Owner, within 3 business days", ids: ["1-58"] },
  { t: "aia", q: "A201: mediation stays proceedings for…", a: "60 days unless a court orders longer", ids: ["2-25"] },
  { t: "aia", q: "Change Order is signed by…", a: "Owner, Contractor and Architect (the Architect prepares it)", ids: ["1-52", "2-91", "3-88"] },
  { t: "aia", q: "Never included in CCD / change order costs", a: "Hand tools", ids: ["1-88", "2-56"] },
  { t: "aia", q: "Tests & inspections: who pays? Who pays when they fail?", a: "Owner pays; contractor pays if they fail", ids: ["1-8"] },
  { t: "aia", q: "Copies of the contract documents the owner furnishes", a: "One", ids: ["2-118"] },
  { t: "aia", q: "A701: clarification requests must reach the Architect…", a: "7 days before bids are due", ids: ["1-35"] },
  { t: "aia", q: "A701: bidder notifies a clerical error within…", a: "2 days", ids: ["1-62"] },
  { t: "aia", q: "A701: bidder asks for owner financing proof … before withdrawal period ends; owner answers within…", a: "Asks 14 days before; owner has 7 days", ids: ["1-85", "2-23"] },
  { t: "aia", q: "A701: bonds delivered to … within…", a: "The Owner, 3 days after contract execution", ids: ["1-28", "2-106"] },
  { t: "aia", q: "Changes to bidding documents are made by…", a: "Addendum", ids: ["1-69"] },

  // OSHA
  { t: "osha", q: "OSHA 300 log required for employers with…", a: "More than 10 employees (11+)", ids: ["1-34"] },
  { t: "osha", q: "Report a fatality to OSHA within…", a: "8 hours (hospitalization/amputation/eye loss: 24 hours)", ids: ["3-62"] },
  { t: "osha", q: "Post an OSHA citation for…", a: "3 days or until corrected, whichever is later", ids: ["3-38"] },
  { t: "osha", q: "False statements on OSHA records: max penalty", a: "$10,000 and 6 months", ids: ["3-120"] },
  { t: "osha", q: "Sling angle should be…", a: "Greater than 45° whenever possible", ids: ["2-54"] },
  { t: "osha", q: "Chain slings: inspection by a competent inspector (per FCM)", a: "Once a month", ids: ["3-13"] },
  { t: "osha", q: "2025 FCM: willful/repeated + posting violation max total", a: "$161,323 + $16,131 = $177,454", ids: ["2-116"] },
  { t: "osha", q: "2025 FCM: serious (high severity, greater probability) base penalty", a: "$16,131 (51–100 employees: −20%)", ids: ["3-25"] },

  // Labor
  { t: "labor", q: "Federal minimum wage", a: "$7.25/hour", ids: ["1-56", "3-106"] },
  { t: "labor", q: "16- or 17-year-old: max weekly hours while school is in session", a: "30 hours", ids: ["1-9", "2-7"] },
  { t: "labor", q: "Equal Pay Act: back pay for a willful violation", a: "3 years (otherwise 2)", ids: ["1-82"] },
  { t: "labor", q: "Title VII/ADA damage cap for 15–100 employees", a: "$50,000 (101–200: $100k; 201–500: $200k; 500+: $300k)", ids: ["3-22"] },
  { t: "labor", q: "Florida Civil Rights Act: back pay limit", a: "24 months before the complaint", ids: ["3-24"] },
  { t: "labor", q: "Clean Indoor Air Act: repeat smoking violation fine", a: "$500 (first: $100)", ids: ["1-16"] },
  { t: "labor", q: "Executive exemption: directs at least how many employees?", a: "2 or more", ids: ["1-15", "3-69"] },
  { t: "labor", q: "FS 760.50 (AIDS/HIV) applies to…", a: "All employers", ids: ["3-98"] },

  // WC / UC
  { t: "wc", q: "Workers' comp required in construction with…", a: "1 or more employees", ids: ["1-107", "3-32"] },
  { t: "wc", q: "Reemployment tax liability triggers", a: "$1,500 in wages in a quarter, or 1+ employee in 20 weeks", ids: ["2-33"] },
  { t: "wc", q: "Late RT-6 penalty", a: "$25 per month or fraction", ids: ["1-67"] },
  { t: "wc", q: "Multiple Worksite Report (BLS-3020) is filed…", a: "Quarterly, mailed separately from the RT-6", ids: ["1-41", "2-53"] },
  { t: "wc", q: "Unemployment benefit eligibility needs wages in…", a: "2 or more quarters of the base period", ids: ["3-78"] },
  { t: "wc", q: "Fail to file a required WC report (§440.185)", a: "Fine up to $500 per failure", ids: ["2-108"] },

  // Tax
  { t: "tax", q: "Form 941", a: "Quarterly: federal income tax withheld + Social Security & Medicare", ids: ["1-101", "3-27"] },
  { t: "tax", q: "Form 940", a: "Annual FUTA (federal unemployment) return", ids: ["2-6", "2-35"] },
  { t: "tax", q: "Florida sales tax return", a: "DR-15, paid monthly", ids: ["1-39", "2-51"] },
  { t: "tax", q: "1099-NEC is required for independent contractor payments of…", a: "$600 or more (per the exam references)", ids: ["1-118"] },

  // Org
  { t: "org", q: "Fictitious name is valid for…", a: "5 years, expiring Dec 31 of the 5th year", ids: ["1-43", "2-98", "3-28"] },
  { t: "org", q: "Fictitious name ownership change", a: "Cancel and re-register within 30 days", ids: ["2-69"] },
  { t: "org", q: "Expansion financing: years in business required / preferred", a: "2 / 5", ids: ["1-40"] },
  { t: "ins", q: "Surety's 3 Cs", a: "Capital, Character, Capacity", ids: ["1-38"] },

  // Law
  { t: "law", q: "Statute of limitations: oral contract / written contract", a: "4 years / 5 years", ids: ["3-48"] },
  { t: "law", q: "UCC: sale of goods must be in writing at…", a: "$500 or more", ids: ["1-64", "3-53"] },

  // Est
  { t: "est", q: "FDEP demolition notification", a: "10 working days before, even with no asbestos", ids: ["1-59", "3-75"] },
  { t: "est", q: "Schedule progress posting / short-term schedule window", a: "At least weekly / next 2 weeks", ids: ["1-32", "1-117"] },
  { t: "est", q: "Equipment speed: average % of speed limit", a: "40–65%", ids: ["1-61"] },
  { t: "est", q: "Master activity: max share of the project", a: "10%", ids: ["3-71"] },
  { t: "est", q: "CSI MasterFormat divisions", a: "50", ids: ["3-118"] },
  { t: "acct", q: "Current liabilities = due within…", a: "365 days (1 year)", ids: ["1-112", "3-54", "3-92"] },
  { t: "job", q: "Completed contract: job is \"complete\" when…", a: "98%–99% complete", ids: ["1-51"] }
];

/* Formula sheet — shown in the Math Lab. */
window.FORMULAS = [
  { name: "Accounting equation", f: "Assets = Liabilities + Owner's Equity  →  Assets − Liabilities = Net Worth" },
  { name: "Straight-line depreciation (annual)", f: "(Cost − Salvage) ÷ Useful life (years)" },
  { name: "Book value", f: "Cost − Accumulated depreciation" },
  { name: "Gain / loss on sale of equipment", f: "Sale price − Book value   (+ gain, − loss)" },
  { name: "Percent complete", f: "Cost to date ÷ (Cost to date + Estimated cost to complete)" },
  { name: "Earned revenue (% of completion)", f: "% complete × Contract price" },
  { name: "Over / under billing", f: "Billed − Earned   (+ overbilled / unearned income, − underbilled)" },
  { name: "Contract price with profit on cost", f: "Total cost × (1 + profit %)" },
  { name: "Simple interest", f: "Principal × Rate × (Months ÷ 12)" },
  { name: "Current ratio", f: "Current assets ÷ Current liabilities" },
  { name: "Profit margin → required sales", f: "Sales = Net income ÷ Margin %" },
  { name: "Real turnover (combined ratio)", f: "Cost of sales ÷ Inventory at cost" },
  { name: "Day-rate overtime check", f: "Regular rate = total pay ÷ hours. If below $7.25, use $7.25. OT = hours over 40 × rate × 1.5" },
  { name: "Sales tax journal entry", f: "Dr Cash/AR (price + tax);  Cr Sales (price);  Cr Sales Tax Payable (tax)" },
  { name: "OSHA proposed penalty", f: "Base (gravity) × (1 − size reduction) × (1 − history reduction, only if no citations in 3 yrs)" },
  { name: "Resource leveling", f: "Total units needed across the period ÷ number of periods" }
];
