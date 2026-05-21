"use client";
import { useState, useEffect } from "react";

export type Locale = "pt-BR" | "en-US" | "es-ES" | "fr-FR" | "de-DE" | "ja-JP";

export interface LocaleConfig {
  code: Locale; name: string; flag: string; currencySymbol: string; rate: number;
}

export const LOCALES: LocaleConfig[] = [
  { code: "pt-BR", name: "Português",  flag: "🇧🇷", currencySymbol: "R$", rate: 5.05 },
  { code: "en-US", name: "English",    flag: "🇺🇸", currencySymbol: "$",  rate: 1.0  },
  { code: "es-ES", name: "Español",    flag: "🇪🇸", currencySymbol: "$",  rate: 1.0  },
  { code: "fr-FR", name: "Français",   flag: "🇫🇷", currencySymbol: "€",  rate: 0.92 },
  { code: "de-DE", name: "Deutsch",    flag: "🇩🇪", currencySymbol: "€",  rate: 0.92 },
  { code: "ja-JP", name: "日本語",      flag: "🇯🇵", currencySymbol: "¥",  rate: 155  },
];

type Str = {
  history: string; ranking: string; analysis: string; promo: string;
  support: string; deposit: string; profile: string; withdrawal: string;
  reset: string; logout: string;
  invest: string; expiry: string; profit: string;
  buy: string; sell: string; balance_label: string; max: string;
  win_notif: string; loss_notif: string;
  opening: string; insufficient: string; min_amount: string;
  demo: string; real_acc: string;
  buy_pct: string; sell_pct: string; hover_ohlc: string;
  history_empty: string; load_more: string;
  ranking_title: string; ranking_sub: string; deposit_cta: string;
  promo_title: string; promo_bonus: string; promo_code: string;
  support_title: string; faq: string; send_msg: string;
  your_msg: string; your_email: string; send_btn: string; sent_ok: string;
  profile_title: string; photo_label: string;
  name_label: string; pw_label: string; curr_pw: string; new_pw: string; save: string;
  withdraw_title: string; amount_label: string; method_label: string;
  details_label: string; submit_withdraw: string; withdraw_min: string;
  withdraw_real_only: string;
  win_result: string; loss_result: string;
  reset_title: string; reset_msg: string; reset_btn: string;
  deposit_title: string; deposit_sub: string; deposit_demo_note: string;
  contact_support: string; continue_demo: string;
  loading: string; conn_error: string;
  open_pos: string; hide: string; expand: string;
  level: string; trades_count: string; win_rate: string;
};

const T: Record<Locale, Str> = {
  "pt-BR": {
    history: "Histórico", ranking: "Ranking", analysis: "Análise", promo: "Promoções",
    support: "Suporte", deposit: "Depositar", profile: "Perfil", withdrawal: "Saque",
    reset: "Reset", logout: "Sair",
    invest: "Investimento", expiry: "Expiração", profit: "Lucro",
    buy: "COMPRAR", sell: "VENDER", balance_label: "Saldo", max: "MÁX",
    win_notif: "🏆 Ganhou", loss_notif: "💸 Perdeu",
    opening: "Abrindo operação…", insufficient: "Saldo insuficiente", min_amount: "Mínimo: $1",
    demo: "Demo", real_acc: "Real",
    buy_pct: "COMPRA", sell_pct: "VENDA", hover_ohlc: "Passe o mouse sobre o gráfico",
    history_empty: "Nenhuma operação ainda", load_more: "Carregar mais",
    ranking_title: "Top Traders", ranking_sub: "Os 20 melhores da plataforma", deposit_cta: "+ Depositar",
    promo_title: "Promoções Ativas", promo_bonus: "100% de bônus em depósitos acima de $20",
    promo_code: "Código promocional", support_title: "Suporte",
    faq: "Perguntas Frequentes", send_msg: "Fale com a gente",
    your_msg: "Sua mensagem…", your_email: "Seu email", send_btn: "Enviar", sent_ok: "Mensagem enviada!",
    profile_title: "Meu Perfil", photo_label: "Clique para trocar foto",
    name_label: "Nome", pw_label: "Senha", curr_pw: "Senha atual", new_pw: "Nova senha", save: "Salvar",
    withdraw_title: "Solicitar Saque", amount_label: "Valor", method_label: "Método",
    details_label: "Chave PIX / Conta", submit_withdraw: "Solicitar Saque",
    withdraw_min: "Mínimo $10", withdraw_real_only: "Disponível apenas na conta real",
    win_result: "VITÓRIA!", loss_result: "PERDEU",
    reset_title: "Resetar conta demo",
    reset_msg: "Apaga todo o histórico e restaura o saldo para $10.000 virtuais.",
    reset_btn: "Resetar tudo",
    deposit_title: "Conta Real", deposit_sub: "Opere com dinheiro real e saque seus lucros.",
    deposit_demo_note: "Você está com $10.000 virtuais. Deposite para ativar a conta real.",
    contact_support: "Falar com suporte", continue_demo: "Continuar com demo",
    loading: "Carregando…", conn_error: "Erro de conexão",
    open_pos: "Operações Abertas", hide: "Ocultar ▲", expand: "Expandir ▼",
    level: "Nível", trades_count: "operações", win_rate: "taxa de acerto",
  },
  "en-US": {
    history: "History", ranking: "Ranking", analysis: "Analysis", promo: "Promotions",
    support: "Support", deposit: "Deposit", profile: "Profile", withdrawal: "Withdraw",
    reset: "Reset", logout: "Logout",
    invest: "Investment", expiry: "Expiry", profit: "Profit",
    buy: "BUY", sell: "SELL", balance_label: "Balance", max: "MAX",
    win_notif: "🏆 Won", loss_notif: "💸 Lost",
    opening: "Opening trade…", insufficient: "Insufficient balance", min_amount: "Minimum: $1",
    demo: "Demo", real_acc: "Real",
    buy_pct: "BUY", sell_pct: "SELL", hover_ohlc: "Hover over the chart",
    history_empty: "No trades yet", load_more: "Load more",
    ranking_title: "Top Traders", ranking_sub: "Top 20 on the platform", deposit_cta: "+ Deposit",
    promo_title: "Active Promotions", promo_bonus: "100% bonus on deposits over $20",
    promo_code: "Promo code", support_title: "Support",
    faq: "Frequently Asked Questions", send_msg: "Get in touch",
    your_msg: "Your message…", your_email: "Your email", send_btn: "Send", sent_ok: "Message sent!",
    profile_title: "My Profile", photo_label: "Click to change photo",
    name_label: "Name", pw_label: "Password", curr_pw: "Current password", new_pw: "New password", save: "Save",
    withdraw_title: "Withdrawal Request", amount_label: "Amount", method_label: "Method",
    details_label: "Key / Account", submit_withdraw: "Request Withdrawal",
    withdraw_min: "Minimum $10", withdraw_real_only: "Available on real account only",
    win_result: "WIN!", loss_result: "LOSS",
    reset_title: "Reset demo account",
    reset_msg: "Deletes all history and restores balance to $10,000 virtual.",
    reset_btn: "Reset everything",
    deposit_title: "Real Account", deposit_sub: "Trade with real money and withdraw profits.",
    deposit_demo_note: "You have $10,000 virtual. Deposit to activate your real account.",
    contact_support: "Contact support", continue_demo: "Continue with demo",
    loading: "Loading…", conn_error: "Connection error",
    open_pos: "Open Positions", hide: "Hide ▲", expand: "Expand ▼",
    level: "Level", trades_count: "trades", win_rate: "win rate",
  },
  "es-ES": {
    history: "Historial", ranking: "Ranking", analysis: "Análisis", promo: "Promociones",
    support: "Soporte", deposit: "Depositar", profile: "Perfil", withdrawal: "Retiro",
    reset: "Resetear", logout: "Salir",
    invest: "Inversión", expiry: "Expiración", profit: "Ganancia",
    buy: "COMPRAR", sell: "VENDER", balance_label: "Saldo", max: "MÁX",
    win_notif: "🏆 Ganaste", loss_notif: "💸 Perdiste",
    opening: "Abriendo operación…", insufficient: "Saldo insuficiente", min_amount: "Mínimo: $1",
    demo: "Demo", real_acc: "Real",
    buy_pct: "COMPRA", sell_pct: "VENTA", hover_ohlc: "Pasa el cursor por el gráfico",
    history_empty: "Sin operaciones aún", load_more: "Cargar más",
    ranking_title: "Top Traders", ranking_sub: "Los 20 mejores de la plataforma", deposit_cta: "+ Depositar",
    promo_title: "Promociones Activas", promo_bonus: "100% de bono en depósitos mayores a $20",
    promo_code: "Código promocional", support_title: "Soporte",
    faq: "Preguntas Frecuentes", send_msg: "Contáctanos",
    your_msg: "Tu mensaje…", your_email: "Tu email", send_btn: "Enviar", sent_ok: "¡Mensaje enviado!",
    profile_title: "Mi Perfil", photo_label: "Clic para cambiar foto",
    name_label: "Nombre", pw_label: "Contraseña", curr_pw: "Contraseña actual", new_pw: "Nueva contraseña", save: "Guardar",
    withdraw_title: "Solicitar Retiro", amount_label: "Monto", method_label: "Método",
    details_label: "Clave / Cuenta", submit_withdraw: "Solicitar Retiro",
    withdraw_min: "Mínimo $10", withdraw_real_only: "Solo disponible en cuenta real",
    win_result: "¡VICTORIA!", loss_result: "PERDISTE",
    reset_title: "Resetear cuenta demo",
    reset_msg: "Borra todo el historial y restaura el saldo a $10,000 virtuales.",
    reset_btn: "Resetear todo",
    deposit_title: "Cuenta Real", deposit_sub: "Opera con dinero real y retira tus ganancias.",
    deposit_demo_note: "Tienes $10,000 virtuales. Deposita para activar tu cuenta real.",
    contact_support: "Hablar con soporte", continue_demo: "Continuar con demo",
    loading: "Cargando…", conn_error: "Error de conexión",
    open_pos: "Posiciones Abiertas", hide: "Ocultar ▲", expand: "Expandir ▼",
    level: "Nivel", trades_count: "operaciones", win_rate: "tasa de acierto",
  },
  "fr-FR": {
    history: "Historique", ranking: "Classement", analysis: "Analyse", promo: "Promotions",
    support: "Support", deposit: "Dépôt", profile: "Profil", withdrawal: "Retrait",
    reset: "Réinitialiser", logout: "Déconnexion",
    invest: "Investissement", expiry: "Expiration", profit: "Profit",
    buy: "ACHETER", sell: "VENDRE", balance_label: "Solde", max: "MAX",
    win_notif: "🏆 Gagné", loss_notif: "💸 Perdu",
    opening: "Ouverture du trade…", insufficient: "Solde insuffisant", min_amount: "Minimum: $1",
    demo: "Démo", real_acc: "Réel",
    buy_pct: "ACHAT", sell_pct: "VENTE", hover_ohlc: "Survolez le graphique",
    history_empty: "Aucun trade", load_more: "Charger plus",
    ranking_title: "Top Traders", ranking_sub: "Les 20 meilleurs de la plateforme", deposit_cta: "+ Dépôt",
    promo_title: "Promotions Actives", promo_bonus: "100% de bonus sur les dépôts supérieurs à $20",
    promo_code: "Code promo", support_title: "Support",
    faq: "Questions Fréquentes", send_msg: "Contactez-nous",
    your_msg: "Votre message…", your_email: "Votre email", send_btn: "Envoyer", sent_ok: "Message envoyé!",
    profile_title: "Mon Profil", photo_label: "Cliquez pour changer la photo",
    name_label: "Nom", pw_label: "Mot de passe", curr_pw: "Mot de passe actuel", new_pw: "Nouveau mot de passe", save: "Enregistrer",
    withdraw_title: "Demande de Retrait", amount_label: "Montant", method_label: "Méthode",
    details_label: "Clé / Compte", submit_withdraw: "Demander un Retrait",
    withdraw_min: "Minimum $10", withdraw_real_only: "Disponible sur compte réel uniquement",
    win_result: "VICTOIRE!", loss_result: "PERDU",
    reset_title: "Réinitialiser le compte démo",
    reset_msg: "Supprime tout l'historique et restaure le solde à $10 000 virtuels.",
    reset_btn: "Tout réinitialiser",
    deposit_title: "Compte Réel", deposit_sub: "Tradez avec de l'argent réel.",
    deposit_demo_note: "Vous avez $10 000 virtuels. Déposez pour activer votre compte réel.",
    contact_support: "Contacter le support", continue_demo: "Continuer en démo",
    loading: "Chargement…", conn_error: "Erreur de connexion",
    open_pos: "Positions Ouvertes", hide: "Masquer ▲", expand: "Développer ▼",
    level: "Niveau", trades_count: "trades", win_rate: "taux de réussite",
  },
  "de-DE": {
    history: "Verlauf", ranking: "Rangliste", analysis: "Analyse", promo: "Aktionen",
    support: "Support", deposit: "Einzahlen", profile: "Profil", withdrawal: "Auszahlung",
    reset: "Zurücksetzen", logout: "Abmelden",
    invest: "Investition", expiry: "Ablauf", profit: "Gewinn",
    buy: "KAUFEN", sell: "VERKAUFEN", balance_label: "Guthaben", max: "MAX",
    win_notif: "🏆 Gewonnen", loss_notif: "💸 Verloren",
    opening: "Trade wird eröffnet…", insufficient: "Guthaben unzureichend", min_amount: "Minimum: $1",
    demo: "Demo", real_acc: "Echt",
    buy_pct: "KAUF", sell_pct: "VERKAUF", hover_ohlc: "Maus über Diagramm",
    history_empty: "Noch keine Trades", load_more: "Mehr laden",
    ranking_title: "Top Trader", ranking_sub: "Die 20 besten der Plattform", deposit_cta: "+ Einzahlen",
    promo_title: "Aktive Aktionen", promo_bonus: "100% Bonus auf Einzahlungen ab $20",
    promo_code: "Aktionscode", support_title: "Support",
    faq: "Häufige Fragen", send_msg: "Kontakt",
    your_msg: "Ihre Nachricht…", your_email: "Ihre E-Mail", send_btn: "Senden", sent_ok: "Nachricht gesendet!",
    profile_title: "Mein Profil", photo_label: "Klicken zum Ändern",
    name_label: "Name", pw_label: "Passwort", curr_pw: "Aktuelles Passwort", new_pw: "Neues Passwort", save: "Speichern",
    withdraw_title: "Auszahlung beantragen", amount_label: "Betrag", method_label: "Methode",
    details_label: "Schlüssel / Konto", submit_withdraw: "Auszahlung beantragen",
    withdraw_min: "Minimum $10", withdraw_real_only: "Nur für echte Konten",
    win_result: "GEWONNEN!", loss_result: "VERLOREN",
    reset_title: "Demo-Konto zurücksetzen",
    reset_msg: "Löscht alle Trades und stellt das Guthaben auf $10.000 virtuell wieder her.",
    reset_btn: "Alles zurücksetzen",
    deposit_title: "Echtes Konto", deposit_sub: "Handeln Sie mit echtem Geld.",
    deposit_demo_note: "Sie haben $10.000 virtuell. Zahlen Sie ein, um Ihr echtes Konto zu aktivieren.",
    contact_support: "Support kontaktieren", continue_demo: "Mit Demo fortfahren",
    loading: "Laden…", conn_error: "Verbindungsfehler",
    open_pos: "Offene Positionen", hide: "Ausblenden ▲", expand: "Erweitern ▼",
    level: "Level", trades_count: "Trades", win_rate: "Gewinnrate",
  },
  "ja-JP": {
    history: "履歴", ranking: "ランキング", analysis: "分析", promo: "プロモ",
    support: "サポート", deposit: "入金", profile: "プロフィール", withdrawal: "出金",
    reset: "リセット", logout: "ログアウト",
    invest: "投資額", expiry: "満期", profit: "利益",
    buy: "買う", sell: "売る", balance_label: "残高", max: "最大",
    win_notif: "🏆 勝利", loss_notif: "💸 敗北",
    opening: "取引を開始中…", insufficient: "残高不足", min_amount: "最小: $1",
    demo: "デモ", real_acc: "リアル",
    buy_pct: "買い", sell_pct: "売り", hover_ohlc: "チャートにカーソルを合わせてください",
    history_empty: "取引なし", load_more: "もっと読む",
    ranking_title: "トップトレーダー", ranking_sub: "プラットフォームのトップ20", deposit_cta: "+ 入金",
    promo_title: "アクティブプロモ", promo_bonus: "$20以上の入金に100%ボーナス",
    promo_code: "プロモコード", support_title: "サポート",
    faq: "よくある質問", send_msg: "お問い合わせ",
    your_msg: "メッセージ…", your_email: "メールアドレス", send_btn: "送信", sent_ok: "送信完了！",
    profile_title: "マイプロフィール", photo_label: "クリックして写真を変更",
    name_label: "名前", pw_label: "パスワード", curr_pw: "現在のパスワード", new_pw: "新しいパスワード", save: "保存",
    withdraw_title: "出金申請", amount_label: "金額", method_label: "方法",
    details_label: "口座番号", submit_withdraw: "出金申請",
    withdraw_min: "最小 $10", withdraw_real_only: "リアル口座のみ利用可能",
    win_result: "勝利！", loss_result: "敗北",
    reset_title: "デモ口座をリセット",
    reset_msg: "すべての履歴を削除し、$10,000に戻します。",
    reset_btn: "すべてリセット",
    deposit_title: "リアル口座", deposit_sub: "実際の資金で取引し、利益を引き出します。",
    deposit_demo_note: "$10,000の仮想資金があります。入金してリアル口座を有効化してください。",
    contact_support: "サポートに連絡", continue_demo: "デモを続ける",
    loading: "読み込み中…", conn_error: "接続エラー",
    open_pos: "オープンポジション", hide: "非表示 ▲", expand: "展開 ▼",
    level: "レベル", trades_count: "取引", win_rate: "勝率",
  },
};

let _locale: Locale = "pt-BR";
let _listeners: Array<() => void> = [];

export function initLocale(): void {
  if (typeof window === "undefined") return;
  const saved = localStorage.getItem("pb-locale") as Locale | null;
  if (saved && T[saved]) { _locale = saved; return; }
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith("pt")) _locale = "pt-BR";
  else if (nav.startsWith("es")) _locale = "es-ES";
  else if (nav.startsWith("fr")) _locale = "fr-FR";
  else if (nav.startsWith("de")) _locale = "de-DE";
  else if (nav.startsWith("ja")) _locale = "ja-JP";
  else if (nav.startsWith("en")) _locale = "en-US";
}

export function getLocale(): Locale { return _locale; }

export function setLocale(l: Locale): void {
  _locale = l;
  if (typeof window !== "undefined") localStorage.setItem("pb-locale", l);
  _listeners.forEach((fn) => fn());
}

export function subscribeLocale(fn: () => void): () => void {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter((l) => l !== fn); };
}

export function t(key: keyof Str): string {
  return T[_locale]?.[key] ?? T["en-US"][key] ?? key;
}

export function getLocaleConfig(): LocaleConfig {
  return LOCALES.find((l) => l.code === _locale) ?? LOCALES[1];
}

export function formatCurrency(usd: number): string {
  const cfg = getLocaleConfig();
  const amt = usd * cfg.rate;
  if (cfg.rate >= 100) return `${cfg.currencySymbol}${Math.round(amt).toLocaleString()}`;
  return `${cfg.currencySymbol}${amt.toFixed(2)}`;
}

export function useI18n() {
  const [, setTick] = useState(0);
  useEffect(() => {
    initLocale();
    setTick((n) => n + 1);
    const unsub = subscribeLocale(() => setTick((n) => n + 1));
    return unsub;
  }, []);
  return { t, setLocale, getLocale, formatCurrency, getLocaleConfig, LOCALES };
}
