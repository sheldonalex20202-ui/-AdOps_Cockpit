// Media buying vertical presets, naming presets, and creative angle labels.

export type Vertical = "NUTRA" | "GAMBLING" | "CRYPTO" | "DATING" | "ECOM";

export interface VerticalPreset {
  label: string;
  emoji: string;
  objective: string;
  bidStrategy: string;
  optimizationGoal: string;
  campaignStatus: string;
  dailyBudget: string;
  ctaOptions: string[];
}

export const VERTICAL_PRESETS: Record<Vertical, VerticalPreset> = {
  NUTRA: {
    label: "Нутра",
    emoji: "💊",
    objective: "OUTCOME_TRAFFIC",
    bidStrategy: "LOWEST_COST_WITHOUT_CAP",
    optimizationGoal: "LANDING_PAGE_VIEWS",
    campaignStatus: "PAUSED",
    dailyBudget: "50",
    ctaOptions: ["LEARN_MORE", "SHOP_NOW", "GET_OFFER"],
  },
  GAMBLING: {
    label: "Гемблинг",
    emoji: "🎰",
    objective: "OUTCOME_TRAFFIC",
    bidStrategy: "COST_CAP",
    optimizationGoal: "LINK_CLICKS",
    campaignStatus: "PAUSED",
    dailyBudget: "100",
    ctaOptions: ["PLAY_GAME", "LEARN_MORE", "SIGN_UP"],
  },
  CRYPTO: {
    label: "Крипто",
    emoji: "₿",
    objective: "OUTCOME_LEADS",
    bidStrategy: "LOWEST_COST_WITH_BID_CAP",
    optimizationGoal: "LEAD_GENERATION",
    campaignStatus: "PAUSED",
    dailyBudget: "75",
    ctaOptions: ["LEARN_MORE", "SIGN_UP", "GET_STARTED"],
  },
  DATING: {
    label: "Дейтинг",
    emoji: "💘",
    objective: "OUTCOME_TRAFFIC",
    bidStrategy: "LOWEST_COST_WITHOUT_CAP",
    optimizationGoal: "LINK_CLICKS",
    campaignStatus: "PAUSED",
    dailyBudget: "30",
    ctaOptions: ["SIGN_UP", "LEARN_MORE", "SUBSCRIBE"],
  },
  ECOM: {
    label: "E-com",
    emoji: "🛍",
    objective: "OUTCOME_SALES",
    bidStrategy: "LOWEST_COST_WITHOUT_CAP",
    optimizationGoal: "OFFSITE_CONVERSIONS",
    campaignStatus: "PAUSED",
    dailyBudget: "60",
    ctaOptions: ["SHOP_NOW", "BUY_NOW", "ORDER_NOW"],
  },
};

export interface NamingPreset {
  label: string;
  campaignNameTpl: string;
  adSetNameTpl: string;
  adNameTpl: string;
}

export const NAMING_PRESETS: NamingPreset[] = [
  {
    label: "Минимальный",
    campaignNameTpl: "{account}_{date}",
    adSetNameTpl: "{account}_AS",
    adNameTpl: "{account}_AD_{num}",
  },
  {
    label: "Стандартный",
    campaignNameTpl: "{vertical}_{geo}_{date}_{num}",
    adSetNameTpl: "{geo}_{audience}_{zGroup}",
    adNameTpl: "{creative}_{angle}_{num}",
  },
  {
    label: "Полный",
    campaignNameTpl: "{vertical}_{geo}_{offer}_{structure}_{date}",
    adSetNameTpl: "{geo}_{audience}_{placement}_{zGroup}",
    adNameTpl: "{creative}_{angle}_{geo}_{num}",
  },
  {
    label: "Нутра",
    campaignNameTpl: "NUTRA_{geo}_{offer}_{angle}_FB_{date}",
    adSetNameTpl: "{geo}_F35-55_INT_WeightLoss_Feed",
    adNameTpl: "{type}_{angle}_V{num}",
  },
  {
    label: "Custom",
    campaignNameTpl: "",
    adSetNameTpl: "",
    adNameTpl: "",
  },
];

export type CreativeAngle =
  | "BeforeAfter"
  | "Doctor"
  | "Testimonial"
  | "WinScene"
  | "NewsStyle"
  | "NativePromo"
  | "ShockHook"
  | "Tutorial"
  | "UGC"
  | "ProductDemo";

export const ANGLE_LABELS: Record<CreativeAngle, string> = {
  BeforeAfter: "До/После",
  Doctor: "Доктор",
  Testimonial: "Отзыв",
  WinScene: "Выигрыш",
  NewsStyle: "Новостной",
  NativePromo: "Нативный",
  ShockHook: "Шок-хук",
  Tutorial: "Туториал",
  UGC: "UGC",
  ProductDemo: "Демо продукта",
};
