export type LanguageCode = "en" | "tw" | "fr";

export type TranslationKey =
  | "language.label"
  | "language.english"
  | "language.twi"
  | "language.french"
  | "common.close"
  | "common.tryAgain"
  | "common.send"
  | "marketplace.title"
  | "marketplace.showcaseProduct"
  | "marketplace.filters.all"
  | "marketplace.filters.food"
  | "marketplace.filters.drug"
  | "marketplace.filters.farm"
  | "marketplace.loadingFeed"
  | "marketplace.noProducts"
  | "marketplace.pendingApproval"
  | "marketplace.awaitingApproval"
  | "marketplace.verifyCode"
  | "marketplace.tapToCheck"
  | "marketplace.scanToVerify"
  | "marketplace.share"
  | "marketplace.save"
  | "marketplace.saved"
  | "marketplace.approvePost"
  | "marketplace.noComments"
  | "marketplace.addComment"
  | "marketplace.feedLoadError"
  | "marketplace.serverWaking"
  | "marketplace.shareScanBefore"
  | "marketplace.postIntro"
  | "marketplace.changePhoto"
  | "marketplace.addPhoto"
  | "marketplace.productTitle"
  | "marketplace.caption"
  | "marketplace.locationPlaceholder"
  | "marketplace.hashtagsPlaceholder"
  | "marketplace.qrPlaceholder"
  | "marketplace.imageReadError"
  | "marketplace.titleRequired"
  | "marketplace.postFailed"
  | "marketplace.submitted"
  | "marketplace.postButton"
  | "marketplace.posting";

type Dictionary = Record<TranslationKey, string>;

export const SUPPORTED_LANGUAGES: { code: LanguageCode; labelKey: TranslationKey }[] = [
  { code: "en", labelKey: "language.english" },
  { code: "tw", labelKey: "language.twi" },
  { code: "fr", labelKey: "language.french" },
];

export const translations: Record<LanguageCode, Dictionary> = {
  en: {
    "language.label": "Language",
    "language.english": "English",
    "language.twi": "Twi",
    "language.french": "French",
    "common.close": "Close",
    "common.tryAgain": "Try again",
    "common.send": "Send",
    "marketplace.title": "Marketplace",
    "marketplace.showcaseProduct": "+ Showcase a product",
    "marketplace.filters.all": "All Products",
    "marketplace.filters.food": "Food",
    "marketplace.filters.drug": "Drugs",
    "marketplace.filters.farm": "Farms",
    "marketplace.loadingFeed": "Loading feed...",
    "marketplace.noProducts": "No products posted yet.",
    "marketplace.pendingApproval": "Pending approval",
    "marketplace.awaitingApproval": "Awaiting regulator approval before it goes public.",
    "marketplace.verifyCode": "Verify code",
    "marketplace.tapToCheck": "Tap to check live safety status",
    "marketplace.scanToVerify": "Scan to verify",
    "marketplace.share": "Share",
    "marketplace.save": "Save",
    "marketplace.saved": "Saved",
    "marketplace.approvePost": "Approve this post",
    "marketplace.noComments": "No comments yet. Be the first.",
    "marketplace.addComment": "Add a comment...",
    "marketplace.feedLoadError": "Could not load the feed.",
    "marketplace.serverWaking": "Server is waking up. Please retry in a moment.",
    "marketplace.shareScanBefore": "Scan before you buy. Stay safe with FoodTrace GH.",
    "marketplace.postIntro": "Post a {domain} product. Add a photo and QR code to show the verified safety badge.",
    "marketplace.changePhoto": "Change photo",
    "marketplace.addPhoto": "Add product photo",
    "marketplace.productTitle": "Product title",
    "marketplace.caption": "Caption",
    "marketplace.locationPlaceholder": "Location (e.g. Greater Accra)",
    "marketplace.hashtagsPlaceholder": "Hashtags: organic, Accra",
    "marketplace.qrPlaceholder": "Product QR code (e.g. FT-QR-1001)",
    "marketplace.imageReadError": "Could not read that image.",
    "marketplace.titleRequired": "Add a product title.",
    "marketplace.postFailed": "Could not post.",
    "marketplace.submitted": "Submitted for approval.",
    "marketplace.postButton": "Post to marketplace",
    "marketplace.posting": "Posting..."
  },
  tw: {
    "language.label": "Kasa",
    "language.english": "Borɔfo",
    "language.twi": "Twi",
    "language.french": "French",
    "common.close": "To mu",
    "common.tryAgain": "San sɔ hwɛ",
    "common.send": "Soma",
    "marketplace.title": "Gua so",
    "marketplace.showcaseProduct": "+ Kyerɛ wo ade",
    "marketplace.filters.all": "Nneɛma nyinaa",
    "marketplace.filters.food": "Aduane",
    "marketplace.filters.drug": "Aduru",
    "marketplace.filters.farm": "Mfuw",
    "marketplace.loadingFeed": "Ɛrehyɛ feed no mu...",
    "marketplace.noProducts": "Wonnya ntoo ade biara gua so.",
    "marketplace.pendingApproval": "Ɛretwɛn pene so",
    "marketplace.awaitingApproval": "Ɛretwɛn regulator pene so ansa na obiara behu.",
    "marketplace.verifyCode": "Hwɛ code no",
    "marketplace.tapToCheck": "Mia so na hwɛ safety tebea no",
    "marketplace.scanToVerify": "Scan na hwɛ mu",
    "marketplace.share": "Kyɛ",
    "marketplace.save": "Sie",
    "marketplace.saved": "Wɔasie",
    "marketplace.approvePost": "Pene post yi so",
    "marketplace.noComments": "Comment biara nni hɔ. Di kan.",
    "marketplace.addComment": "Kyerɛw comment...",
    "marketplace.feedLoadError": "Antumi amfa feed no amma.",
    "marketplace.serverWaking": "Server no resɔre. San sɔ hwɛ kakra.",
    "marketplace.shareScanBefore": "Scan ansa na woatɔ. FoodTrace GH bɛboa wo.",
    "marketplace.postIntro": "To {domain} ade gua so. Fa foto ne QR code ka ho ma safety badge no nna adi.",
    "marketplace.changePhoto": "Sesa foto",
    "marketplace.addPhoto": "Fa ade foto ka ho",
    "marketplace.productTitle": "Ade no din",
    "marketplace.caption": "Nsɛm tiawa",
    "marketplace.locationPlaceholder": "Beae (sɛ Greater Accra)",
    "marketplace.hashtagsPlaceholder": "Hashtags: organic, Accra",
    "marketplace.qrPlaceholder": "Ade QR code (sɛ FT-QR-1001)",
    "marketplace.imageReadError": "Antumi ankenkan foto no.",
    "marketplace.titleRequired": "Fa ade no din ka ho.",
    "marketplace.postFailed": "Antumi anto post no.",
    "marketplace.submitted": "Wɔde kɔmaa regulator ama wapene so.",
    "marketplace.postButton": "To gua so",
    "marketplace.posting": "Ɛreto gua so..."
  },
  fr: {
    "language.label": "Langue",
    "language.english": "Anglais",
    "language.twi": "Twi",
    "language.french": "Français",
    "common.close": "Fermer",
    "common.tryAgain": "Réessayer",
    "common.send": "Envoyer",
    "marketplace.title": "Marché",
    "marketplace.showcaseProduct": "+ Présenter un produit",
    "marketplace.filters.all": "Tous les produits",
    "marketplace.filters.food": "Aliments",
    "marketplace.filters.drug": "Médicaments",
    "marketplace.filters.farm": "Fermes",
    "marketplace.loadingFeed": "Chargement du fil...",
    "marketplace.noProducts": "Aucun produit publié pour le moment.",
    "marketplace.pendingApproval": "En attente d'approbation",
    "marketplace.awaitingApproval": "En attente de l'approbation du régulateur avant publication.",
    "marketplace.verifyCode": "Vérifier le code",
    "marketplace.tapToCheck": "Touchez pour vérifier l'état de sécurité",
    "marketplace.scanToVerify": "Scanner pour vérifier",
    "marketplace.share": "Partager",
    "marketplace.save": "Enregistrer",
    "marketplace.saved": "Enregistré",
    "marketplace.approvePost": "Approuver cette publication",
    "marketplace.noComments": "Aucun commentaire. Soyez le premier.",
    "marketplace.addComment": "Ajouter un commentaire...",
    "marketplace.feedLoadError": "Impossible de charger le fil.",
    "marketplace.serverWaking": "Le serveur démarre. Réessayez dans un instant.",
    "marketplace.shareScanBefore": "Scannez avant d'acheter. Restez en sécurité avec FoodTrace GH.",
    "marketplace.postIntro": "Publiez un produit {domain}. Ajoutez une photo et un code QR pour afficher le badge de sécurité vérifié.",
    "marketplace.changePhoto": "Changer la photo",
    "marketplace.addPhoto": "Ajouter une photo du produit",
    "marketplace.productTitle": "Nom du produit",
    "marketplace.caption": "Description",
    "marketplace.locationPlaceholder": "Lieu (ex. Greater Accra)",
    "marketplace.hashtagsPlaceholder": "Hashtags : organic, Accra",
    "marketplace.qrPlaceholder": "Code QR du produit (ex. FT-QR-1001)",
    "marketplace.imageReadError": "Impossible de lire cette image.",
    "marketplace.titleRequired": "Ajoutez le nom du produit.",
    "marketplace.postFailed": "Impossible de publier.",
    "marketplace.submitted": "Soumis pour approbation.",
    "marketplace.postButton": "Publier sur le marché",
    "marketplace.posting": "Publication..."
  }
};

export function translate(language: LanguageCode | string | undefined, key: TranslationKey, values?: Record<string, string | number>): string {
  const code = isLanguageCode(language) ? language : "en";
  let text = translations[code][key] ?? translations.en[key] ?? key;
  if (values) {
    for (const [name, value] of Object.entries(values)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}

export function isLanguageCode(value: unknown): value is LanguageCode {
  return value === "en" || value === "tw" || value === "fr";
}
