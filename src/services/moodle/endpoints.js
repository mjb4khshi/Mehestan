/**
 * فهرست سرورها و سامانه‌های مودل دانشگاه‌های تحت پوشش مهستان
 */

export const UNIVERSITY_MOODLE_PRESETS = [
  {
    id: 'kntu',
    name: 'دانشگاه صنعتی خواجه نصیرالدین طوسی',
    shortName: 'خواجه نصیر (KNTU)',
    url: 'https://vc.kntu.ac.ir',
    mobileService: 'moodle_mobile_app',
    authType: 'credentials',
    ssoButtonText: 'ورود به سامانه یادگیری خواجه نصیر',
    badge: 'احراز هویت مرکزی',
  },
  {
    id: 'sbu',
    name: 'دانشگاه شهید بهشتی',
    shortName: 'شهید بهشتی (SBU)',
    url: 'https://lms.sbu.ac.ir',
    mobileService: 'moodle_mobile_app',
    authType: 'credentials',
    ssoButtonText: 'ورود به سامانه یادگیری شهید بهشتی',
    badge: 'مستقیم',
  },
  {
    id: 'ut',
    name: 'دانشگاه تهران',
    shortName: 'دانشگاه تهران (UT)',
    url: 'https://elearn.ut.ac.ir',
    mobileService: 'moodle_mobile_app',
    authType: 'sso',
    ssoButtonText: 'ورود با سامانه احراز هویت یکتای دانشگاه تهران',
    badge: 'احراز هویت مرکزی',
  },
  {
    id: 'aut',
    name: 'دانشگاه صنعتی امیرکبیر',
    shortName: 'پلی‌تکنیک (AUT)',
    url: 'https://lms.aut.ac.ir',
    mobileService: 'moodle_mobile_app',
    authType: 'credentials',
    ssoButtonText: 'ورود به سامانه یادگیری پلی‌تکنیک',
    badge: 'مستقیم',
  },
  {
    id: 'custom',
    name: 'سایر دانشگاه‌ها و مؤسسات (آدرس اختصاصی)',
    shortName: 'آدرس دلخواه',
    url: '',
    mobileService: 'moodle_mobile_app',
    authType: 'credentials',
    ssoButtonText: 'ورود مستقیم',
    badge: 'دستی',
  },
];
