import{j as e}from"./jsx-runtime-EKYJJIwR.js";import{T as u}from"./ToastContext-9whTi6PI.js";import{P as f}from"./PanelContext-CXd8bETb.js";import{T as h}from"./ThemeContext-Bg5mVwRy.js";import{A as w}from"./AuthPanel-DmBhYXHQ.js";import"./index-BRD0Ja2P.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-DMNe2g_Q.js";import"./next-navigation-DE2mOHfK.js";import"./index-aA1Q6uWB.js";import"./next-image-Y3-adYbb.js";import"./EmailVerification-yzjBcHfU.js";import"./authUtils-CbJp93Bj.js";import"./api-BCYJxCpV.js";import"./ForgotPassword-6KAhs3JU.js";import"./iframe-RQmeSJ4X.js";const k={title:"Panels/AuthPanel",component:w,parameters:{layout:"fullscreen",docs:{description:{component:"Slide-in authentication panel hosting login and register flows. Switches between views with an animated transition. Opens sub-panels for forgot password and email verification."}}},tags:["autodocs"],decorators:[g=>e.jsx(h,{children:e.jsx(u,{children:e.jsx(f,{children:e.jsx("div",{style:{height:"100vh",background:"#0f172a"},children:e.jsx(g,{})})})})})]},o={args:{isOpen:!0,onClose:()=>console.log("Close"),initialView:"login"}},r={args:{isOpen:!0,onClose:()=>console.log("Close"),initialView:"register"}},s={args:{isOpen:!1,onClose:()=>{},initialView:"login"}};var i,n,t;o.parameters={...o.parameters,docs:{...(i=o.parameters)==null?void 0:i.docs,source:{originalSource:`{
  args: {
    isOpen: true,
    onClose: () => console.log('Close'),
    initialView: 'login'
  }
}`,...(t=(n=o.parameters)==null?void 0:n.docs)==null?void 0:t.source}}};var a,l,p;r.parameters={...r.parameters,docs:{...(a=r.parameters)==null?void 0:a.docs,source:{originalSource:`{
  args: {
    isOpen: true,
    onClose: () => console.log('Close'),
    initialView: 'register'
  }
}`,...(p=(l=r.parameters)==null?void 0:l.docs)==null?void 0:p.source}}};var c,m,d;s.parameters={...s.parameters,docs:{...(c=s.parameters)==null?void 0:c.docs,source:{originalSource:`{
  args: {
    isOpen: false,
    onClose: () => {},
    initialView: 'login'
  }
}`,...(d=(m=s.parameters)==null?void 0:m.docs)==null?void 0:d.source}}};const q=["Login","Register","Closed"];export{s as Closed,o as Login,r as Register,q as __namedExportsOrder,k as default};
