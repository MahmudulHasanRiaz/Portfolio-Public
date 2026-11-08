// Bangla fixed-UI dictionary — same keys as src/i18n/en.ts, faithful
// translations of the English strings (no new claims). Content
// (titles, descriptions, lyrics) is NOT here: it comes from the
// collections / API and is localised per-item via the optional
// nested `bn` object (see lib/i18n.ts).

export interface Dict {
	navWork: string;
	navVentures: string;
	navNasheed: string;
	navAbout: string;
	navContact: string;
	profileSe: string;
	profileKnowMe: string;
	chooseProfile: string;
	resumeRotation: string;
	switchLanguage: string;
	switchToLight: string;
	switchToDark: string;
	heroHeadline: string;
	heroDescription: string;
	knowMeHeadline: string;
	knowMeSub: string;
	heroLocation: string;
	photoAlt: string;
	viewMyWork: string;
	contactMe: string;
	listenReleases: string;
	followConnect: string;
	projectsShipped: string;
	ordersDaily: string;
	designationSe: string[];
	designationKnowMe: string[];
	statYears: string;
	statProjects: string;
	statClients: string;
	statReleases: string;
	releasesSub: string;
	servicesTitle: string;
	servicesSub: string;
	learnMoreAbout: string;
	contactAboutService: string;
	openingContact: string;
	close: string;
	projectsTitle: string;
	projectsSub: string;
	viewAllProjects: string;
	viewAllCaseStudies: string;
	viewAllPosts: string;
	viewAllReleases: string;
	viewAllVentures: string;
	caseStudiesTitle: string;
	caseStudiesSub: string;
	readCaseStudy: string;
	stackTitle: string;
	stackSub: string;
	stackFilter: string;
	nowLabel: string;
	spin: string;
	spinLabel: string;
	beyondTitle: string;
	beyondSub: string;
	entrepreneurTitle: string;
	entrepreneurText: string;
	venturesEmptyShort: string;
	artistTitle: string;
	artistPoints: string[];
	wantWholePicture: string;
	wholePictureText: string;
	knowMeCta: string;
	clientsTitle: string;
	latestPostsTitle: string;
	latestPostsSub: string;
	contactTitle: string;
	contactSub: string;
	wholePersonTitle: string;
	aboutP1: string;
	aboutP2: string;
	aboutP3: string;
	identitySeText: string;
	identityEntrepreneurText: string;
	identityArtistText: string;
	identityHafizText: string;
	identityPublicText: string;
	publicFigureTitle: string;
	publicFigureTitles: string[];
	publicFigureVentures: string;
	publicFigureSocial: string;
	publicFigureVoice: string;
	findSocial: string;
	listenNasheed: string;
	selectedProjects: string;
	reachOutTitle: string;
	reachOutSub: string;
	platformsTitle: string;
	platformsIntro: string;
	platformsMusic: string;
	platformsMusicBlurb: string;
	platformsSocial: string;
	platformsSocialBlurb: string;
	platformsProfessional: string;
	platformsProfessionalBlurb: string;
	backHome: string;
	allProjects: string;
	allPosts: string;
	allReleases: string;
	allVentures: string;
	allCaseStudies: string;
	allChip: string;
	showingProjects: string;
	showingPosts: string;
	showingReleases: string;
	showingVentures: string;
	emptyProjects: string;
	emptyPosts: string;
	emptyCaseStudies: string;
	emptyVentures: string;
	emptyReleases: string;
	releaseTypeNasheed: string;
	releaseTypeTilawat: string;
	releaseTypePodcast: string;
	releaseTypeLecture: string;
	releaseTypeOther: string;
	audioOnly: string;
	viewDetailsFor: string;
	availableOn: string;
	backAllProjects: string;
	backAllPosts: string;
	backAllReleases: string;
	backAllVentures: string;
	backAllCaseStudies: string;
	backCaseStudy: string;
	aboutProject: string;
	aboutRelease: string;
	aboutVenture: string;
	problem: string;
	fix: string;
	result: string;
	research: string;
	tune: string;
	lyricist: string;
	lyrics: string;
	listenWatch: string;
	videoLabel: string;
	audioLabel: string;
	publishedLabel: string;
	clientLabel: string;
	roleLabel: string;
	categoryLabel: string;
	statusLabel: string;
	liveSiteLabel: string;
	visitSite: string;
	stageLabel: string;
	locationLabel: string;
	teamSizeLabel: string;
	foundedLabel: string;
	websiteLabel: string;
	visitWebsite: string;
	projectLabel: string;
	viewProject: string;
	authorBy: string;
	authorLine: string;
	morePosts: string;
	previous: string;
	next: string;
	previousProject: string;
	nextProject: string;
	loadingProjects: string;
	builtWith: string;
	notFoundProject: string;
	notFoundPost: string;
	notFoundRelease: string;
	notFoundVenture: string;
	notFoundCaseStudy: string;
	notPublishedProject: string;
	notPublishedPost: string;
	notPublishedRelease: string;
	notPublishedVenture: string;
	notPublishedCaseStudy: string;
	wantSystemLike: string;
	discussSimilarProject: string;
	discussSimilarVenture: string;
	facingSimilar: string;
	caseStudyCtaText: string;
	ventureCtaText: string;
	projectCtaText: string;
	thinkingVenture: string;
	formName: string;
	formNamePlaceholder: string;
	formEmail: string;
	formEmailPlaceholder: string;
	formPhone: string;
	formPhonePlaceholder: string;
	formService: string;
	formSelectService: string;
	formMessage: string;
	formMessagePlaceholder: string;
	formSend: string;
	formSending: string;
	formThanks: string;
	formReplyPersonal: string;
	formSendAnother: string;
	formPreferEmail: string;
	formErrorName: string;
	formErrorContact: string;
	formErrorEmail: string;
	formErrorPhone: string;
	formHintContact: string;
	formPreselected: string;
	modalSub: string;
	footerSubSe: string;
	footerSubKnowMe: string;
	footerAllPlatforms: string;
	footerRights: string;
	playVideo: string;
	playHere: string;
	watchOnYouTube: string;
	homeTitle: string;
	homeDescription: string;
	knowMeTitle: string;
	knowMeDescription: string;
	platformsPageTitle: string;
	platformsPageDescription: string;
	projectsPageTitle: string;
	projectsPageDescription: string;
	postsPageTitle: string;
	postsPageDescription: string;
	releasesPageTitle: string;
	releasesPageDescription: string;
	venturesPageTitle: string;
	venturesPageDescription: string;
	caseStudiesPageTitle: string;
	caseStudiesPageDescription: string;
}

export const bn: Dict = {
	navWork: "কাজ",
	navVentures: "উদ্যোগ",
	navNasheed: "নাশিদ",
	navAbout: "আমার সম্পর্কে",
	navContact: "যোগাযোগ",
	profileSe: "সফটওয়্যার ইঞ্জিনিয়ার",
	profileKnowMe: "আমাকে জানুন",
	chooseProfile: "একটি প্রোফাইল বেছে নিন",
	resumeRotation: "স্বয়ংক্রিয় ঘূর্ণন চালু করুন",
	switchLanguage: "ভাষা বদলান",
	switchToLight: "হালকা মোডে যান",
	switchToDark: "অন্ধকার মোডে যান",
	heroHeadline: "আমি এমন পণ্য তৈরি করি যার ওপর মানুষ প্রতিদিন ভরসা করে।",
	heroDescription:
		"বাংলাদেশ ও বিশ্বের ব্যবসার জন্য ইআরপি, ই-কমার্স ও স্যাস সিস্টেম — বাস্তব চাপে টিকে থাকার মতো করে তৈরি।",
	knowMeHeadline:
		"সফটওয়্যার ইঞ্জিনিয়ার, উদ্যোক্তা ও নাশিদ শিল্পী — এক মানুষ, পাঁচটি পরিচয়।",
	knowMeSub:
		"মাহমুদুল হাসান রিয়াজ — একজন হাফিজ-আলেম, যিনি ইআরপি ও ই-কমার্স সফটওয়্যার তৈরি করেন, তিনটি উদ্যোগ প্রতিষ্ঠা করেছেন, এবং বিশ্বজুড়ে শ্রোতাদের সঙ্গে নাশিদ, তিলাওয়াত ও বক্তব্য শেয়ার করেন।",
	heroLocation: "ঢাকা, বাংলাদেশ",
	photoAlt: "মাহমুদুল হাসান রিয়াজ মঞ্চে বক্তব্য দিচ্ছেন",
	viewMyWork: "আমার কাজ দেখুন",
	contactMe: "যোগাযোগ করুন",
	listenReleases: "রিলিজগুলো শুনুন",
	followConnect: "ফলো করুন ও যুক্ত থাকুন",
	projectsShipped: "প্রকল্প সম্পন্ন",
	ordersDaily: "দৈনিক পরিচালিত অর্ডার",
	designationSe: ["সফটওয়্যার ইঞ্জিনিয়ার"],
	designationKnowMe: [
		"সফটওয়্যার ইঞ্জিনিয়ার",
		"উদ্যোক্তা",
		"নাশিদ শিল্পী",
		"হাফিজ-আলেম",
		"পাবলিক ফিগার",
	],
	statYears: "বছরের অভিজ্ঞতা",
	statProjects: "প্রকল্প",
	statClients: "ক্লায়েন্ট",
	statReleases: "রিলিজ",
	releasesSub:
		"নাশিদ, তিলাওয়াত, পডকাস্ট ও লেকচার — প্রতিটি রিলিজ, যে প্ল্যাটফর্মে আছে সেইসহ।",
	servicesTitle: "সেবাসমূহ",
	servicesSub: "আপনার ব্যবসার জন্য আমি যা তৈরি ও উন্নত করতে পারি।",
	learnMoreAbout: "সম্পর্কে আরও জানুন",
	contactAboutService: "এই সেবা সম্পর্কে যোগাযোগ করুন",
	openingContact: "যোগাযোগ খোলা হচ্ছে…",
	close: "বন্ধ করুন",
	projectsTitle: "প্রকল্পসমূহ",
	projectsSub: "নির্বাচিত কাজ — বাস্তব ব্যবসা চালানো বাস্তব সিস্টেম।",
	viewAllProjects: "সব প্রকল্প দেখুন →",
	viewAllCaseStudies: "সব কেস স্টাডি দেখুন →",
	viewAllPosts: "সব পোস্ট দেখুন →",
	viewAllReleases: "সব রিলিজ দেখুন →",
	viewAllVentures: "সব উদ্যোগ দেখুন →",
	caseStudiesTitle: "কেস স্টাডি",
	caseStudiesSub:
		"সমস্যা, সমাধান, ফলাফল — প্রতিটি এক লাইনে। পুরো গল্প পড়তে কেস স্টাডিতে ট্যাপ করুন।",
	readCaseStudy: "কেস স্টাডিটি পড়ুন",
	stackTitle: "আমি যে স্ট্যাকে কাজ করি",
	stackSub:
		"উপরের পণ্যগুলোর পেছনের টুলস — সবগুলো দেখতে গ্লোবটি টেনে ঘোরান।",
	stackFilter: "বিভাগ অনুযায়ী স্ট্যাক ছাঁকুন",
	nowLabel: "এখন:",
	spin: "ঘোরান",
	spinLabel: "গ্লোব ঘুরিয়ে একটি এলোমেলো প্রযুক্তি দেখুন",
	beyondTitle: "কোডের বাইরে",
	beyondSub:
		"এক মানুষ, আরও দুটি পরিচয় — কোম্পানি গড়া, আর নাশিদ রেকর্ড করা।",
	entrepreneurTitle: "উদ্যোক্তা ও পাবলিক ফিগার",
	entrepreneurText:
		"তিনটি উদ্যোগের প্রতিষ্ঠাতা — পাশাপাশি ঢাকায় কমিউনিটি ও দাতব্য উদ্যোগ, এবং ঈমান, কাজ ও প্রযুক্তি নিয়ে আলোচনা।",
	venturesEmptyShort: "প্রকাশিত হলে এখানে উদ্যোগগুলো দেখা যাবে।",
	artistTitle: "ইসলামিক শিল্পী",
	artistPoints: [
		"নাশিদ, তিলাওয়াত, পডকাস্ট ও লেকচার রিলিজ",
		"হাফিজ — কুরআন মুখস্থ করেছেন; ইসলামিক স্কলার",
		"ইউটিউব ও স্পটিফায় জুড়ে ১০+ রিলিজ",
	],
	wantWholePicture: "পুরো ছবিটা দেখতে চান?",
	wholePictureText:
		"প্রতিটি উদ্যোগ ও প্রতিটি রিলিজ, পূর্ণাঙ্গভাবে — আমাকে জানুন পৃষ্ঠায়।",
	knowMeCta: "আমাকে জানুন →",
	clientsTitle: "ক্লায়েন্ট",
	latestPostsTitle: "সাম্প্রতিক পোস্ট",
	latestPostsSub: "তৈরি করা নিয়ে নোট, আর নাশিদের কাজ নিয়ে।",
	contactTitle: "কোনো প্রকল্পের কথা ভাবছেন?",
	contactSub:
		"আপনি কী তৈরি করছেন জানান — আমি নিজে উত্তর দিই, সাধারণত এক দিনের মধ্যে।",
	wholePersonTitle: "পুরো মানুষটি",
	aboutP1:
		"মাহমুদুল হাসান রিয়াজ ঢাকা, বাংলাদেশের একজন সফটওয়্যার ইঞ্জিনিয়ার। তিনি বাংলাদেশ ও বিশ্বের ব্যবসার জন্য ইআরপি, ই-কমার্স ও স্যাস সিস্টেম তৈরি করেন।",
	aboutP2:
		"তিনি একজন উদ্যোক্তা ও পাবলিক ফিগারও — বাংলাদেশি ব্যবসার বাস্তব সমস্যা সমাধানকারী কোম্পানি গড়ছেন, আর সরাসরি ও অনলাইনে কথা বলছেন, শেখাচ্ছেন ও শেয়ার করছেন।",
	aboutP3:
		"নাশিদ শিল্পী ও হাফিজ-আলেম হিসেবে তিনি সংগীত ছাড়া নাশিদ রেকর্ড করেন — শুধু কণ্ঠ, কথা ও অর্থ।",
	identitySeText:
		"বাংলাদেশ ও বিশ্বের ব্যবসার জন্য ইআরপি, ই-কমার্স ও স্যাস সিস্টেম তৈরি করেন।",
	identityEntrepreneurText:
		"বাংলাদেশি ব্যবসার বাস্তব সমস্যা সমাধানকারী কোম্পানি গড়ছেন।",
	identityArtistText:
		"সংগীত ছাড়া নাশিদ রেকর্ড করেন — শুধু কণ্ঠ, কথা ও অর্থ।",
	identityHafizText: "কুরআনের হাফিজ, আলেম হিসেবে প্রশিক্ষিত।",
	identityPublicText: "সরাসরি ও অনলাইনে কথা বলা, শেখানো ও শেয়ার করা।",
	publicFigureTitle: "পাবলিক ফিগার ও কমিউনিটি",
	publicFigureTitles: ["উদ্যোগ", "সামাজিক কার্যক্রম", "জনসম্মুখে কণ্ঠ"],
	publicFigureVentures:
		"বাংলাদেশি ব্যবসার বাস্তব সমস্যা সমাধানকারী কোম্পানি গড়ছেন।",
	publicFigureSocial: "ঢাকা ও আশপাশে কমিউনিটি কাজ ও পাবলিক উদ্যোগ।",
	publicFigureVoice: "সরাসরি ও অনলাইনে কথা বলা, শেখানো ও শেয়ার করা।",
	findSocial: "সোশ্যাল মিডিয়ায় তাঁকে খুঁজুন",
	listenNasheed: "তাঁর নাশিদ শুনুন",
	selectedProjects: "নির্বাচিত প্রকল্প",
	reachOutTitle: "যোগাযোগ করুন — কাজ, কোনো অনুষ্ঠান, কিংবা শুধু সালাম জানাতে।",
	reachOutSub:
		"প্রকল্পের অনুসন্ধান, বক্তব্য ও অনুষ্ঠানের আমন্ত্রণ, এবং শ্রোতাদের বার্তা — সবই স্বাগত; তিনি নিজে পড়েন ও উত্তর দেন, সাধারণত এক দিনের মধ্যে।",
	platformsTitle: "সব প্ল্যাটফর্ম",
	platformsIntro: "প্রতিটি প্রোফাইল, এক জায়গায় — যেখানে থাকে সেই অনুযায়ী সাজানো।",
	platformsMusic: "নাশিদ ও স্ট্রিমিং",
	platformsMusicBlurb: "নাশিদ যেখানে থাকে — চ্যানেল ও শিল্পী প্রোফাইল।",
	platformsSocial: "সোশ্যাল মিডিয়া",
	platformsSocialBlurb: "প্রতিদিনের আপডেট, কমিউনিটি ও পাবলিক কাজ।",
	platformsProfessional: "পেশাগত / কোড",
	platformsProfessionalBlurb: "ইঞ্জিনিয়ারিংয়ের কাজ, সবার সামনে।",
	backHome: "← হোমে ফিরুন",
	allProjects: "সব প্রকল্প",
	allPosts: "সব পোস্ট",
	allReleases: "সব রিলিজ",
	allVentures: "সব উদ্যোগ",
	allCaseStudies: "সব কেস স্টাডি",
	allChip: "সবগুলো",
	showingProjects: "মোট {total}টি প্রকল্পের মধ্যে {shown}টি দেখানো হচ্ছে",
	showingPosts: "মোট {total}টি পোস্টের মধ্যে {shown}টি দেখানো হচ্ছে",
	showingReleases: "মোট {total}টি রিলিজের মধ্যে {shown}টি দেখানো হচ্ছে",
	showingVentures: "মোট {total}টি উদ্যোগের মধ্যে {shown}টি দেখানো হচ্ছে",
	emptyProjects: "এখনো কোনো প্রকল্প প্রকাশিত হয়নি।",
	emptyPosts: "এখনো কোনো পোস্ট প্রকাশিত হয়নি।",
	emptyCaseStudies: "এখনো কোনো কেস স্টাডি প্রকাশিত হয়নি।",
	emptyVentures: "এখনো কোনো উদ্যোগ প্রকাশিত হয়নি।",
	emptyReleases: "এখনো কোনো রিলিজ প্রকাশিত হয়নি।",
	releaseTypeNasheed: "নাশিদ",
	releaseTypeTilawat: "তিলাওয়াত",
	releaseTypePodcast: "পডকাস্ট",
	releaseTypeLecture: "লেকচার",
	releaseTypeOther: "অন্যান্য",
	audioOnly: "শুধু অডিও — ইউটিউবে নেই",
	viewDetailsFor: "বিস্তারিত দেখুন",
	availableOn: "যেখানে পাওয়া যাবে",
	backAllProjects: "← সব প্রকল্প",
	backAllPosts: "← সব পোস্ট",
	backAllReleases: "← সব রিলিজ",
	backAllVentures: "← সব উদ্যোগ",
	backAllCaseStudies: "← সব কেস স্টাডি",
	backCaseStudy: "← কেস স্টাডিতে ফিরুন",
	aboutProject: "এই প্রকল্প সম্পর্কে",
	aboutRelease: "এই রিলিজ সম্পর্কে",
	aboutVenture: "সম্পর্কে",
	problem: "সমস্যাটি",
	fix: "সমাধানটি",
	result: "ফলাফল",
	research: "গবেষণায় যা দেখা গেল",
	tune: "সুর",
	lyricist: "গীতিকার",
	lyrics: "গানের কথা",
	listenWatch: "শুনুন ও দেখুন",
	videoLabel: "ভিডিও",
	audioLabel: "অডিও",
	publishedLabel: "প্রকাশিত",
	clientLabel: "ক্লায়েন্ট",
	roleLabel: "ভূমিকা",
	categoryLabel: "বিভাগ",
	statusLabel: "অবস্থা",
	liveSiteLabel: "লাইভ সাইট",
	visitSite: "সাইটটি দেখুন",
	stageLabel: "পর্যায়",
	locationLabel: "অবস্থান",
	teamSizeLabel: "দলের আকার",
	foundedLabel: "প্রতিষ্ঠিত",
	websiteLabel: "ওয়েবসাইট",
	visitWebsite: "ওয়েবসাইটটি দেখুন",
	projectLabel: "প্রকল্প",
	viewProject: "প্রকল্পটি দেখুন",
	authorBy: "লেখক",
	authorLine: "সফটওয়্যার ইঞ্জিনিয়ার · উদ্যোক্তা · নাশিদ শিল্পী — ঢাকা",
	morePosts: "আরও পোস্ট",
	previous: "আগেরটি",
	next: "পরেরটি",
	previousProject: "আগের প্রকল্প",
	nextProject: "পরের প্রকল্প",
	loadingProjects: "প্রকল্প লোড হচ্ছে",
	builtWith: "যা দিয়ে তৈরি",
	notFoundProject: "প্রকল্পটি পাওয়া যায়নি",
	notFoundPost: "পোস্টটি এখনো প্রকাশিত হয়নি",
	notFoundRelease: "রিলিজটি এখনো প্রকাশিত হয়নি",
	notFoundVenture: "উদ্যোগটি এখনো প্রকাশিত হয়নি",
	notFoundCaseStudy: "কেস স্টাডিটি পাওয়া যায়নি",
	notPublishedProject: "এই প্রকল্পটি এখনো প্রকাশিত হয়নি।",
	notPublishedPost: "এই পোস্টটি এখনো প্রকাশিত হয়নি।",
	notPublishedRelease: "এই রিলিজটি এখনো প্রকাশিত হয়নি।",
	notPublishedVenture: "এই উদ্যোগটি এখনো প্রকাশিত হয়নি।",
	notPublishedCaseStudy: "এই কেস স্টাডিটি এখনো প্রকাশিত হয়নি।",
	wantSystemLike: "এমন একটি সিস্টেম চান",
	discussSimilarProject: "একই ধরনের প্রকল্প নিয়ে আলোচনা করুন",
	discussSimilarVenture: "একই ধরনের উদ্যোগ নিয়ে আলোচনা করুন",
	facingSimilar: "একই ধরনের সমস্যার মুখোমুখি?",
	caseStudyCtaText:
		"আপনার প্রকল্প সম্পর্কে জানান — অথবা আগে দেখে নিন এই কেস স্টাডির সিস্টেমটি।",
	ventureCtaText: "আপনার উদ্যোগ সম্পর্কে জানান — আমি নিজে উত্তর দেব।",
	projectCtaText: "আপনি কী তৈরি করছেন জানান — আমি এক দিনের মধ্যে উত্তর দেব।",
	thinkingVenture: "এমন কিছু তৈরির কথা ভাবছেন",
	formName: "আপনার নাম *",
	formNamePlaceholder: "আপনার পুরো নাম",
	formEmail: "ইমেইল",
	formEmailPlaceholder: "you@example.com",
	formPhone: "ফোন",
	formPhonePlaceholder: "01XXXXXXXXX",
	formService: "সেবা (ঐচ্ছিক)",
	formSelectService: "একটি সেবা বেছে নিন...",
	formMessage: "বার্তা (ঐচ্ছিক)",
	formMessagePlaceholder: "আপনার কী প্রয়োজন একটু জানান...",
	formSend: "বার্তা পাঠান",
	formSending: "পাঠানো হচ্ছে...",
	formThanks: "ধন্যবাদ — শীঘ্রই উত্তর দেব।",
	formReplyPersonal: "প্রতিটি বার্তার উত্তর আমি নিজে দিই।",
	formSendAnother: "আরেকটি বার্তা পাঠান",
	formPreferEmail: "ইমেইল পছন্দ? লিখুন —",
	formErrorName: "অনুগ্রহ করে আপনার নামটি জানান।",
	formErrorContact:
		"আমি যেন উত্তর দিতে পারি, অনুগ্রহ করে আপনার ইমেইল বা ফোন নম্বর দিন।",
	formErrorEmail: "ইমেইল ঠিকানাটি সঠিক মনে হচ্ছে না।",
	formErrorPhone:
		"অনুগ্রহ করে একটি বাংলাদেশি মোবাইল নম্বর দিন — 01XXXXXXXXX অথবা +8801XXXXXXXXX।",
	formHintContact:
		"অন্তত একটি দিন — ইমেইল বা ফোন — যাতে আমি উত্তর দিতে পারি। অন্যটি ঐচ্ছিক।",
	formPreselected:
		"আপনি যা দেখছিলেন তার ভিত্তিতে আগে থেকেই বেছে নেওয়া হয়েছে — চাইলে বদলাতে পারেন।",
	modalSub: "আপনার কী প্রয়োজন জানান — আমি নিজে উত্তর দিই।",
	footerSubSe:
		"সফটওয়্যার ইঞ্জিনিয়ার · উদ্যোক্তা · ইসলামিক শিল্পী — ঢাকা, বাংলাদেশ",
	footerSubKnowMe:
		"সফটওয়্যার ইঞ্জিনিয়ার · উদ্যোক্তা · নাশিদ শিল্পী · হাফিজ-আলেম · পাবলিক ফিগার — ঢাকা, বাংলাদেশ",
	footerAllPlatforms: "সব প্ল্যাটফর্ম →",
	footerRights: "সর্বস্বত্ব সংরক্ষিত।",
	playVideo: "ভিডিও চালান",
	playHere: "এখানে চালান",
	watchOnYouTube: "ইউটিউবে দেখুন",
	homeTitle: "মাহমুদুল হাসান রিয়াজ — সফটওয়্যার ইঞ্জিনিয়ার, উদ্যোক্তা ও নাশিদ শিল্পী",
	homeDescription:
		"ঢাকা, বাংলাদেশের সফটওয়্যার ইঞ্জিনিয়ার, উদ্যোক্তা ও নাশিদ শিল্পী। বাংলাদেশ ও বিশ্বের ব্যবসার জন্য ইআরপি, ই-কমার্স ও স্যাস সিস্টেম।",
	knowMeTitle: "আমাকে জানুন — মাহমুদুল হাসান রিয়াজ",
	knowMeDescription:
		"পুরো মানুষটি: সফটওয়্যার ইঞ্জিনিয়ার, উদ্যোক্তা, নাশিদ শিল্পী, হাফিজ-আলেম ও পাবলিক ফিগার।",
	platformsPageTitle: "সব প্ল্যাটফর্ম — মাহমুদুল হাসান রিয়াজ",
	platformsPageDescription:
		"মাহমুদুল হাসান রিয়াজকে যেখানে যেখানে পাওয়া যাবে — স্ট্রিমিং, সোশ্যাল মিডিয়া ও পেশাগত প্রোফাইল।",
	projectsPageTitle: "সব প্রকল্প — মাহমুদুল হাসান রিয়াজ",
	projectsPageDescription:
		"মাহমুদুল হাসান রিয়াজের সব প্রকল্প — বাংলাদেশ ও বিশ্বের ব্যবসার জন্য ইআরপি, স্যাস ও ই-কমার্স সিস্টেম।",
	postsPageTitle: "সব পোস্ট — মাহমুদুল হাসান রিয়াজ",
	postsPageDescription:
		"মাহমুদুল হাসান রিয়াজের পোস্ট — ইআরপি, ই-কমার্স, ওয়ার্ডপ্রেস ও নাশিদ।",
	releasesPageTitle: "সব রিলিজ — মাহমুদুল হাসান রিয়াজ",
	releasesPageDescription:
		"মাহমুদুল হাসান রিয়াজের নাশিদ, তিলাওয়াত, পডকাস্ট ও লেকচার রিলিজ।",
	venturesPageTitle: "সব উদ্যোগ — মাহমুদুল হাসান রিয়াজ",
	venturesPageDescription:
		"মাহমুদুল হাসান রিয়াজের উদ্যোগ — বাংলাদেশি ব্যবসার জন্য তৈরি কোম্পানি।",
	caseStudiesPageTitle: "সব কেস স্টাডি — মাহমুদুল হাসান রিয়াজ",
	caseStudiesPageDescription:
		"মাহমুদুল হাসান রিয়াজের কেস স্টাডি — সিস্টেমগুলো কীভাবে তৈরি হয়েছিল এবং কী বদলে দিয়েছিল।",
};
