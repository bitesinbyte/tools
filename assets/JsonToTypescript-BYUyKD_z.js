import{$ as e,W as t,it as n,p as r,t as i,y as a}from"./Typography-WisVpeWH.js";import{n as o}from"./Grow-B8QqcY4a.js";import{n as s}from"./notistack.esm-D2wh2CYW.js";import{t as c}from"./Grid-D5XvOnAF.js";import{t as l}from"./Stack-CUe3ROGe.js";import{n as u}from"./Popper-B79auzib.js";import{t as d}from"./Chip-Cb7H21g6.js";import{t as f}from"./Tooltip-DETsO9BZ.js";import{t as p}from"./PageHead-Cuk0lQQK.js";import{t as m}from"./ContentCopy-BQtKQGc3.js";import{n as h,t as g}from"./file-ZI_X5ptt.js";import{n as _}from"./CodeEditor-BzhZmHmR.js";import{t as v}from"./Clear-5a7lAf6M.js";import{t as y}from"./Download-B7BrGDdU.js";import{t as b}from"./ContentPaste-C467xyHZ.js";var x=n(e(),1),S=t(),C=`{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "isActive": true,
  "age": 30,
  "tags": ["admin", "user"],
  "address": {
    "street": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "zip": "62701",
    "coordinates": {
      "lat": 39.7817,
      "lng": -89.6501
    }
  },
  "orders": [
    {
      "id": 101,
      "total": 59.99,
      "items": ["Widget A", "Widget B"],
      "date": "2024-01-15"
    },
    {
      "id": 102,
      "total": null,
      "items": [],
      "date": "2024-02-20"
    }
  ]
}`;function w(e,t,n=0){let r=`  `.repeat(n),i=[];if(Array.isArray(e)){if(e.length===0)return`${r}export type ${t} = unknown[];`;let a=T(e[0],`${t}Item`,n);return typeof e[0]==`object`&&e[0]!==null&&!Array.isArray(e[0])?(i.push(w(e[0],`${t}Item`,n)),i.push(``),i.push(`${r}export type ${t} = ${t}Item[];`)):i.push(`${r}export type ${t} = ${a}[];`),i.join(`
`)}if(typeof e==`object`&&e){let a=[];i.push(`${r}export interface ${t} {`);for(let[t,o]of Object.entries(e)){let e=/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(t)?t:`"${t}"`;if(o===null)i.push(`${r}  ${e}: unknown;`);else if(Array.isArray(o))if(o.length>0&&typeof o[0]==`object`&&o[0]!==null){let s=E(t)+`Item`;a.push(w(o[0],s,n)),i.push(`${r}  ${e}: ${s}[];`)}else o.length>0?i.push(`${r}  ${e}: ${T(o[0],t,n)}[];`):i.push(`${r}  ${e}: unknown[];`);else if(typeof o==`object`){let s=E(t);a.push(w(o,s,n)),i.push(`${r}  ${e}: ${s};`)}else i.push(`${r}  ${e}: ${T(o,t,n)};`)}return i.push(`${r}}`),a.length>0?[...a,``,...i].join(`
`):i.join(`
`)}return`${r}export type ${t} = ${typeof e};`}function T(e,t,n){return e===null?`unknown`:typeof e==`string`?`string`:typeof e==`number`?`number`:typeof e==`boolean`?`boolean`:Array.isArray(e)?`unknown[]`:typeof e==`object`?E(t):`unknown`}function E(e){return e.charAt(0).toUpperCase()+e.slice(1)}function D(){let[e,t]=(0,x.useState)(C),[n,T]=(0,x.useState)(`Root`),{enqueueSnackbar:E}=s(),D=r().palette.mode===`dark`,{output:O,error:k}=(0,x.useMemo)(()=>{if(!e.trim())return{output:``,error:``};try{return{output:w(JSON.parse(e),n||`Root`),error:``}}catch(e){return{output:``,error:e.message}}},[e,n]);return(0,S.jsxs)(S.Fragment,{children:[(0,S.jsx)(p,{title:`JSON to TypeScript - BitesInByte Tools`,description:`Convert JSON objects into TypeScript interfaces and types. Free online JSON to TypeScript converter.`}),(0,S.jsxs)(l,{spacing:2.5,children:[(0,S.jsxs)(o,{children:[(0,S.jsx)(i,{variant:`h5`,sx:{mb:.5},children:`JSON to TypeScript`}),(0,S.jsx)(i,{variant:`body2`,color:`text.secondary`,children:`Convert JSON objects into TypeScript interfaces and types automatically.`})]}),(0,S.jsxs)(o,{sx:{display:`flex`,flexWrap:`wrap`,alignItems:`center`,gap:2,p:1.5,borderRadius:2,border:1,borderColor:`divider`,bgcolor:D?a(`#fff`,.02):a(`#000`,.01)},children:[(0,S.jsxs)(o,{sx:{display:`flex`,alignItems:`center`,gap:1},children:[(0,S.jsx)(i,{sx:{fontSize:`0.8125rem`,fontWeight:600},children:`Root name:`}),(0,S.jsx)(`input`,{value:n,onChange:e=>T(e.target.value),style:{border:`1px solid`,borderColor:`inherit`,borderRadius:4,padding:`4px 8px`,fontFamily:`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`,fontSize:`0.8125rem`,width:120,backgroundColor:`transparent`,color:`inherit`}})]}),(0,S.jsx)(o,{sx:{flexGrow:1}}),(0,S.jsx)(f,{title:`Paste JSON`,children:(0,S.jsx)(u,{size:`small`,onClick:async()=>{try{t(await navigator.clipboard.readText())}catch{E(`Failed to paste`,{variant:`error`})}},sx:{color:`text.secondary`},children:(0,S.jsx)(b,{fontSize:`small`})})}),(0,S.jsx)(f,{title:`Clear`,children:(0,S.jsx)(u,{size:`small`,onClick:()=>t(``),disabled:!e,sx:{color:`text.secondary`},children:(0,S.jsx)(v,{fontSize:`small`})})})]}),k&&(0,S.jsx)(d,{label:`JSON Error: ${k}`,color:`error`,variant:`outlined`,size:`small`,sx:{alignSelf:`flex-start`}}),!k&&O&&(0,S.jsx)(d,{label:`Valid JSON`,color:`success`,variant:`outlined`,size:`small`,sx:{alignSelf:`flex-start`}}),(0,S.jsxs)(c,{container:!0,spacing:2,sx:{alignItems:`stretch`},children:[(0,S.jsxs)(c,{size:{xs:12,md:6},children:[(0,S.jsx)(i,{sx:{fontSize:`0.75rem`,fontWeight:600,mb:1,color:`text.secondary`,textTransform:`uppercase`,letterSpacing:`0.05em`},children:`JSON Input`}),(0,S.jsx)(_,{value:e,onChange:e=>t(e),language:`json`,height:450})]}),(0,S.jsxs)(c,{size:{xs:12,md:6},children:[(0,S.jsxs)(o,{sx:{display:`flex`,alignItems:`center`,mb:1},children:[(0,S.jsx)(i,{sx:{fontSize:`0.75rem`,fontWeight:600,color:`text.secondary`,textTransform:`uppercase`,letterSpacing:`0.05em`,flex:1},children:`TypeScript Output`}),(0,S.jsx)(f,{title:`Copy`,children:(0,S.jsx)(u,{size:`small`,onClick:async()=>{let e=await g(O);E(e?`Copied`:`Failed to copy`,{variant:e?`success`:`error`})},disabled:!O,sx:{color:`text.secondary`},children:(0,S.jsx)(m,{sx:{fontSize:16}})})}),(0,S.jsx)(f,{title:`Download`,children:(0,S.jsx)(u,{size:`small`,onClick:()=>h(`types.ts`,O,`text/plain`),disabled:!O,sx:{color:`text.secondary`},children:(0,S.jsx)(y,{sx:{fontSize:16}})})})]}),(0,S.jsx)(_,{value:O,language:`typescript`,readOnly:!0,height:450})]})]})]})]})}export{D as default};