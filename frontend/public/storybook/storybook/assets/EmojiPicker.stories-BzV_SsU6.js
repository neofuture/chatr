import{j as e}from"./jsx-runtime-EKYJJIwR.js";import{f as c}from"./index-aA1Q6uWB.js";import{r as p}from"./index-BRD0Ja2P.js";import{T as h}from"./ThemeContext-Bg5mVwRy.js";import{E as a}from"./EmojiPicker-CfhMeKXb.js";import{B as k}from"./Button-CgqB4DRV.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-DMNe2g_Q.js";const b={title:"Messaging/EmojiPicker",component:a,tags:["autodocs"],parameters:{docs:{description:{component:"Infinite-scroll emoji picker with sticky category headers, recent emojis, and search. Categories: Smileys, People, Animals, Food, Travel, Activities, Objects, Symbols, Flags."}}},decorators:[n=>e.jsx(h,{children:e.jsx(n,{})})]};function S({openUpward:n}){const[w,i]=p.useState(!1),[d,P]=p.useState("");return e.jsxs("div",{style:{position:"relative",padding:"2rem"},children:[e.jsxs("div",{style:{marginBottom:"1rem",display:"flex",alignItems:"center",gap:"1rem"},children:[e.jsx(k,{variant:"primary",onClick:()=>i(t=>!t),children:"😊 Toggle Picker"}),d&&e.jsx("span",{style:{fontSize:"2rem"},title:"Last selected",children:d})]}),w&&e.jsx(a,{onSelect:t=>{P(t)},onClose:()=>i(!1),openUpward:n})]})}const r={render:()=>e.jsx(S,{openUpward:!1})},s={render:()=>e.jsx("div",{style:{paddingTop:"400px"},children:e.jsx(S,{openUpward:!0})})},o={render:()=>e.jsx(h,{children:e.jsx("div",{style:{padding:"1rem"},children:e.jsx(a,{onSelect:c(),onClose:c(),openUpward:!1})})})};var m,l,f;r.parameters={...r.parameters,docs:{...(m=r.parameters)==null?void 0:m.docs,source:{originalSource:`{
  render: () => <PickerDemo openUpward={false} />
}`,...(f=(l=r.parameters)==null?void 0:l.docs)==null?void 0:f.source}}};var j,x,u;s.parameters={...s.parameters,docs:{...(j=s.parameters)==null?void 0:j.docs,source:{originalSource:`{
  render: () => <div style={{
    paddingTop: '400px'
  }}>
      <PickerDemo openUpward />
    </div>
}`,...(u=(x=s.parameters)==null?void 0:x.docs)==null?void 0:u.source}}};var g,v,y;o.parameters={...o.parameters,docs:{...(g=o.parameters)==null?void 0:g.docs,source:{originalSource:`{
  render: () => <ThemeProvider>
      <div style={{
      padding: '1rem'
    }}>
        <EmojiPicker onSelect={fn()} onClose={fn()} openUpward={false} />
      </div>
    </ThemeProvider>
}`,...(y=(v=o.parameters)==null?void 0:v.docs)==null?void 0:y.source}}};const F=["Default","OpenUpward","AlwaysOpen"];export{o as AlwaysOpen,r as Default,s as OpenUpward,F as __namedExportsOrder,b as default};
