/**
 * Internationalization (i18n) Module
 * Supports multiple languages for global P2P marketplace
 */

export type Language = 
  | 'en'  // English
  | 'zh'  // Chinese
  | 'es'  // Spanish
  | 'hi'  // Hindi
  | 'ar'  // Arabic
  | 'pt'  // Portuguese
  | 'ru'  // Russian
  | 'ja'  // Japanese
  | 'ko'  // Korean
  | 'tr'  // Turkish
  | 'fr'  // French
  | 'de'  // German
  | 'vi'  // Vietnamese
  | 'th'  // Thai
  | 'id'  // Indonesian
  | 'ms'  // Malay
  | 'fa'  // Persian
  | 'ur'  // Urdu
  | 'sw'  // Swahili
  | 'tl'  // Tagalog
  | 'bn'  // Bengali
  | 'ta'  // Tamil
  | 'te'  // Telugu
  | 'ml'  // Malayalam
  | 'kn'  // Kannada
  | 'gu'  // Gujarati
  | 'mr'  // Marathi
  | 'pa'  // Punjabi
  | 'am'  // Amharic
  | 'ha'  // Hausa
  | 'yo'  // Yoruba
  | 'zu'  // Zulu;

export interface Translation {
  // Common
  [key: string]: string | Translation;
}

export interface Translations {
  [language: Language]: Translation;
}

const translations: Translations = {
  en: {
    // Common
    app: {
      name: 'BlackPayments',
      tagline: 'Secure USDT P2P Wallet',
    },
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      submit: 'Submit',
      search: 'Search',
      filter: 'Filter',
      sort: 'Sort',
      refresh: 'Refresh',
      copy: 'Copy',
      copied: 'Copied!',
      show: 'Show',
      hide: 'Hide',
      viewAll: 'View All',
      seeMore: 'See More',
      noData: 'No data available',
      retry: 'Retry',
    },
    auth: {
      welcome: 'Welcome',
      createWallet: 'Create Wallet',
      importWallet: 'Import Wallet',
      unlock: 'Unlock',
      pin: 'PIN',
      enterPin: 'Enter PIN',
      confirmPin: 'Confirm PIN',
      setPin: 'Set PIN',
      changePin: 'Change PIN',
      forgotPin: 'Forgot PIN?',
      biometric: 'Biometric',
      enableBiometric: 'Enable Biometric',
      useBiometric: 'Use Biometric',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      privateKey: 'Private Key',
      mnemonicPhrase: 'Recovery Phrase',
      seedPhrase: 'Seed Phrase',
      keepSecret: 'Keep this safe - never share it!',
      invalidPin: 'Invalid PIN',
      pinMismatch: 'PINs do not match',
      tooManyAttempts: 'Too many failed attempts',
      lockedOut: 'Account locked',
    },
    wallet: {
      myWallet: 'My Wallet',
      balance: 'Balance',
      totalBalance: 'Total Balance',
      send: 'Send',
      receive: 'Receive',
      swap: 'Swap',
      address: 'Address',
      qrCode: 'QR Code',
      copyAddress: 'Copy Address',
      showPrivateKey: 'Show Private Key',
      exportPrivateKey: 'Export Private Key',
      backup: 'Backup',
      backupNow: 'Backup Now',
      backupReminder: 'Backup reminder',
      noWallet: 'No wallet found',
      connect: 'Connect',
      disconnect: 'Disconnect',
      connected: 'Connected',
    },
    send: {
      sendUsdt: 'Send USDT',
      recipient: 'Recipient',
      recipientAddress: 'Recipient Address',
      amount: 'Amount',
      fee: 'Fee',
      estimatedFee: 'Estimated Fee',
      total: 'Total',
      memo: 'Memo (optional)',
      review: 'Review',
      sending: 'Sending...',
      sent: 'Sent!',
      failed: 'Failed',
      confirmSend: 'Confirm Send',
      enterAmount: 'Enter amount',
      insufficientBalance: 'Insufficient balance',
      invalidAddress: 'Invalid address',
    },
    receive: {
      receiveUsdt: 'Receive USDT',
      yourAddress: 'Your Address',
      shareQrCode: 'Share QR Code',
      deposit: 'Deposit',
      depositUsdt: 'Deposit USDT',
    },
    p2p: {
      p2pTrading: 'P2P Trading',
      buy: 'Buy',
      sell: 'Sell',
      orders: 'Orders',
      myOrders: 'My Orders',
      createOrder: 'Create Order',
      availableOrders: 'Available Orders',
      price: 'Price',
      quantity: 'Quantity',
      total: 'Total',
      payment: 'Payment',
      paymentMethod: 'Payment Method',
      bankTransfer: 'Bank Transfer',
      mobileMoney: 'Mobile Money',
      cashDeposit: 'Cash Deposit',
      paypal: 'PayPal',
      wise: 'Wise',
      revolut: 'Revolut',
      crypto: 'Crypto',
      terms: 'Terms',
      status: 'Status',
      pending: 'Pending',
      completed: 'Completed',
      cancelled: 'Cancelled',
      disputed: 'Disputed',
      counterparty: 'Counterparty',
      timeLimit: 'Time Limit',
      release: 'Release',
      cancelOrder: 'Cancel Order',
      appeal: 'Appeal',
      chat: 'Chat',
      noOrders: 'No orders available',
      createFirst: 'Create your first order',
    },
    settings: {
      settings: 'Settings',
      profile: 'Profile',
      security: 'Security',
      appearance: 'Appearance',
      language: 'Language',
      currency: 'Currency',
      network: 'Network',
      notifications: 'Notifications',
      privacy: 'Privacy',
      about: 'About',
      help: 'Help',
      terms: 'Terms',
      privacyPolicy: 'Privacy Policy',
      darkMode: 'Dark Mode',
      lightMode: 'Light Mode',
      autoLock: 'Auto-Lock',
      autoLockMinutes: 'Auto-lock after {{minutes}} minutes',
      clearData: 'Clear Data',
      exportData: 'Export Data',
    },
    kyc: {
      verify: 'Verify',
      verified: 'Verified',
      pending: 'Pending',
      rejected: 'Rejected',
      kyc: 'KYC Verification',
      startKyc: 'Start Verification',
      submitDocuments: 'Submit Documents',
      takeSelfie: 'Take Selfie',
      verifyIdentity: 'Verify Identity',
      uploadId: 'Upload ID',
      proofOfAddress: 'Proof of Address',
    },
    trade: {
      iWantToBuy: 'I want to buy',
      iWantToSell: 'I want to sell',
      pricePerUsdt: 'Price per USDT',
      limit: 'Limit',
      available: 'Available',
      traded: 'Traded',
      completionRate: 'Completion Rate',
      avgReleaseTime: 'Avg. Release Time',
      ordersCount: 'Orders',
      tradesCount: 'Trades',
    },
  },
  tr: {
    // Turkish (for P2P market in Turkey)
    common: {
      loading: 'Yükleniyor...',
      error: 'Hata',
      success: 'Başarılı',
      cancel: 'İptal',
      confirm: 'Onayla',
      save: 'Kaydet',
      delete: 'Sil',
      edit: 'Düzenle',
      close: 'Kapat',
      back: 'Geri',
      next: 'İleri',
      submit: 'Gönder',
      search: 'Ara',
      filter: 'Filtrele',
      sort: 'Sırala',
      refresh: 'Yenile',
      copy: 'Kopyala',
      copied: 'Kopyalandı!',
    },
    auth: {
      welcome: 'Hoş Geldiniz',
      createWallet: 'Cüzdan Oluştur',
      importWallet: 'Cüzdan İçe Aktar',
      unlock: 'Kilidi Aç',
      pin: 'PIN',
      enterPin: 'PIN Girin',
      confirmPin: 'PIN Doğrula',
      setPin: 'PIN Belirle',
      changePin: 'PIN Değiştir',
    },
    wallet: {
      myWallet: 'Cüzdanım',
      balance: 'Bakiye',
      totalBalance: 'Toplam Bakiye',
      send: 'Gönder',
      receive: 'Al',
      swap: 'Takas',
    },
    p2p: {
      p2pTrading: 'P2P İşlem',
      buy: 'Al',
      sell: 'Sat',
      orders: 'Siparişler',
      createOrder: 'Sipariş Oluştur',
    },
    settings: {
      settings: 'Ayarlar',
      language: 'Dil',
      darkMode: 'Karanlık Mod',
    },
  },
  es: {
    // Spanish
    common: {
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
      cancel: 'Cancelar',
      confirm: 'Confirmar',
    },
    auth: {
      welcome: 'Bienvenido',
      createWallet: 'Crear Billetera',
      importWallet: 'Importar Billetera',
    },
    wallet: {
      myWallet: 'Mi Billetera',
      balance: 'Saldo',
      send: 'Enviar',
      receive: 'Recibir',
    },
    p2p: {
      p2pTrading: 'Trading P2P',
      buy: 'Comprar',
      sell: 'Vender',
    },
  },
  zh: {
    // Chinese
    common: {
      loading: '加载中...',
      error: '错误',
      success: '成功',
      cancel: '取消',
      confirm: '确认',
    },
    auth: {
      welcome: '欢迎',
      createWallet: '创建钱包',
      importWallet: '导入钱包',
    },
    wallet: {
      myWallet: '我的钱包',
      balance: '余额',
      send: '发送',
      receive: '接收',
    },
    p2p: {
      p2pTrading: 'P2P交易',
      buy: '购买',
      sell: '出售',
    },
  },
  hi: {
    // Hindi (for Indian P2P market)
    common: {
      loading: 'लोड हो रहा है...',
      error: 'त्रुटि',
      success: 'सफल',
      cancel: 'रद्द करें',
      confirm: 'पुष्टि करें',
    },
    auth: {
      welcome: 'स्वागत है',
      createWallet: 'वॉलेट बनाएं',
      importWallet: 'वॉलेट आयात करें',
    },
    wallet: {
      myWallet: 'मेरा वॉलेट',
      balance: 'शेष राशि',
      send: 'भेजें',
      receive: 'प्राप्त करें',
    },
    p2p: {
      p2pTrading: 'P2P व्यापार',
      buy: 'खरीदें',
      sell: 'बेचें',
    },
  },
  ar: {
    // Arabic (RTL support)
    common: {
      loading: 'جاري التحميل...',
      error: 'خطأ',
      success: 'نجاح',
      cancel: 'إلغاء',
      confirm: 'تأكيد',
    },
    auth: {
      welcome: 'مرحباً',
      createWallet: 'إنشاء محفظة',
      importWallet: 'استيراد محفظة',
    },
    wallet: {
      myWallet: 'محفظتي',
      balance: 'الرصيد',
      send: 'إرسال',
      receive: 'استلام',
    },
    p2p: {
      p2pTrading: 'تداول P2P',
      buy: 'شراء',
      sell: 'بيع',
    },
  },
  fr: {
    // French
    common: {
      loading: 'Chargement...',
      error: 'Erreur',
      success: 'Succès',
      cancel: 'Annuler',
      confirm: 'Confirmer',
    },
    auth: {
      welcome: 'Bienvenue',
      createWallet: 'Créer un portefeuille',
      importWallet: 'Importer un portefeuille',
    },
    wallet: {
      myWallet: 'Mon portefeuille',
      balance: 'Solde',
      send: 'Envoyer',
      receive: 'Recevoir',
    },
    p2p: {
      p2pTrading: 'Trading P2P',
      buy: 'Acheter',
      sell: 'Vendre',
    },
  },
  de: {
    // German
    common: {
      loading: 'Laden...',
      error: 'Fehler',
      success: 'Erfolg',
      cancel: 'Abbrechen',
      confirm: 'Bestätigen',
    },
    auth: {
      welcome: 'Willkommen',
      createWallet: 'Wallet erstellen',
      importWallet: 'Wallet importieren',
    },
    wallet: {
      myWallet: 'Mein Wallet',
      balance: 'Guthaben',
      send: 'Senden',
      receive: 'Empfangen',
    },
    p2p: {
      p2pTrading: 'P2P-Handel',
      buy: 'Kaufen',
      sell: 'Verkaufen',
    },
  },
  pt: {
    // Portuguese
    common: {
      loading: 'Carregando...',
      error: 'Erro',
      success: 'Sucesso',
      cancel: 'Cancelar',
      confirm: 'Confirmar',
    },
    auth: {
      welcome: 'Bem-vindo',
      createWallet: 'Criar Carteira',
      importWallet: 'Importar Carteira',
    },
    wallet: {
      myWallet: 'Minha Carteira',
      balance: 'Saldo',
      send: 'Enviar',
      receive: 'Receber',
    },
    p2p: {
      p2pTrading: 'Negociação P2P',
      buy: 'Comprar',
      sell: 'Vender',
    },
  },
  ru: {
    // Russian
    common: {
      loading: 'Загрузка...',
      error: 'Ошибка',
      success: 'Успех',
      cancel: 'Отмена',
      confirm: 'Подтвердить',
    },
    auth: {
      welcome: 'Добро пожаловать',
      createWallet: 'Создать кошелек',
      importWallet: 'Импортировать кошелек',
    },
    wallet: {
      myWallet: 'Мой кошелек',
      balance: 'Баланс',
      send: 'Отправить',
      receive: 'Получить',
    },
    p2p: {
      p2pTrading: 'P2P торговля',
      buy: 'Купить',
      sell: 'Продать',
    },
  },
  ja: {
    // Japanese
    common: {
      loading: '読み込み中...',
      error: 'エラー',
      success: '成功',
      cancel: 'キャンセル',
      confirm: '確認',
    },
    auth: {
      welcome: 'ようこそ',
      createWallet: 'ウォレットを作成',
      importWallet: 'ウォレットをインポート',
    },
    wallet: {
      myWallet: 'マイウォレット',
      balance: '残高',
      send: '送金',
      receive: '入金',
    },
    p2p: {
      p2pTrading: 'P2P取引',
      buy: '購入',
      sell: '売却',
    },
  },
  ko: {
    // Korean
    common: {
      loading: '로딩 중...',
      error: '오류',
      success: '성공',
      cancel: '취소',
      confirm: '확인',
    },
    auth: {
      welcome: '환영합니다',
      createWallet: '지갑 만들기',
      importWallet: '지갑 가져오기',
    },
    wallet: {
      myWallet: '내 지갑',
      balance: '잔액',
      send: '보내기',
      receive: '받기',
    },
    p2p: {
      p2pTrading: 'P2P 거래',
      buy: '구매',
      sell: '판매',
    },
  },
  vi: {
    // Vietnamese
    common: {
      loading: 'Đang tải...',
      error: 'Lỗi',
      success: 'Thành công',
      cancel: 'Hủy',
      confirm: 'Xác nhận',
    },
    auth: {
      welcome: 'Chào mừng',
      createWallet: 'Tạo ví',
      importWallet: 'Nhập ví',
    },
    wallet: {
      myWallet: 'Ví của tôi',
      balance: 'Số dư',
      send: 'Gửi',
      receive: 'Nhận',
    },
    p2p: {
      p2pTrading: 'Giao dịch P2P',
      buy: 'Mua',
      sell: 'Bán',
    },
  },
  id: {
    // Indonesian
    common: {
      loading: 'Memuat...',
      error: 'Kesalahan',
      success: 'Berhasil',
      cancel: 'Batal',
      confirm: 'Konfirmasi',
    },
    auth: {
      welcome: 'Selamat datang',
      createWallet: 'Buat Dompet',
      importWallet: 'Impor Dompet',
    },
    wallet: {
      myWallet: 'Dompet Saya',
      balance: 'Saldo',
      send: 'Kirim',
      receive: 'Terima',
    },
    p2p: {
      p2pTrading: 'Trading P2P',
      buy: 'Beli',
      sell: 'Jual',
    },
  },
  th: {
    // Thai
    common: {
      loading: 'กำลังโหลด...',
      error: 'ข้อผิดพลาด',
      success: 'สำเร็จ',
      cancel: 'ยกเลิก',
      confirm: 'ยืนยัน',
    },
    auth: {
      welcome: 'ยินดีต้อนรับ',
      createWallet: 'สร้างกระเป๋า',
      importWallet: 'นำเข้ากระเป๋า',
    },
    wallet: {
      myWallet: 'กระเป๋าของฉัน',
      balance: 'ยอดเงิน',
      send: 'ส่ง',
      receive: 'รับ',
    },
    p2p: {
      p2pTrading: 'เทรด P2P',
      buy: 'ซื้อ',
      sell: 'ขาย',
    },
  },
  sw: {
    // Swahili (for African markets)
    common: {
      loading: 'Inapakia...',
      error: 'Hitilafu',
      success: 'Mafanikio',
      cancel: 'Ghairi',
      confirm: 'Thibitisha',
    },
    auth: {
      welcome: 'Karibu',
      createWallet: 'Unda Pochi',
      importWallet: 'Ingiza Pochi',
    },
    wallet: {
      myWallet: 'Pochi Yangu',
      balance: 'Salio',
      send: 'Tuma',
      receive: 'Pokea',
    },
    p2p: {
      p2pTrading: 'Biashara P2P',
      buy: 'Nunua',
      sell: 'Uza',
    },
  },
  tl: {
    // Tagalog/Filipino
    common: {
      loading: 'Naglo-load...',
      error: 'Error',
      success: 'Tagumpay',
      cancel: 'Kanselahin',
      confirm: 'Kumpirmahin',
    },
    auth: {
      welcome: 'Maligayang pagdating',
      createWallet: 'Gumawa ng Wallet',
      importWallet: 'Mag-import ng Wallet',
    },
    wallet: {
      myWallet: 'Aking Wallet',
      balance: 'Balanse',
      send: 'Magpadala',
      receive: 'Tumanggap',
    },
    p2p: {
      p2pTrading: 'P2P Trading',
      buy: 'Bumili',
      sell: 'Magbenta',
    },
  },
};

// Fallback to English for any missing translations
function getNestedValue(obj: Translation, path: string): string | undefined {
  const keys = path.split('.');
  let current: Translation | string = obj;
  
  for (const key of keys) {
    if (typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }
  
  return typeof current === 'string' ? current : undefined;
}

/**
 * i18n Manager
 */
export class I18nManager {
  private static instance: I18nManager;
  private currentLanguage: Language = 'en';
  private listeners: (() => void)[] = [];

  private constructor() {
    // Try to get saved language or detect from browser
    this.detectLanguage();
  }

  static getInstance(): I18nManager {
    if (!I18nManager.instance) {
      I18nManager.instance = new I18nManager();
    }
    return I18nManager.instance;
  }

  /**
   * Detect user's preferred language
   */
  private detectLanguage(): void {
    // Try localStorage first
    const saved = localStorage.getItem('bp_language') as Language;
    if (saved && translations[saved]) {
      this.currentLanguage = saved;
      return;
    }

    // Try browser language
    const browserLang = navigator.language.split('-')[0] as Language;
    if (translations[browserLang]) {
      this.currentLanguage = browserLang;
      return;
    }

    // Default to English
    this.currentLanguage = 'en';
  }

  /**
   * Set language
   */
  setLanguage(language: Language): void {
    if (!translations[language]) {
      console.warn(`Language ${language} not supported, falling back to English`);
      language = 'en';
    }

    this.currentLanguage = language;
    localStorage.setItem('bp_language', language);
    
    // Update document direction for RTL languages
    const rtlLanguages: Language[] = ['ar', 'fa', 'ur', 'he'];
    document.documentElement.dir = rtlLanguages.includes(language) ? 'rtl' : 'ltr';
    document.documentElement.lang = language;

    this.notifyListeners();
  }

  /**
   * Get current language
   */
  getLanguage(): Language {
    return this.currentLanguage;
  }

  /**
   * Translate a key
   */
  t(key: string, params?: Record<string, string | number>): string {
    // Try current language first
    let translation = getNestedValue(translations[this.currentLanguage] as Translation, key);
    
    // Fallback to English
    if (!translation) {
      translation = getNestedValue(translations.en, key);
    }

    // Return key if no translation found
    if (!translation) {
      console.warn(`Missing translation: ${key}`);
      return key;
    }

    // Replace parameters
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        translation = translation!.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(value));
      });
    }

    return translation;
  }

  /**
   * Get all available languages
   */
  getAvailableLanguages(): { code: Language; name: string; nativeName: string }[] {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'zh', name: 'Chinese', nativeName: '中文' },
      { code: 'es', name: 'Spanish', nativeName: 'Español' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
      { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
      { code: 'ru', name: 'Russian', nativeName: 'Русский' },
      { code: 'ja', name: 'Japanese', nativeName: '日本語' },
      { code: 'ko', name: 'Korean', nativeName: '한국어' },
      { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
      { code: 'fr', name: 'French', nativeName: 'Français' },
      { code: 'de', name: 'German', nativeName: 'Deutsch' },
      { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
      { code: 'th', name: 'Thai', nativeName: 'ไทย' },
      { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
      { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
      { code: 'fa', name: 'Persian', nativeName: 'فارسی' },
      { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
      { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
      { code: 'tl', name: 'Filipino', nativeName: 'Filipino' },
    ];
  }

  /**
   * Check if current language is RTL
   */
  isRTL(): boolean {
    const rtlLanguages: Language[] = ['ar', 'fa', 'ur', 'he'];
    return rtlLanguages.includes(this.currentLanguage);
  }

  /**
   * Add listener for language changes
   */
  addListener(listener: () => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove listener
   */
  removeListener(listener: () => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

export const i18n = I18nManager.getInstance();

// Convenience function
export function t(key: string, params?: Record<string, string | number>): string {
  return i18n.t(key, params);
}
