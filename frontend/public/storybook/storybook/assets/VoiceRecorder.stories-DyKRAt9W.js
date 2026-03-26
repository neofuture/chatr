import{j as t}from"./jsx-runtime-EKYJJIwR.js";import{V as v}from"./VoiceRecorder-DnaI9Q9l.js";import{T as h}from"./ToastContext-9whTi6PI.js";import{T as w}from"./ThemeContext-Bg5mVwRy.js";import"./index-BRD0Ja2P.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-DMNe2g_Q.js";import"./Button-CgqB4DRV.js";const E={title:"Messaging/VoiceRecorder",component:v,parameters:{layout:"centered",docs:{description:{component:"In-browser voice recorder with live waveform visualisation. Requires microphone permission. Opens a modal UI for recording."}}},decorators:[e=>t.jsx(w,{children:t.jsx(h,{children:t.jsx(e,{})})})],tags:["autodocs"]},o={args:{onRecordingComplete:(e,c)=>{console.log("Recording complete",e.size,"bytes,",c.length,"samples")},disabled:!1,compact:!1}},r={args:{onRecordingComplete:(e,c)=>{console.log("Recording complete",e.size,"bytes")},disabled:!1,compact:!0}},s={args:{onRecordingComplete:()=>{},disabled:!0,compact:!1}},a={args:{onRecordingComplete:()=>{},disabled:!0,compact:!0}};var n,m,i;o.parameters={...o.parameters,docs:{...(n=o.parameters)==null?void 0:n.docs,source:{originalSource:`{
  args: {
    onRecordingComplete: (blob, waveform) => {
      console.log('Recording complete', blob.size, 'bytes,', waveform.length, 'samples');
    },
    disabled: false,
    compact: false
  }
}`,...(i=(m=o.parameters)==null?void 0:m.docs)==null?void 0:i.source}}};var l,d,p;r.parameters={...r.parameters,docs:{...(l=r.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    onRecordingComplete: (blob, waveform) => {
      console.log('Recording complete', blob.size, 'bytes');
    },
    disabled: false,
    compact: true
  }
}`,...(p=(d=r.parameters)==null?void 0:d.docs)==null?void 0:p.source}}};var g,u,b;s.parameters={...s.parameters,docs:{...(g=s.parameters)==null?void 0:g.docs,source:{originalSource:`{
  args: {
    onRecordingComplete: () => {},
    disabled: true,
    compact: false
  }
}`,...(b=(u=s.parameters)==null?void 0:u.docs)==null?void 0:b.source}}};var f,R,C;a.parameters={...a.parameters,docs:{...(f=a.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    onRecordingComplete: () => {},
    disabled: true,
    compact: true
  }
}`,...(C=(R=a.parameters)==null?void 0:R.docs)==null?void 0:C.source}}};const I=["Default","Compact","Disabled","CompactDisabled"];export{r as Compact,a as CompactDisabled,o as Default,s as Disabled,I as __namedExportsOrder,E as default};
