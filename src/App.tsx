import { useMemo, useState } from "react";
import rawData from "./business-data.csv?raw";

const YEARS = ["2020", "2021", "2022", "2023", "2024"];
const COLORS = { chicken: "#E98A15", coffee: "#5B3424" };
const numberFormat = new Intl.NumberFormat("ko-KR");

type Industry = "치킨 전문점" | "커피 전문점";
type RegionData = Record<Industry, Array<number | null>>;

function parseData(csv: string) {
  const rows = csv.trim().split(/\r?\n/).slice(2);
  const parsed: Record<string, RegionData> = {};

  rows.forEach((row) => {
    const cells = row.match(/"([^"]*)"/g)?.map((cell) => cell.slice(1, -1));
    if (!cells) return;
    const [region, industry, , ...values] = cells;
    if (!parsed[region]) {
      parsed[region] = { "치킨 전문점": [], "커피 전문점": [] };
    }
    parsed[region][industry as Industry] = values.map((value) =>
      value === "-" ? null : Number(value),
    );
  });

  return parsed;
}

const DATA = parseData(rawData);
const REGIONS = Object.keys(DATA);
const LOCAL_REGIONS = REGIONS.filter((region) => region !== "전국");

function MetricCard({
  eyebrow,
  value,
  unit,
  tone,
  note,
}: {
  eyebrow: string;
  value: string;
  unit: string;
  tone: "chicken" | "coffee" | "ratio";
  note: string;
}) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <div className="metric-card__top">
        <span className="metric-card__eyebrow">{eyebrow}</span>
        <span className="metric-card__dot" aria-hidden="true" />
      </div>
      <div className="metric-card__value">
        {value}
        <span>{unit}</span>
      </div>
      <div className="metric-card__note">{note}</div>
    </article>
  );
}

function Legend() {
  return (
    <div className="legend" aria-label="차트 범례">
      <span><i className="legend__line legend__line--chicken" />치킨 전문점</span>
      <span><i className="legend__line legend__line--coffee" />커피 전문점</span>
    </div>
  );
}

function LineChart({ region }: { region: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const chicken = DATA[region]["치킨 전문점"];
  const coffee = DATA[region]["커피 전문점"];
  const validValues = [...chicken, ...coffee].filter((v): v is number => v !== null);
  const max = Math.ceil(Math.max(...validValues) / 1000) * 1000;
  const min = 0;
  const width = 800;
  const height = 310;
  const left = 72;
  const right = 26;
  const top = 28;
  const bottom = 48;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const x = (i: number) => left + (i / (YEARS.length - 1)) * plotWidth;
  const y = (value: number) => top + plotHeight - ((value - min) / (max - min)) * plotHeight;
  const series = [
    { key: "chicken", values: chicken, color: COLORS.chicken },
    { key: "coffee", values: coffee, color: COLORS.coffee },
  ];
  const linePath = (values: Array<number | null>) => {
    let started = false;
    return values
      .map((value, i) => {
        if (value === null) return "";
        const command = started ? "L" : "M";
        started = true;
        return `${command} ${x(i)} ${y(value)}`;
      })
      .join(" ");
  };

  return (
    <div className="chart-wrap">
      <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${region} 연도별 치킨 및 커피 전문점 수`}>
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const value = max * (1 - tick);
          const tickY = top + plotHeight * tick;
          return (
            <g key={tick}>
              <line x1={left} x2={width - right} y1={tickY} y2={tickY} className="grid-line" />
              <text x={left - 14} y={tickY + 4} textAnchor="end" className="axis-label">
                {value >= 10000 ? `${Math.round(value / 1000)}천` : numberFormat.format(value)}
              </text>
            </g>
          );
        })}
        {YEARS.map((year, i) => (
          <text key={year} x={x(i)} y={height - 14} textAnchor="middle" className="axis-label axis-label--year">
            {year}
          </text>
        ))}
        {series.map((item) => (
          <g key={item.key}>
            <path d={linePath(item.values)} fill="none" stroke={item.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            {item.values.map((value, i) =>
              value === null ? null : (
                <circle key={i} cx={x(i)} cy={y(value)} r={hovered === i ? 7 : 5} fill={item.color} stroke="#FFF9EE" strokeWidth="3" />
              ),
            )}
          </g>
        ))}
        {YEARS.map((_, i) => (
          <rect
            key={i}
            x={x(i) - plotWidth / 10}
            y={top}
            width={plotWidth / 5}
            height={plotHeight}
            fill="transparent"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(i)}
            onBlur={() => setHovered(null)}
            tabIndex={0}
            aria-label={`${YEARS[i]}년 상세 값`}
          />
        ))}
        {hovered !== null && (
          <line x1={x(hovered)} x2={x(hovered)} y1={top} y2={top + plotHeight} className="hover-line" />
        )}
      </svg>
      {hovered !== null && (
        <div className="chart-tooltip" style={{ left: `${(x(hovered) / width) * 100}%` }}>
          <b>{YEARS[hovered]}년</b>
          <span><i className="dot dot--chicken" />치킨 {chicken[hovered] === null ? "자료 없음" : `${numberFormat.format(chicken[hovered]!)}개`}</span>
          <span><i className="dot dot--coffee" />카페 {coffee[hovered] === null ? "자료 없음" : `${numberFormat.format(coffee[hovered]!)}개`}</span>
        </div>
      )}
    </div>
  );
}

function RankingChart({ selected }: { selected: string }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const ranking = useMemo(
    () =>
      LOCAL_REGIONS.map((region) => ({
        region,
        ratio: DATA[region]["커피 전문점"][4]! / DATA[region]["치킨 전문점"][4]!,
      })).sort((a, b) => b.ratio - a.ratio),
    [],
  );
  const max = Math.max(...ranking.map((item) => item.ratio));

  return (
    <div className="ranking">
      <div className="ranking__scale" aria-hidden="true"><span>0</span><span>1</span><span>2</span><span>3</span><span>4배</span></div>
      <div className="ranking__rows">
        {ranking.map((item, index) => {
          const active = item.region === selected;
          return (
            <div
              className={`ranking-row ${active ? "ranking-row--active" : ""}`}
              key={item.region}
              onMouseEnter={() => setHovered(item.region)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="ranking-row__rank">{String(index + 1).padStart(2, "0")}</span>
              <span className="ranking-row__region">{item.region}</span>
              <div className="ranking-row__track">
                <div className="ranking-row__bar" style={{ width: `${(item.ratio / max) * 100}%` }} />
                {(hovered === item.region || active) && (
                  <span className="ranking-row__tooltip">{item.ratio.toFixed(2)}배</span>
                )}
              </div>
              <strong>{item.ratio.toFixed(2)}배</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [selected, setSelected] = useState("전국");
  const nationalChicken = DATA["전국"]["치킨 전문점"][4]!;
  const nationalCoffee = DATA["전국"]["커피 전문점"][4]!;
  const ratio = nationalCoffee / nationalChicken;

  return (
    <main className="app-shell">
      <header className="hero">
        <div className="hero__kicker"><span />KOSIS DATA STORY · 2024</div>
        <div className="hero__title">치킨 <em>vs</em> 커피</div>
        <div className="hero__headline">대한민국 동네 상권 전쟁</div>
        <p>치킨집은 줄고, 카페는 늘었다. 우리 동네는?</p>
      </header>

      <section className="metrics" aria-label="2024년 전국 주요 수치">
        <MetricCard eyebrow="2024 전국 치킨집" value={numberFormat.format(nationalChicken)} unit="개" tone="chicken" note="2020년 대비 6.8% 감소" />
        <MetricCard eyebrow="2024 전국 카페" value={numberFormat.format(nationalCoffee)} unit="개" tone="coffee" note="2020년 대비 19.1% 증가" />
        <MetricCard eyebrow="카페 ÷ 치킨" value={ratio.toFixed(2)} unit="배" tone="ratio" note="치킨집 1곳당 카페 수" />
      </section>

      <section className="panel trend-panel">
        <div className="panel__heading">
          <div>
            <span className="section-label">01 · TIME SERIES</span>
            <div className="section-title">지역별 점포 수 변화</div>
            <p>연도별 치킨집과 카페의 흐름을 비교해 보세요.</p>
          </div>
          <label className="region-select">
            <span>지역 선택</span>
            <select value={selected} onChange={(event) => setSelected(event.target.value)}>
              {REGIONS.map((region) => <option key={region}>{region}</option>)}
            </select>
          </label>
        </div>
        <div className="chart-heading">
          <div className="chart-heading__region">{selected}</div>
          <Legend />
        </div>
        <LineChart region={selected} />
        {selected !== "전국" && <p className="data-note">※ 시도별 2020년 값은 자료 없음</p>}
      </section>

      <section className="panel ranking-panel">
        <div className="panel__heading">
          <div>
            <span className="section-label">02 · RANKING</span>
            <div className="section-title">카페가 더 많은 지역은?</div>
            <p>2024년 치킨집 1곳당 카페 수 · 높은 순</p>
          </div>
          <div className="ranking-badge">17개 시도</div>
        </div>
        <RankingChart selected={selected} />
      </section>

      <footer>출처: 통계청 KOSIS 전국사업체조사(등록기반) 2020~2024</footer>
    </main>
  );
}
