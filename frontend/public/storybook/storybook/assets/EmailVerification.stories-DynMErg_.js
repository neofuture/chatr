import{j as r}from"./jsx-runtime-EKYJJIwR.js";import{T as f}from"./ToastContext-9whTi6PI.js";import{P as g}from"./PanelContext-CXd8bETb.js";import{T as y}from"./ThemeContext-Bg5mVwRy.js";import{E as x}from"./EmailVerification-yzjBcHfU.js";import"./index-BRD0Ja2P.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-DMNe2g_Q.js";import"./next-navigation-DE2mOHfK.js";import"./index-aA1Q6uWB.js";import"./next-image-Y3-adYbb.js";import"./authUtils-CbJp93Bj.js";import"./api-BCYJxCpV.js";const C={title:"Forms/EmailVerification",component:x,parameters:{layout:"centered",docs:{description:{component:"Email/phone OTP verification form used during registration and login. Supports email, login, and phone verification types."}}},tags:["autodocs"],decorators:[u=>r.jsx(y,{children:r.jsx(f,{children:r.jsx(g,{children:r.jsx("div",{style:{width:420},children:r.jsx(u,{})})})})})]},e={args:{userId:"story-user-id",email:"user@example.com",verificationType:"email"}},i={args:{userId:"story-user-id",email:"user@example.com",verificationType:"login"}},o={args:{userId:"story-user-id",verificationType:"phone"}};var s,a,t;e.parameters={...e.parameters,docs:{...(s=e.parameters)==null?void 0:s.docs,source:{originalSource:`{
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
}`,...(l=(d=o.parameters)==null?void 0:d.docs)==null?void 0:l.source}}};const F=["EmailVerification","LoginVerification","PhoneVerification"];export{e as EmailVerification,i as LoginVerification,o as PhoneVerification,F as __namedExportsOrder,C as default};
