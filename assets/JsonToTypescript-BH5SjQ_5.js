import{a as e}from"./rolldown-runtime-CNC7AqOf.js";import{U as t,f as n,n as r,nt as i,t as a,y as o}from"./PageHead-DD58soih.js";import{n as s}from"./Grow-CIU0Z2dB.js";import{t as c}from"./Grid-C1J0o4my.js";import{n as l}from"./Popper-D58BVZwA.js";import{t as u}from"./Chip-CYyqpxkZ.js";import{C as d,_ as f,g as p,h as m}from"./index-HS3P5Cg4.js";import{t as h}from"./Clear-CiLR3PZI.js";import{t as g}from"./ContentCopy-BSrmCw4L.js";import{n as _,t as v}from"./file-Dno4PaHY.js";import{n as y}from"./CodeEditor-BUDCdnJj.js";import{t as b}from"./Download-C4wK16dg.js";import{t as x}from"./ContentPaste-Cu4RKAA3.js";var S=e(i(),1),C=t(),w=`{
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
}`,T=new Set(`any.boolean.break.case.catch.class.const.continue.debugger.default.delete.do.else.enum.export.extends.false.finally.for.function.if.implements.import.in.instanceof.interface.let.new.null.number.package.private.protected.public.return.static.string.super.switch.this.throw.true.try.type.typeof.undefined.unknown.var.void.while.with.yield`.split(`.`));function E(e,t=`Type`){let n=e.trim().split(/[^A-Za-z0-9_$]+/).filter(Boolean).map(e=>e.charAt(0).toUpperCase()+e.slice(1)).join(``)||t;return/^[A-Za-z_$]/.test(n)||(n=`T${n}`),T.has(n.toLowerCase())&&(n=`${n}Type`),n}function D(e){return typeof e==`object`&&!!e&&!Array.isArray(e)}var O=class{declarations=[];usedNames=new Map;generate(e,t){let n=this.reserveName(E(t||`Root`,`Root`));if(D(e))this.createObjectType([e],n,!0);else{let t=Array.isArray(e)?this.inferArrayType(e,`${n}Item`):this.inferType([e],`${n}Value`);this.declarations.push(`export type ${n} = ${t};`)}return this.declarations.join(`

`)}reserveName(e){let t=E(e),n=this.usedNames.get(t)??0;return this.usedNames.set(t,n+1),n===0?t:`${t}${n+1}`}createObjectType(e,t,n=!1){let r=n?t:this.reserveName(t),i=Array.from(new Set(e.flatMap(e=>Object.keys(e)))).map(t=>{let n=e.filter(e=>Object.prototype.hasOwnProperty.call(e,t)).map(e=>e[t]),r=n.length<e.length,i=/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(t)?t:JSON.stringify(t),a=this.inferType(n,E(t,`Value`));return`  ${i}${r?`?`:``}: ${a};`});return this.declarations.push([`export interface ${r} {`,...i,`}`].join(`
`)),r}inferType(e,t){let n=[],r=e=>{n.includes(e)||n.push(e)},i=e.filter(D);i.length>0&&r(this.createObjectType(i,t));let a=e.filter(Array.isArray);return a.length>0&&r(this.inferArrayType(a.flat(),`${t}Item`)),e.forEach(e=>{e===null?r(`null`):typeof e==`string`?r(`string`):typeof e==`number`?r(`number`):typeof e==`boolean`&&r(`boolean`)}),n.length>0?n.join(` | `):`unknown`}inferArrayType(e,t){if(e.length===0)return`unknown[]`;let n=this.inferType(e,t);return n.includes(` | `)?`(${n})[]`:`${n}[]`}};function k(e,t){return new O().generate(e,t)}function A(){let[e,t]=(0,S.useState)(w),[i,T]=(0,S.useState)(`Root`),{enqueueSnackbar:E}=d(),D=n().palette.mode===`dark`,{output:O,error:A}=(0,S.useMemo)(()=>{if(!e.trim())return{output:``,error:``};try{return{output:k(JSON.parse(e.replace(/^\uFEFF/,``)),i||`Root`),error:``}}catch(e){return{output:``,error:e.message}}},[e,i]);return(0,C.jsxs)(C.Fragment,{children:[(0,C.jsx)(a,{title:`JSON to TypeScript - Lamplit Labs Tools`,description:`Convert JSON objects into TypeScript interfaces and types. Free online JSON to TypeScript converter.`}),(0,C.jsxs)(p,{spacing:2.5,children:[(0,C.jsxs)(s,{children:[(0,C.jsx)(r,{variant:`h5`,sx:{mb:.5},children:`JSON to TypeScript`}),(0,C.jsx)(r,{variant:`body2`,color:`text.secondary`,children:`Convert JSON objects into TypeScript interfaces and types automatically.`})]}),(0,C.jsxs)(s,{sx:{display:`flex`,flexWrap:`wrap`,alignItems:`center`,gap:2,p:1.5,borderRadius:2,border:1,borderColor:`divider`,bgcolor:D?o(`#fff`,.02):o(`#000`,.01)},children:[(0,C.jsx)(s,{sx:{width:{xs:`100%`,sm:`auto`}},children:(0,C.jsx)(m,{label:`Root type name`,size:`small`,value:i,onChange:e=>T(e.target.value),sx:{width:{xs:`100%`,sm:180}},slotProps:{htmlInput:{style:{fontFamily:`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`,fontSize:`0.8125rem`}}}})}),(0,C.jsx)(s,{sx:{flexGrow:1}}),(0,C.jsx)(f,{title:`Paste JSON`,children:(0,C.jsx)(l,{"aria-label":`Paste JSON`,size:`small`,onClick:async()=>{try{let e=await navigator.clipboard.readText();t(e)}catch{E(`Failed to paste`,{variant:`error`})}},sx:{color:`text.secondary`},children:(0,C.jsx)(x,{fontSize:`small`})})}),(0,C.jsx)(f,{title:`Clear`,children:(0,C.jsx)(l,{"aria-label":`Clear JSON input`,size:`small`,onClick:()=>t(``),disabled:!e,sx:{color:`text.secondary`},children:(0,C.jsx)(h,{fontSize:`small`})})})]}),A&&(0,C.jsx)(u,{label:`JSON Error: ${A}`,color:`error`,variant:`outlined`,size:`small`,sx:{alignSelf:`flex-start`,maxWidth:`100%`,"& .MuiChip-label":{overflow:`hidden`,textOverflow:`ellipsis`}}}),!A&&O&&(0,C.jsx)(u,{label:`Valid JSON`,color:`success`,variant:`outlined`,size:`small`,sx:{alignSelf:`flex-start`}}),(0,C.jsxs)(c,{container:!0,spacing:2,sx:{alignItems:`stretch`},children:[(0,C.jsxs)(c,{size:{xs:12,md:6},children:[(0,C.jsx)(r,{sx:{fontSize:`0.75rem`,fontWeight:600,mb:1,color:`text.secondary`,textTransform:`uppercase`,letterSpacing:`0.05em`},children:`JSON Input`}),(0,C.jsx)(y,{value:e,onChange:e=>t(e),language:`json`,height:450})]}),(0,C.jsxs)(c,{size:{xs:12,md:6},children:[(0,C.jsxs)(s,{sx:{display:`flex`,alignItems:`center`,mb:1},children:[(0,C.jsx)(r,{sx:{fontSize:`0.75rem`,fontWeight:600,color:`text.secondary`,textTransform:`uppercase`,letterSpacing:`0.05em`,flex:1},children:`TypeScript Output`}),(0,C.jsx)(f,{title:`Copy`,children:(0,C.jsx)(l,{"aria-label":`Copy TypeScript output`,size:`small`,onClick:async()=>{let e=await v(O);E(e?`Copied`:`Failed to copy`,{variant:e?`success`:`error`})},disabled:!O,sx:{color:`text.secondary`},children:(0,C.jsx)(g,{sx:{fontSize:16}})})}),(0,C.jsx)(f,{title:`Download`,children:(0,C.jsx)(l,{size:`small`,"aria-label":`Download TypeScript output`,onClick:()=>{try{_(`types.ts`,O,`text/plain`),E(`File downloaded`,{variant:`success`})}catch{E(`Failed to download file`,{variant:`error`})}},disabled:!O,sx:{color:`text.secondary`},children:(0,C.jsx)(b,{sx:{fontSize:16}})})})]}),(0,C.jsx)(y,{value:O,language:`typescript`,readOnly:!0,height:450})]})]})]})]})}export{A as default};