import React from 'react';

/** Decorative, stationary scenery stays behind the independently scrolling chat. */
export function ChannelAtmosphere({ theme }: { theme: 'pokemon' | 'harry-potter' }) {
  const pokemon = theme === 'pokemon';
  return <div className={`channel-atmosphere atmosphere-${theme}`} aria-hidden="true">
    <div className="atmosphere-haze"/>
    <svg className="atmosphere-landscape" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMax slice" fill="none">
      {pokemon ? <>
        <circle className="atmosphere-moon" cx="1030" cy="180" r="76"/>
        <path className="landscape-distant" d="M0 610 160 350 285 530 475 270 695 550 865 370 1070 555 1200 430V800H0Z"/>
        <path className="landscape-snow" d="m475 270-52 77 44-14 23 21 24-30Z M160 350l-35 57 35-16 21 16 13-2Z"/>
        <path className="landscape-mid" d="M0 690Q200 500 430 650T850 615T1200 630V800H0Z"/>
        <path className="landscape-river" d="M700 620q-170 70 60 105l150 75H640q-220-65-92-114Z"/>
        <path className="landscape-near" d="M0 710q180-25 300 90H0ZM1200 670q-160 60-190 130h190Z"/>
        <g className="landscape-trees"><path d="m95 550-44 94h28l-40 74h112l-40-74h28ZM1120 525l-48 107h30l-42 80h120l-42-80h30Z"/></g>
        <g className="atmosphere-ball" transform="translate(1040 650) rotate(-15)"><circle r="48"/><path d="M-48 0h96"/><circle r="14"/></g>
      </> : <>
        <circle className="atmosphere-moon" cx="980" cy="170" r="68"/>
        <path className="landscape-distant" d="M0 610 180 480 380 600 630 420 890 580 1200 430V800H0Z"/>
        <g className="atmosphere-castle">
          <path d="M610 690V440h35V325l29-58 29 58v115h40v-60l24-42 24 42v108h50V295l33-66 33 66v130h40v-60l24-45 24 45v130h45v-65l24-42 24 42v260Z"/>
          <path className="castle-roofs" d="m645 325 29-58 29 58Zm196-30 33-66 33 66Zm-98 85 24-42 24 42Zm204-15 24-45 24 45Z"/>
          <g className="castle-windows"><path d="M668 354v18m0 37v18m99-17v18m100-85v18m0 31v18m16 40v18m89-66v18m-235 82v18m64-4v18m34-2v18m83-4v18m-188-13v18m94 10v18m128-5v18"/></g>
        </g>
        <path className="landscape-mid" d="M0 720q180-125 390-40t400-15 410-40v175H0Z"/>
        <path className="landscape-river" d="M570 715q220-25 380 0l-65 85H440Z"/>
        <path className="landscape-near" d="M0 740q220-30 340 60H0Zm1200-30q-190 40-240 90h240Z"/>
      </>}
    </svg>
    <div className="atmosphere-motes">{Array.from({ length: 16 }, (_, i) => <i key={i} style={{ left: `${4 + (i * 29) % 92}%`, top: `${8 + (i * 19) % 80}%`, animationDelay: `${i * -.9}s` }}/>)}</div>
  </div>;
}
