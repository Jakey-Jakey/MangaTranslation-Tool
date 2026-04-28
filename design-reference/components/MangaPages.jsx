/* global React */
// Placeholder manga pages rendered as SVG — geometric comic-style panels with
// fake Japanese-looking marks. Used for mocks only (not real manga art).

const MangaPageBase = ({ children, tone = "cream", width = 760, height = 1080, style }) => {
  const tones = {
    cream: { bg: "#F4EFE4", panel: "#FBF7EC", line: "#14110E", tone: "#E2DBC7" },
    light: { bg: "#F6F3EC", panel: "#FFFDF6", line: "#1A1815", tone: "#E7E0CE" },
    grey:  { bg: "#E3E0D7", panel: "#F1EEE5", line: "#17161A", tone: "#CCC8BC" },
  };
  const T = tones[tone] || tones.cream;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={style} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
      <rect width={width} height={height} fill={T.bg} />
      <g stroke={T.line} fill={T.panel} strokeWidth="3" strokeLinejoin="miter">
        {children(T)}
      </g>
    </svg>
  );
};

const Speed = ({ cx, cy, r = 40, count = 14, tone, angle = 0 }) => (
  <g stroke={tone.line} strokeWidth="1.2" opacity="0.75">
    {Array.from({ length: count }).map((_, i) => {
      const a = (i / count) * Math.PI * 2 + angle;
      const x1 = cx + Math.cos(a) * r, y1 = cy + Math.sin(a) * r;
      const x2 = cx + Math.cos(a) * (r + 26 + (i % 3) * 8), y2 = cy + Math.sin(a) * (r + 26 + (i % 3) * 8);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
    })}
  </g>
);

const Hatch = ({ x, y, w, h, dir = 1, density = 8, tone }) => (
  <g stroke={tone.line} strokeWidth="1" opacity="0.55" clipPath={`url(#clip-${x}-${y})`}>
    <defs>
      <clipPath id={`clip-${x}-${y}`}><rect x={x} y={y} width={w} height={h} /></clipPath>
    </defs>
    {Array.from({ length: Math.ceil((w + h) / density) }).map((_, i) => {
      const o = i * density - h;
      return <line key={i} x1={x + o} y1={y} x2={x + o + (h * dir)} y2={y + h} />;
    })}
  </g>
);

const Bubble = ({ cx, cy, rx = 90, ry = 48, tail, tone, children, fontSize = 22, color }) => (
  <g>
    <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={tone.panel} stroke={tone.line} strokeWidth="2.5" />
    {tail && <path d={tail} fill={tone.panel} stroke={tone.line} strokeWidth="2.5" />}
    <text x={cx} y={cy + 6} textAnchor="middle" fontFamily="'Noto Serif JP', serif" fontSize={fontSize} fill={color || tone.line} style={{ fontWeight: 500, letterSpacing: "0.05em" }}>
      {children}
    </text>
  </g>
);

const SFXText = ({ x, y, tone, children, size = 64, rotate = -8, color, style }) => (
  <text x={x} y={y} fontFamily="'Instrument Serif', 'Noto Serif JP', serif" fontWeight="800" fontSize={size}
    fill={color || tone.line} stroke={tone.panel} strokeWidth="3" paintOrder="stroke" transform={`rotate(${rotate} ${x} ${y})`}
    style={{ letterSpacing: "0.02em", ...style }}>
    {children}
  </text>
);

// Page 1 — a dialogue page with bubbles. Readable crops: S1, S2, N1, SFX1.
const MangaPage01 = (props) => (
  <MangaPageBase {...props}>
    {(T) => (
      <>
        {/* panel 1 - narration box and silhouette */}
        <rect x="32" y="36" width="696" height="280" />
        <rect x="56" y="58" width="220" height="60" fill={T.panel} />
        <text x="166" y="100" textAnchor="middle" fontFamily="'Instrument Serif',serif" fontSize="22" fill={T.line} stroke="none">
          The last train to Yurakuchō.
        </text>
        <path d="M 420 300 Q 460 180 540 170 L 650 170 L 660 300 Z" fill={T.tone} />
        <circle cx="530" cy="220" r="38" fill={T.line} />
        <rect x="460" y="260" width="200" height="60" fill={T.line} opacity="0.85" />

        {/* panel 2 - close-up with speech */}
        <rect x="32" y="328" width="340" height="360" />
        <circle cx="200" cy="480" r="140" fill={T.tone} />
        <path d="M 140 430 l 50 -20 M 220 430 l 50 -20" stroke={T.line} strokeWidth="4" fill="none" />
        <circle cx="165" cy="445" r="6" fill={T.line} />
        <circle cx="245" cy="445" r="6" fill={T.line} />
        <path d="M 170 530 Q 200 550 230 530" stroke={T.line} strokeWidth="3" fill="none" />
        <Bubble cx={280} cy={380} rx={80} ry={44} tone={T} tail="M 240 410 L 225 445 L 260 420 Z" fontSize={20}>
          …you're late.
        </Bubble>

        {/* panel 3 - action with SFX */}
        <rect x="388" y="328" width="340" height="200" />
        <Hatch x={388} y={328} w={340} h={200} density={14} tone={T} />
        <SFXText x={560} y={430} tone={T} size={72} rotate={-10}>DOKUN</SFXText>
        <line x1="388" y1="440" x2="728" y2="340" stroke={T.line} strokeWidth="2" />
        <line x1="388" y1="500" x2="728" y2="400" stroke={T.line} strokeWidth="1.5" />

        {/* panel 4 - bottom wide */}
        <rect x="388" y="540" width="340" height="148" />
        <path d="M 420 680 L 520 580 L 620 680" fill={T.tone} />
        <Bubble cx={510} cy={600} rx={110} ry={40} tone={T} tail="M 460 630 L 440 660 L 475 640 Z" fontSize={18}>
          I had to make sure.
        </Bubble>

        {/* panel 5 - split bottom */}
        <rect x="32" y="700" width="358" height="340" />
        <Speed cx={210} cy={870} r={80} count={22} tone={T} />
        <circle cx="210" cy="870" r="70" fill={T.tone} />
        <rect x="170" y="830" width="80" height="80" fill={T.line} />
        <SFXText x={100} y={990} tone={T} size={44} rotate={-4}>zaza—</SFXText>

        <rect x="406" y="700" width="322" height="340" />
        <rect x="440" y="740" width="260" height="260" fill={T.tone} />
        <circle cx="570" cy="870" r="60" fill={T.panel} stroke={T.line} strokeWidth="3" />
        <circle cx="558" cy="860" r="4" fill={T.line} />
        <circle cx="588" cy="860" r="4" fill={T.line} />
        <path d="M 548 885 Q 570 900 592 885" stroke={T.line} strokeWidth="2.5" fill="none" />
        <Bubble cx={570} cy={990} rx={90} ry={34} tone={T} fontSize={16}>
          Run.
        </Bubble>
      </>
    )}
  </MangaPageBase>
);

// Page 2 — splash with big SFX
const MangaPage02 = (props) => (
  <MangaPageBase {...props}>
    {(T) => (
      <>
        <rect x="32" y="36" width="696" height="1004" />
        <Hatch x={32} y={36} w={696} h={504} density={20} tone={T} />
        <Speed cx={380} cy={460} r={160} count={36} tone={T} />
        <circle cx="380" cy="460" r="120" fill={T.panel} stroke={T.line} strokeWidth="4" />
        <path d="M 300 440 q 40 -30 80 0 q 40 30 80 -5" stroke={T.line} strokeWidth="6" fill="none" />
        <SFXText x={380} y={240} tone={T} size={160} rotate={-6}>BAN!!</SFXText>
        <SFXText x={200} y={780} tone={T} size={80} rotate={8} color={T.line}>guo—</SFXText>
        <Bubble cx={560} cy={900} rx={140} ry={52} tone={T} fontSize={22} tail="M 500 940 L 460 990 L 520 950 Z">
          Not again…
        </Bubble>
      </>
    )}
  </MangaPageBase>
);

// Page 3 — quiet page, lots of narration
const MangaPage03 = (props) => (
  <MangaPageBase {...props}>
    {(T) => (
      <>
        <rect x="32" y="36" width="340" height="320" />
        <rect x="52" y="56" width="300" height="84" fill={T.panel} />
        <text x="70" y="88" fontFamily="'Instrument Serif',serif" fontSize="20" fill={T.line} stroke="none">The rain fell for three days</text>
        <text x="70" y="116" fontFamily="'Instrument Serif',serif" fontSize="20" fill={T.line} stroke="none">and washed the ink from her</text>
        <text x="70" y="144" fontFamily="'Instrument Serif',serif" fontSize="20" fill={T.line} stroke="none">grandmother's letters.</text>
        <rect x="52" y="170" width="300" height="168" fill={T.tone} />
        {Array.from({ length: 12 }).map((_, i) => <line key={i} x1={60 + i * 24} y1={180} x2={60 + i * 24} y2={328} stroke={T.line} strokeWidth="0.6" />)}

        <rect x="388" y="36" width="340" height="320" />
        <circle cx="558" cy="190" r="120" fill={T.tone} />
        <circle cx="558" cy="190" r="40" fill={T.panel} stroke={T.line} strokeWidth="3" />
        <Bubble cx={558} cy={310} rx={110} ry={30} tone={T} fontSize={16}>…hello, obaasan.</Bubble>

        <rect x="32" y="368" width="696" height="360" />
        <rect x="56" y="392" width="648" height="312" fill={T.tone} />
        <text x="380" y="556" textAnchor="middle" fontFamily="'Instrument Serif',serif" fontStyle="italic" fontSize="34" fill={T.line} stroke="none">
          The house remembered her.
        </text>

        <rect x="32" y="740" width="340" height="300" />
        <Hatch x={32} y={740} w={340} h={300} density={18} tone={T} />
        <SFXText x={180} y={900} tone={T} size={56} rotate={-2}>shii—n</SFXText>

        <rect x="388" y="740" width="340" height="300" />
        <rect x="410" y="760" width="296" height="260" fill={T.panel} />
        <rect x="430" y="780" width="256" height="60" fill={T.tone} />
        <rect x="430" y="860" width="256" height="16" fill={T.tone} />
        <rect x="430" y="886" width="180" height="10" fill={T.tone} />
        <rect x="430" y="906" width="220" height="10" fill={T.tone} />
      </>
    )}
  </MangaPageBase>
);

const MangaPages = [MangaPage01, MangaPage02, MangaPage03];
const MangaPageTitles = ["ch02_p014", "ch02_p015", "ch02_p016"];

Object.assign(window, { MangaPages, MangaPageTitles });
