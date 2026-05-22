"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  locale:  string;
  isOpen:  boolean;
  onClose: () => void;
}

interface Message {
  id:      number;
  name:    string;
  flag:    string;
  text:    string;
  ts:      number; // seconds ago when created
}

type Locale = "pt-BR" | "en-US" | "es-ES" | "fr-FR" | "de-DE" | "ja-JP";

const TITLE: Record<Locale, string> = {
  "pt-BR": "Sinais ao Vivo",
  "en-US": "Live Signals",
  "es-ES": "Señales en Vivo",
  "fr-FR": "Signaux en Direct",
  "de-DE": "Live-Signale",
  "ja-JP": "ライブシグナル",
};

// 25+ messages with translations for all 6 locales
const MESSAGE_POOL: Array<{ name: string; flag: string; text: Record<Locale, string> }> = [
  {
    name: "Carlos Silva", flag: "🇧🇷",
    text: {
      "pt-BR": "Acabei de ganhar $340 em 30 segundos no BTC! 🚀",
      "en-US": "Just won $340 in 30 seconds on BTC! 🚀",
      "es-ES": "¡Acabo de ganar $340 en 30 segundos en BTC! 🚀",
      "fr-FR": "Je viens de gagner 340$ en 30 secondes sur BTC ! 🚀",
      "de-DE": "Gerade $340 in 30 Sekunden bei BTC gewonnen! 🚀",
      "ja-JP": "BTCで30秒で$340を稼ぎました！🚀",
    },
  },
  {
    name: "Jason Miller", flag: "🇺🇸",
    text: {
      "pt-BR": "Sinal: BTC vai SUBIR nos próximos 5min, parece reversão 📈",
      "en-US": "Signal: BTC going UP next 5min, looks like reversal 📈",
      "es-ES": "Señal: BTC va a SUBIR en los próximos 5min, parece reversión 📈",
      "fr-FR": "Signal : BTC va MONTER dans les 5 prochaines min, retournement probable 📈",
      "de-DE": "Signal: BTC steigt in den nächsten 5min, sieht nach Umkehrung aus 📈",
      "ja-JP": "シグナル：BTCは次の5分で上昇する、反転パターン 📈",
    },
  },
  {
    name: "Ana Martínez", flag: "🇪🇸",
    text: {
      "pt-BR": "Terceira vitória seguida hoje, saldo quase dobrou 💪",
      "en-US": "Third win in a row today, balance nearly doubled 💪",
      "es-ES": "Tercera victoria consecutiva hoy, el saldo casi se duplicó 💪",
      "fr-FR": "Troisième victoire d'affilée aujourd'hui, le solde a presque doublé 💪",
      "de-DE": "Dritter Sieg in Folge heute, Guthaben fast verdoppelt 💪",
      "ja-JP": "今日3連勝、残高がほぼ倍増 💪",
    },
  },
  {
    name: "Pierre Dupont", flag: "🇫🇷",
    text: {
      "pt-BR": "Quem apostou junto comigo no EUR/USD ganhou bem hoje",
      "en-US": "Those who traded EUR/USD with me did well today",
      "es-ES": "Los que apostaron conmigo en EUR/USD ganaron bien hoy",
      "fr-FR": "Ceux qui ont tradé EUR/USD avec moi ont bien gagné aujourd'hui",
      "de-DE": "Wer heute EUR/USD mit mir gehandelt hat, hat gut verdient",
      "ja-JP": "EUR/USDで私と一緒にトレードした人は今日いい結果でした",
    },
  },
  {
    name: "Yuki Tanaka", flag: "🇯🇵",
    text: {
      "pt-BR": "Dica: em tendência de alta, comprar nos pulls é a chave 🔑",
      "en-US": "Tip: in an uptrend, buying the dips is the key 🔑",
      "es-ES": "Consejo: en una tendencia alcista, comprar en las caídas es la clave 🔑",
      "fr-FR": "Astuce : en tendance haussière, acheter les creux est la clé 🔑",
      "de-DE": "Tipp: Bei Aufwärtstrend ist Kaufen bei Rücksetzern der Schlüssel 🔑",
      "ja-JP": "ヒント：上昇トレンドでは、押し目買いが鍵です 🔑",
    },
  },
  {
    name: "Lucas Oliveira", flag: "🇧🇷",
    text: {
      "pt-BR": "Acabei de fazer $120 em ETH em menos de 1 minuto 🔥",
      "en-US": "Just made $120 on ETH in under 1 minute 🔥",
      "es-ES": "Acabo de ganar $120 en ETH en menos de 1 minuto 🔥",
      "fr-FR": "Je viens de faire 120$ sur ETH en moins d'1 minute 🔥",
      "de-DE": "Gerade $120 bei ETH in unter 1 Minute gemacht 🔥",
      "ja-JP": "1分以内にETHで$120を稼ぎました 🔥",
    },
  },
  {
    name: "Hans Mueller", flag: "🇩🇪",
    text: {
      "pt-BR": "SOL/USD formando padrão de alta. Entrada longa confirmada ✅",
      "en-US": "SOL/USD forming bullish pattern. Long entry confirmed ✅",
      "es-ES": "SOL/USD formando patrón alcista. Entrada larga confirmada ✅",
      "fr-FR": "SOL/USD forme un pattern haussier. Entrée longue confirmée ✅",
      "de-DE": "SOL/USD bildet bullisches Muster. Long-Einstieg bestätigt ✅",
      "ja-JP": "SOL/USDが強気パターン形成中。ロングエントリー確認 ✅",
    },
  },
  {
    name: "Maria Santos", flag: "🇧🇷",
    text: {
      "pt-BR": "Comecei com $50 e já tenho $890 hoje. Que plataforma incrível! 😍",
      "en-US": "Started with $50 and already have $890 today. What an amazing platform! 😍",
      "es-ES": "Empecé con $50 y ya tengo $890 hoy. ¡Qué plataforma increíble! 😍",
      "fr-FR": "J'ai commencé avec 50$ et j'ai déjà 890$ aujourd'hui. Quelle plateforme incroyable ! 😍",
      "de-DE": "Mit $50 begonnen und heute schon $890. Was für eine tolle Plattform! 😍",
      "ja-JP": "$50から始めて今日は$890に。すごいプラットフォーム！😍",
    },
  },
  {
    name: "Tom Johnson", flag: "🇺🇸",
    text: {
      "pt-BR": "BTC resistência em $68k. Se romper, subida rápida para $70k 🎯",
      "en-US": "BTC resistance at $68k. If it breaks, quick move to $70k 🎯",
      "es-ES": "Resistencia BTC en $68k. Si rompe, subida rápida a $70k 🎯",
      "fr-FR": "Résistance BTC à 68k$. Si elle casse, montée rapide vers 70k$ 🎯",
      "de-DE": "BTC Widerstand bei $68k. Wenn er bricht, schnelle Bewegung zu $70k 🎯",
      "ja-JP": "BTCの抵抗線は$68k。突破すれば$70kへ急騰 🎯",
    },
  },
  {
    name: "Isabelle Laurent", flag: "🇫🇷",
    text: {
      "pt-BR": "5 vitórias seguidas hoje no EUR/USD! Estratégia de 1 minuto funcionando 💎",
      "en-US": "5 wins in a row today on EUR/USD! 1-minute strategy working 💎",
      "es-ES": "¡5 victorias seguidas hoy en EUR/USD! Estrategia de 1 minuto funcionando 💎",
      "fr-FR": "5 victoires d'affilée sur EUR/USD aujourd'hui ! Stratégie 1 minute qui fonctionne 💎",
      "de-DE": "5 Siege in Folge heute bei EUR/USD! 1-Minuten-Strategie funktioniert 💎",
      "ja-JP": "EUR/USDで今日5連勝！1分戦略が機能中 💎",
    },
  },
  {
    name: "Roberto Gómez", flag: "🇲🇽",
    text: {
      "pt-BR": "DOGE tem momentum agora, aproveitem o movimento! 🐕",
      "en-US": "DOGE has momentum now, ride the wave! 🐕",
      "es-ES": "¡DOGE tiene momentum ahora, aprovechen el movimiento! 🐕",
      "fr-FR": "DOGE a du momentum maintenant, profitez du mouvement ! 🐕",
      "de-DE": "DOGE hat gerade Momentum, nutzt die Bewegung! 🐕",
      "ja-JP": "今DOGEはモメンタムがある、この動きに乗ろう！🐕",
    },
  },
  {
    name: "Kenji Suzuki", flag: "🇯🇵",
    text: {
      "pt-BR": "Operei $200 em BNB e ganhei $170 em 30 segundos. Muito bom! 🙌",
      "en-US": "Traded $200 on BNB and won $170 in 30 seconds. So good! 🙌",
      "es-ES": "Operé $200 en BNB y gané $170 en 30 segundos. ¡Muy bien! 🙌",
      "fr-FR": "J'ai tradé 200$ sur BNB et gagné 170$ en 30 secondes. Excellent ! 🙌",
      "de-DE": "$200 auf BNB gehandelt und $170 in 30 Sekunden gewonnen. Sehr gut! 🙌",
      "ja-JP": "BNBで$200取引し、30秒で$170を獲得。最高！🙌",
    },
  },
  {
    name: "Sofia Rossi", flag: "🇮🇹",
    text: {
      "pt-BR": "Quem está vendo o GBP/USD? Parece pronto para cair 📉",
      "en-US": "Anyone watching GBP/USD? Looks ready to drop 📉",
      "es-ES": "¿Alguien está viendo GBP/USD? Parece listo para caer 📉",
      "fr-FR": "Quelqu'un regarde GBP/USD ? Ça semble prêt à baisser 📉",
      "de-DE": "Schaut jemand auf GBP/USD? Sieht bereit zum Fallen aus 📉",
      "ja-JP": "GBP/USDを見ている人いる？下落準備中のようです 📉",
    },
  },
  {
    name: "Alex Chen", flag: "🇨🇳",
    text: {
      "pt-BR": "Acabei de sacar R$2.500 hoje. Plataforma top demais! 💸",
      "en-US": "Just withdrew $500 today. Top-tier platform! 💸",
      "es-ES": "¡Acabo de retirar $500 hoy. ¡Plataforma de primera! 💸",
      "fr-FR": "Je viens de retirer 500$ aujourd'hui. Plateforme au top ! 💸",
      "de-DE": "Habe heute $500 abgehoben. Erstklassige Plattform! 💸",
      "ja-JP": "今日$500を引き出しました。最高のプラットフォーム！💸",
    },
  },
  {
    name: "Fernanda Costa", flag: "🇧🇷",
    text: {
      "pt-BR": "Alguém mais aproveitando a volatilidade do BTC hoje? 🔥",
      "en-US": "Anyone else riding the BTC volatility today? 🔥",
      "es-ES": "¿Alguien más aprovechando la volatilidad del BTC hoy? 🔥",
      "fr-FR": "Quelqu'un d'autre profite de la volatilité du BTC aujourd'hui ? 🔥",
      "de-DE": "Nutzt noch jemand die BTC-Volatilität heute? 🔥",
      "ja-JP": "今日のBTCのボラティリティを活用している人他にいる？🔥",
    },
  },
  {
    name: "Marco Bianchi", flag: "🇮🇹",
    text: {
      "pt-BR": "Estratégia simples: siga a tendência e use stops. Funcionou hoje ✅",
      "en-US": "Simple strategy: follow the trend and use stops. Worked today ✅",
      "es-ES": "Estrategia simple: sigue la tendencia y usa stops. Funcionó hoy ✅",
      "fr-FR": "Stratégie simple : suivre la tendance et utiliser des stops. Ça a marché aujourd'hui ✅",
      "de-DE": "Einfache Strategie: Trend folgen und Stops setzen. Hat heute funktioniert ✅",
      "ja-JP": "シンプルな戦略：トレンドに従いストップを使う。今日うまくいきました ✅",
    },
  },
  {
    name: "Emma Wilson", flag: "🇬🇧",
    text: {
      "pt-BR": "XRP explodindo! Peguei a subida certa na hora certa 🎉",
      "en-US": "XRP exploding! Caught the move at the right time 🎉",
      "es-ES": "¡XRP explotando! Capturé el movimiento en el momento correcto 🎉",
      "fr-FR": "XRP explose ! J'ai chopé le mouvement au bon moment 🎉",
      "de-DE": "XRP explodiert! Habe die Bewegung zur richtigen Zeit erwischt 🎉",
      "ja-JP": "XRPが急騰！ちょうどいいタイミングで動きをとらえました 🎉",
    },
  },
  {
    name: "Diego Hernández", flag: "🇦🇷",
    text: {
      "pt-BR": "Dica: não opere contra a tendência maior. Já aprendi do jeito difícil 😅",
      "en-US": "Tip: don't trade against the major trend. Learned the hard way 😅",
      "es-ES": "Consejo: no operes contra la tendencia mayor. Lo aprendí por las malas 😅",
      "fr-FR": "Conseil : ne tradez pas contre la tendance majeure. Je l'ai appris à la dure 😅",
      "de-DE": "Tipp: Nicht gegen den Haupttrend handeln. Hab es auf die harte Tour gelernt 😅",
      "ja-JP": "ヒント：主要トレンドに逆らってトレードするな。苦労して学びました 😅",
    },
  },
  {
    name: "Nina Petrov", flag: "🇷🇺",
    text: {
      "pt-BR": "Sinais de AVAX muito bons agora. Watch the charts! 👀",
      "en-US": "AVAX signals looking really good right now. Watch the charts! 👀",
      "es-ES": "Las señales de AVAX se ven muy bien ahora. ¡Atentos! 👀",
      "fr-FR": "Les signaux AVAX sont très bons maintenant. Surveillez les graphiques ! 👀",
      "de-DE": "AVAX Signale sehen gerade sehr gut aus. Charts beobachten! 👀",
      "ja-JP": "AVAXのシグナルが今とても良い。チャートを見て！👀",
    },
  },
  {
    name: "Paulo Mendes", flag: "🇧🇷",
    text: {
      "pt-BR": "Lucrei R$1.200 hoje. Mês melhor da minha vida nessa plataforma 🏆",
      "en-US": "Made $240 today. Best month of my life on this platform 🏆",
      "es-ES": "Gané $240 hoy. ¡El mejor mes de mi vida en esta plataforma! 🏆",
      "fr-FR": "J'ai gagné 240$ aujourd'hui. Meilleur mois de ma vie sur cette plateforme 🏆",
      "de-DE": "$240 heute verdient. Bester Monat meines Lebens auf dieser Plattform 🏆",
      "ja-JP": "今日$240を稼ぎました。このプラットフォームで人生最高の月 🏆",
    },
  },
  {
    name: "Sarah Connor", flag: "🇺🇸",
    text: {
      "pt-BR": "LINK/USD parece undervalued. Posição de compra aberta 👍",
      "en-US": "LINK/USD looks undervalued. Long position opened 👍",
      "es-ES": "LINK/USD parece infravalorado. Posición larga abierta 👍",
      "fr-FR": "LINK/USD semble sous-évalué. Position longue ouverte 👍",
      "de-DE": "LINK/USD sieht unterbewertet aus. Long-Position eröffnet 👍",
      "ja-JP": "LINK/USDは割安に見える。ロングポジションオープン 👍",
    },
  },
  {
    name: "Takeshi Watanabe", flag: "🇯🇵",
    text: {
      "pt-BR": "Operei 10 vezes hoje, 8 vitórias. Win rate de 80%! Incrível 🌟",
      "en-US": "Traded 10 times today, 8 wins. 80% win rate! Incredible 🌟",
      "es-ES": "Operé 10 veces hoy, 8 victorias. ¡80% de tasa de éxito! Increíble 🌟",
      "fr-FR": "J'ai tradé 10 fois aujourd'hui, 8 gains. 80% de taux de réussite ! Incroyable 🌟",
      "de-DE": "10 Mal heute gehandelt, 8 Siege. 80% Gewinnrate! Unglaublich 🌟",
      "ja-JP": "今日10回取引し8勝。勝率80%！信じられない 🌟",
    },
  },
  {
    name: "Camille Leblanc", flag: "🇫🇷",
    text: {
      "pt-BR": "GBP/JPY muito volátil hoje. Cuidado na operação! ⚠️",
      "en-US": "GBP/JPY very volatile today. Be careful! ⚠️",
      "es-ES": "GBP/JPY muy volátil hoy. ¡Cuidado al operar! ⚠️",
      "fr-FR": "GBP/JPY très volatil aujourd'hui. Attention en tradant ! ⚠️",
      "de-DE": "GBP/JPY heute sehr volatil. Beim Handeln aufpassen! ⚠️",
      "ja-JP": "GBP/JPYが今日非常に不安定。取引には注意！⚠️",
    },
  },
  {
    name: "Bruno Ferreira", flag: "🇧🇷",
    text: {
      "pt-BR": "Alguém viu o BTC/USD agora? Parece rompimento de resistência! 🚨",
      "en-US": "Anyone see BTC/USD right now? Looks like resistance breakout! 🚨",
      "es-ES": "¿Alguien vio BTC/USD ahora? ¡Parece ruptura de resistencia! 🚨",
      "fr-FR": "Quelqu'un a vu BTC/USD maintenant ? On dirait une rupture de résistance ! 🚨",
      "de-DE": "Hat jemand BTC/USD gerade gesehen? Sieht nach Widerstandsdurchbruch aus! 🚨",
      "ja-JP": "BTC/USDを今見た人いる？レジスタンスのブレイクアウトのようだ！🚨",
    },
  },
  {
    name: "Lena Hoffmann", flag: "🇩🇪",
    text: {
      "pt-BR": "Deposita e tenta! Aqui é real, dá para sacar. Já saquei 3 vezes 💰",
      "en-US": "Deposit and try! This is real, you can withdraw. I withdrew 3 times 💰",
      "es-ES": "¡Deposita y prueba! Esto es real, puedes retirar. Ya retiré 3 veces 💰",
      "fr-FR": "Déposez et essayez ! C'est réel, vous pouvez retirer. J'ai retiré 3 fois 💰",
      "de-DE": "Einzahlen und probieren! Das ist echt, man kann abheben. Ich habe 3 Mal abgehoben 💰",
      "ja-JP": "入金して試して！これはリアルで引き出せます。3回引き出しました 💰",
    },
  },
  {
    name: "Ricardo Lima", flag: "🇧🇷",
    text: {
      "pt-BR": "ETH/USD na suporte. Entrada de compra perfeita agora 💡",
      "en-US": "ETH/USD at support. Perfect buy entry right now 💡",
      "es-ES": "ETH/USD en soporte. Entrada de compra perfecta ahora 💡",
      "fr-FR": "ETH/USD sur le support. Entrée d'achat parfaite maintenant 💡",
      "de-DE": "ETH/USD am Support. Perfekter Kaufeinstieg jetzt 💡",
      "ja-JP": "ETH/USDがサポートに。今が完璧な買いエントリー 💡",
    },
  },
];

function timeAgo(seconds: number, locale: Locale): string {
  const map: Record<Locale, (s: number) => string> = {
    "pt-BR": (s) => s < 60 ? `há ${s}s` : `há ${Math.floor(s/60)}min`,
    "en-US": (s) => s < 60 ? `${s}s ago` : `${Math.floor(s/60)}min ago`,
    "es-ES": (s) => s < 60 ? `hace ${s}s` : `hace ${Math.floor(s/60)}min`,
    "fr-FR": (s) => s < 60 ? `il y a ${s}s` : `il y a ${Math.floor(s/60)}min`,
    "de-DE": (s) => s < 60 ? `vor ${s}s` : `vor ${Math.floor(s/60)}min`,
    "ja-JP": (s) => s < 60 ? `${s}秒前` : `${Math.floor(s/60)}分前`,
  };
  return map[locale as Locale]?.(seconds) ?? `${seconds}s ago`;
}

export default function SignalsChat({ locale, isOpen, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [tick, setTick]         = useState(0);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const poolIndex               = useRef(0);
  const nextTimeout             = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loc = (locale as Locale) in TITLE ? (locale as Locale) : "pt-BR";

  // Seed initial messages
  useEffect(() => {
    const initial: Message[] = [];
    for (let i = 0; i < 5; i++) {
      const def = MESSAGE_POOL[i % MESSAGE_POOL.length];
      initial.push({ id: i, name: def.name, flag: def.flag, text: def.text[loc] ?? def.text["pt-BR"], ts: 180 - i * 30 });
    }
    setMessages(initial);
    poolIndex.current = 5;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick every second to update timestamps
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Schedule next random message
  useEffect(() => {
    function scheduleNext() {
      const delay = 3000 + Math.random() * 5000;
      nextTimeout.current = setTimeout(() => {
        const idx = poolIndex.current % MESSAGE_POOL.length;
        const def = MESSAGE_POOL[idx];
        poolIndex.current++;
        setMessages(prev => [...prev.slice(-30), {
          id:   Date.now(),
          name: def.name,
          flag: def.flag,
          text: def.text[loc] ?? def.text["pt-BR"],
          ts:   0,
        }]);
        scheduleNext();
      }, delay);
    }
    scheduleNext();
    return () => { if (nextTimeout.current) clearTimeout(nextTimeout.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Elapsed time per message (counts up each tick)
  const elapsed = useRef<Map<number, number>>(new Map());
  useEffect(() => {
    setMessages(prev => prev.map(m => {
      const current = elapsed.current.get(m.id) ?? m.ts;
      elapsed.current.set(m.id, current + 1);
      return { ...m, ts: current + 1 };
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex">
      <div className="absolute inset-0 sm:relative sm:inset-auto bg-black/40 sm:hidden" onClick={onClose} />
      <div className="relative flex flex-col w-[320px] sm:w-[360px] h-full bg-[#0a0c14] border-l border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-bold text-white">{TITLE[loc]}</span>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all">
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-2.5 animate-fade-in">
              <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-base shrink-0">
                {msg.flag}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-[10px] font-bold text-amber-400">{msg.name}</span>
                  <span className="text-[9px] text-white/20">{timeAgo(msg.ts, loc)}</span>
                </div>
                <div className="text-xs text-white/70 leading-relaxed break-words">
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-white/8 shrink-0">
          <div className="flex items-center gap-2 p-2.5 bg-white/3 border border-white/8 rounded-xl">
            <span className="text-white/20 text-xs flex-1">
              {loc === "pt-BR" ? "Apenas leitura — sinais ao vivo" :
               loc === "en-US" ? "Read only — live signals" :
               loc === "es-ES" ? "Solo lectura — señales en vivo" :
               loc === "fr-FR" ? "Lecture seule — signaux en direct" :
               loc === "de-DE" ? "Nur lesen — Live-Signale" :
               "読み取り専用 — ライブシグナル"}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
}
