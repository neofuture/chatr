import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{C as r}from"./Checkbox-e_PHXcfl.js";import"./index-CAPI2NOD.js";import"./_commonjsHelpers-Cpj98o6Y.js";const q={title:"Form Controls/Checkbox",component:r,tags:["autodocs"],argTypes:{label:{control:"text"},error:{control:"text"},disabled:{control:"boolean"},checked:{control:"boolean"}}},a={args:{label:"Accept terms and conditions"}},o={args:{label:"Remember me",defaultChecked:!0}},s={args:{label:"I agree to the privacy policy",error:"You must accept the policy to continue"}},t={args:{label:"Unavailable option",disabled:!0}},c={args:{label:"Pre-selected (locked)",disabled:!0,defaultChecked:!0}},l={render:()=>e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"0.5rem"},children:[e.jsx(r,{label:"Notifications via email",defaultChecked:!0}),e.jsx(r,{label:"Notifications via SMS"}),e.jsx(r,{label:"Marketing emails"}),e.jsx(r,{label:"Data sharing (required)",disabled:!0,defaultChecked:!0})]})};var i,d,n;a.parameters={...a.parameters,docs:{...(i=a.parameters)==null?void 0:i.docs,source:{originalSource:`{
  args: {
    label: 'Accept terms and conditions'
  }
}`,...(n=(d=a.parameters)==null?void 0:d.docs)==null?void 0:n.source}}};var u,m,p;o.parameters={...o.parameters,docs:{...(u=o.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    label: 'Remember me',
    defaultChecked: true
  }
}`,...(p=(m=o.parameters)==null?void 0:m.docs)==null?void 0:p.source}}};var b,h,g;s.parameters={...s.parameters,docs:{...(b=s.parameters)==null?void 0:b.docs,source:{originalSource:`{
  args: {
    label: 'I agree to the privacy policy',
    error: 'You must accept the policy to continue'
  }
}`,...(g=(h=s.parameters)==null?void 0:h.docs)==null?void 0:g.source}}};var k,f,x;t.parameters={...t.parameters,docs:{...(k=t.parameters)==null?void 0:k.docs,source:{originalSource:`{
  args: {
    label: 'Unavailable option',
    disabled: true
  }
}`,...(x=(f=t.parameters)==null?void 0:f.docs)==null?void 0:x.source}}};var C,v,y;c.parameters={...c.parameters,docs:{...(C=c.parameters)==null?void 0:C.docs,source:{originalSource:`{
  args: {
    label: 'Pre-selected (locked)',
    disabled: true,
    defaultChecked: true
  }
}`,...(y=(v=c.parameters)==null?void 0:v.docs)==null?void 0:y.source}}};var D,S,j;l.parameters={...l.parameters,docs:{...(D=l.parameters)==null?void 0:D.docs,source:{originalSource:`{
  render: () => <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  }}>
      <Checkbox label="Notifications via email" defaultChecked />
      <Checkbox label="Notifications via SMS" />
      <Checkbox label="Marketing emails" />
      <Checkbox label="Data sharing (required)" disabled defaultChecked />
    </div>
}`,...(j=(S=l.parameters)==null?void 0:S.docs)==null?void 0:j.source}}};const A=["Default","Checked","WithError","Disabled","DisabledChecked","Group"];export{o as Checked,a as Default,t as Disabled,c as DisabledChecked,l as Group,s as WithError,A as __namedExportsOrder,q as default};
