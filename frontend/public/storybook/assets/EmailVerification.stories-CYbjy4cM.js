import{j as r}from"./jsx-runtime-D_zvdyIk.js";import{T as f}from"./ToastContext-CzD02iU9.js";import{P as g}from"./PanelContext-B2ahxC0Z.js";import{T as y}from"./ThemeContext-VTc29vLE.js";import{E as x}from"./EmailVerification-NBVDvvLT.js";import"./index-CAPI2NOD.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./next-navigation-DE2mOHfK.js";import"./index-aA1Q6uWB.js";import"./next-image-DCWzV8LQ.js";import"./authUtils-CbJp93Bj.js";import"./api-BCYJxCpV.js";const w={title:"Forms/EmailVerification",component:x,parameters:{layout:"centered",docs:{description:{component:"Email/phone OTP verification form used during registration and login. Supports email, login, and phone verification types."}}},tags:["autodocs"],decorators:[u=>r.jsx(y,{children:r.jsx(f,{children:r.jsx(g,{children:r.jsx("div",{style:{width:420},children:r.jsx(u,{})})})})})]},e={args:{userId:"story-user-id",email:"user@example.com",verificationType:"email"}},i={args:{userId:"story-user-id",email:"user@example.com",verificationType:"login"}},o={args:{userId:"story-user-id",verificationType:"phone"}};var s,a,t;e.parameters={...e.parameters,docs:{...(s=e.parameters)==null?void 0:s.docs,source:{originalSource:`{
  args: {
    userId: 'story-user-id',
    email: 'user@example.com',
    verificationType: 'email'
  }
}`,...(t=(a=e.parameters)==null?void 0:a.docs)==null?void 0:t.source}}};var n,m,c;i.parameters={...i.parameters,docs:{...(n=i.parameters)==null?void 0:n.docs,source:{originalSource:`{
  args: {
    userId: 'story-user-id',
    email: 'user@example.com',
    verificationType: 'login'
  }
}`,...(c=(m=i.parameters)==null?void 0:m.docs)==null?void 0:c.source}}};var p,d,l;o.parameters={...o.parameters,docs:{...(p=o.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    userId: 'story-user-id',
    verificationType: 'phone'
  }
}`,...(l=(d=o.parameters)==null?void 0:d.docs)==null?void 0:l.source}}};const C=["EmailVerification","LoginVerification","PhoneVerification"];export{e as EmailVerification,i as LoginVerification,o as PhoneVerification,C as __namedExportsOrder,w as default};
