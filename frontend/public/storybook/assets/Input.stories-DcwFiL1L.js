import{j as l}from"./jsx-runtime-D_zvdyIk.js";import{I as W}from"./Input-DFbNlUMn.js";import"./index-CAPI2NOD.js";import"./_commonjsHelpers-Cpj98o6Y.js";const O={title:"Form Controls/Input",component:W,tags:["autodocs"],parameters:{docs:{description:{component:"Text input with optional label, error state, and icon slot."}}},argTypes:{label:{control:"text"},placeholder:{control:"text"},error:{control:"text"},disabled:{control:"boolean"},type:{control:"select",options:["text","email","password","number","search"]}}},e={args:{placeholder:"Enter text…"}},r={args:{label:"Email address",placeholder:"user@example.com",type:"email"}},a={args:{label:"Password",value:"short",error:"Password must be at least 8 characters",readOnly:!0}},s={args:{label:"Search",placeholder:"Search users…",icon:l.jsxs("svg",{width:"18",height:"18",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",children:[l.jsx("circle",{cx:"11",cy:"11",r:"8"}),l.jsx("line",{x1:"21",y1:"21",x2:"16.65",y2:"16.65"})]})}},o={args:{label:"Password",type:"password",placeholder:"••••••••"}},t={args:{label:"Disabled field",value:"Cannot edit",disabled:!0,readOnly:!0}};var c,n,d;e.parameters={...e.parameters,docs:{...(c=e.parameters)==null?void 0:c.docs,source:{originalSource:`{
  args: {
    placeholder: 'Enter text…'
  }
}`,...(d=(n=e.parameters)==null?void 0:n.docs)==null?void 0:d.source}}};var i,p,m;r.parameters={...r.parameters,docs:{...(i=r.parameters)==null?void 0:i.docs,source:{originalSource:`{
  args: {
    label: 'Email address',
    placeholder: 'user@example.com',
    type: 'email'
  }
}`,...(m=(p=r.parameters)==null?void 0:p.docs)==null?void 0:m.source}}};var u,h,b;a.parameters={...a.parameters,docs:{...(u=a.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    label: 'Password',
    value: 'short',
    error: 'Password must be at least 8 characters',
    readOnly: true
  }
}`,...(b=(h=a.parameters)==null?void 0:h.docs)==null?void 0:b.source}}};var g,x,w;s.parameters={...s.parameters,docs:{...(g=s.parameters)==null?void 0:g.docs,source:{originalSource:`{
  args: {
    label: 'Search',
    placeholder: 'Search users…',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
  }
}`,...(w=(x=s.parameters)==null?void 0:x.docs)==null?void 0:w.source}}};var y,S,f;o.parameters={...o.parameters,docs:{...(y=o.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    label: 'Password',
    type: 'password',
    placeholder: '••••••••'
  }
}`,...(f=(S=o.parameters)==null?void 0:S.docs)==null?void 0:f.source}}};var v,E,P;t.parameters={...t.parameters,docs:{...(v=t.parameters)==null?void 0:v.docs,source:{originalSource:`{
  args: {
    label: 'Disabled field',
    value: 'Cannot edit',
    disabled: true,
    readOnly: true
  }
}`,...(P=(E=t.parameters)==null?void 0:E.docs)==null?void 0:P.source}}};const k=["Default","WithLabel","WithError","WithIcon","Password","Disabled"];export{e as Default,t as Disabled,o as Password,a as WithError,s as WithIcon,r as WithLabel,k as __namedExportsOrder,O as default};
